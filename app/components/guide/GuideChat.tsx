'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { useSite, useText } from '../../site/SiteContext';
import { linesOf, phoneDigits } from '../../site/site';
import Icon from '../Icon';
import { scrollToY } from '../SmoothScroll';
import { whatsappLink } from '../whatsappTopic';
import { LIMITS, type Answer, type AskReply, type ChatTurn, type Mood, type Unavailable } from './chatTypes';
import { clip, pageContext, short } from './pageContext';
import type { Guide as GuideApi } from './engine';
import css from './guide.module.css';

// The robot's chat: a panel above him, dressed like his visor (midnight, with his two eyes in the corner reacting as
// he listens, thinks and answers). A question goes to app/api/guide/route.ts (Google's Gemini, answering from what
// the admin says about IN-TA and the page being read); the answer comes back with what he does: a move and a face,
// and sometimes a walk to something on the page (lit up while he looks at it), a tour of the page, or a trip to
// another one. Everything it says around the answers is in the admin (Page wording > Website guide, guide_chat_*).
// Where the robot can't run (less motion asked for, a small device), the chat still works on its own.

type GuideMsg = Answer & { id: number; from: 'guide'; question: string; done: string; spots: Map<string, Element> };
type Message =
  | { id: number; from: 'visitor'; text: string }
  | GuideMsg
  | { id: number; from: 'note'; reason: Unavailable; question: string };

type Activity =
  | { kind: 'idle' }
  | { kind: 'walking' | 'looking'; target: string }
  | { kind: 'going'; page: string };

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

let availability: Promise<{ available: boolean; reason?: Unavailable }> | null = null;
const checkAvailable = () => (availability ??= fetch('/api/guide', { cache: 'no-store' })
  .then((r) => r.json())
  .catch(() => { availability = null; return { available: false, reason: 'busy' as const }; }));

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A reply typing itself out (all at once when less motion is asked for) */
function Typed({ text, onDone }: { text: string; onDone?: () => void }) {
  const [n, setN] = useState(() => (typeof window !== 'undefined' && reducedMotion() ? text.length : 0));
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; });
  useEffect(() => {
    if (n >= text.length) { done.current?.(); return; }
    const t = window.setTimeout(() => setN((x) => Math.min(text.length, x + 2)), /[.!?,]/.test(text[n] ?? '') ? 70 : 16);
    return () => window.clearTimeout(t);
  }, [n, text]);
  return <>{text.slice(0, n)}{n < text.length && <span className={css.caret} />}</>;
}

/** His two eyes, as on his visor: they blink, look up while he thinks, and show how he feels */
function Visor({ look }: { look: 'idle' | 'thinking' | 'busy' | Mood }) {
  return <span className={css.visor} data-look={look} aria-hidden="true"><i /><i /></span>;
}

/** A ring round what he's showing, following it as the page moves; with no robot to say it, it carries the caption */
function Spotlight({ el, caption }: { el: Element; caption: string }) {
  const ring = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const follow = () => {
      const r = el.getBoundingClientRect();
      const s = ring.current;
      if (s) {
        s.style.transform = `translate(${r.left - 8}px, ${r.top - 6}px)`;
        s.style.width = `${r.width + 16}px`;
        s.style.height = `${r.height + 12}px`;
      }
      raf = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(raf);
  }, [el]);
  return (
    <div ref={ring} className={css.spot} aria-hidden="true">
      {caption && <span>{caption}</span>}
    </div>
  );
}

export default function GuideChat({ api, open, onClose, robot, onOut }: {
  api: RefObject<GuideApi | null>;
  open: boolean;
  onClose: () => void;
  /** the robot is on the screen (otherwise the chat works on its own) */
  robot: boolean;
  /** he's out on the page showing something (the robot hides while the chat is open, except then) */
  onOut: (out: boolean) => void;
}) {
  const t = useText();
  const site = useSite();
  const router = useRouter();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [thinking, setThinking] = useState(false);
  const [closed, setClosed] = useState<Unavailable | null>(null);
  const [activity, setActivity] = useState<Activity>({ kind: 'idle' });
  const [tourAt, setTourAt] = useState<{ n: number; total: number } | null>(null);
  const [peek, setPeek] = useState(false); // the chat opened again by hand while he's out showing something
  const [spot, setSpot] = useState<{ el: Element; caption: string } | null>(null);
  const [mood, setMood] = useState<Mood>('neutral');
  const [typedUpTo, setTypedUpTo] = useState(0); // the newest reply that has finished typing
  const [announce, setAnnounce] = useState('');
  const run = useRef(0); // each walk or tour gets a number: a newer one (or closing, or a new chat) stops the older

  const seq = useRef(0); // message numbers, in order
  const nextId = () => ++seq.current;

  // a new question, a new chat or closing it: any walk or tour stops, and he heads home
  const stopAll = () => {
    run.current += 1;
    setPeek(false);
    setSpot(null);
    setActivity({ kind: 'idle' });
    setTourAt(null);
    api.current?.release();
  };
  const stopRef = useRef(stopAll);
  useEffect(() => { stopRef.current = stopAll; });

  // opening: is the chat usable from here, and he turns to watch it; closing: back to his own business
  useEffect(() => {
    if (!open) return;
    const guide = api.current;
    guide?.chat(true, panel.current);
    // straight to typing with a keyboard; on a phone the keyboard waits for a tap, so it doesn't cover the chat
    if (window.matchMedia('(pointer: fine)').matches) input.current?.focus({ preventScroll: true });
    let gone = false;
    checkAvailable().then((a) => { if (!gone) setClosed(a.available ? null : a.reason ?? 'busy'); });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { gone = true; window.removeEventListener('keydown', onKey); stopRef.current(); guide?.chat(false, null); };
  }, [open, api, onClose]);

  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' }); }, [messages, thinking, typedUpTo]);

  // he's out on the page: the robot shows (Guide.tsx hides him while the chat simply sits open)
  const out = open && (activity.kind === 'walking' || activity.kind === 'looking' || !!tourAt);
  const onOutRef = useRef(onOut);
  useEffect(() => { onOutRef.current = onOut; });
  useEffect(() => { onOutRef.current(out); }, [out]);

  // a phone's keyboard covers the bottom of the screen: the chat fits in what's left, so the box stays in view
  useEffect(() => {
    const vv = window.visualViewport;
    if (!open || !vv) return;
    const fit = () => {
      const el = panel.current;
      if (!el) return;
      if (window.innerWidth >= 640) { el.style.removeProperty('top'); el.style.removeProperty('height'); return; }
      el.style.top = `${vv.offsetTop + 8}px`;
      el.style.height = `${vv.height - 16}px`;
    };
    fit();
    vv.addEventListener('resize', fit);
    vv.addEventListener('scroll', fit);
    return () => { vv.removeEventListener('resize', fit); vv.removeEventListener('scroll', fit); };
  }, [open]);

  const wa = (q: string) => whatsappLink(phoneDigits(site.phone), q);
  const mark = (id: number, done: string) => setMessages((m) => m.map((x) => (x.id === id && x.from === 'guide' ? { ...x, done } : x)));

  /** the element an answer points at: a spot from this question, or a section (its heading) */
  const resolve = (msg: GuideMsg, id: string) => {
    const el = msg.spots.get(id) ?? document.getElementById(id);
    if (!el || !el.isConnected) return null;
    return el.matches('section') ? el.querySelector('h1, h2, h3') ?? el : el;
  };

  /** bring it into view, light it up, and (with the robot) walk over to it; resolves once he's looking at it */
  const walkTo = async (me: number, el: Element, label: string, caption: string, hold: boolean) => {
    const r = el.getBoundingClientRect();
    const inView = r.top > 110 && r.bottom < window.innerHeight * 0.62;
    if (!inView) {
      scrollToY(window.scrollY + r.top - window.innerHeight * 0.3);
      await wait(reducedMotion() ? 150 : 1900);
    }
    if (run.current !== me) return false;
    setPeek(false);
    setSpot({ el, caption: robot ? '' : caption });
    const going = api.current?.show(el, { caption, hold }) ?? false;
    if (!going) { setActivity({ kind: 'looking', target: label }); return true; }
    setActivity({ kind: 'walking', target: label });
    for (let i = 0; i < 70 && run.current === me && api.current?.status() === 'walking'; i++) await wait(150);
    if (run.current !== me) return false;
    setActivity({ kind: 'looking', target: label });
    return true;
  };

  const show = async (msg: GuideMsg) => {
    const el = resolve(msg, msg.target);
    if (!el) return;
    const me = ++run.current;
    if (!(await walkTo(me, el, msg.label, msg.caption, false))) return;
    mark(msg.id, t('guide_chat_did_show', { target: msg.label }));
    await wait(robot ? 3400 + msg.caption.length * 40 : 3800);
    if (run.current !== me) return;
    setSpot(null);
    setActivity({ kind: 'idle' });
  };

  const tour = async (msg: GuideMsg) => {
    const me = ++run.current;
    const stops = msg.steps.map((s) => ({ ...s, el: resolve(msg, s.target) })).filter((s): s is typeof s & { el: Element } => !!s.el);
    for (let i = 0; i < stops.length; i++) {
      setTourAt({ n: i + 1, total: stops.length });
      const s = stops[i];
      const label = clip(s.el.textContent ?? '') || s.target;
      if (!(await walkTo(me, s.el, label, s.say, i < stops.length - 1))) return;
      await wait(1600 + s.say.length * 55);
      if (run.current !== me) return;
    }
    mark(msg.id, t('guide_chat_did_tour', { total: stops.length }));
    setSpot(null);
    setActivity({ kind: 'idle' });
    setTourAt(null);
    api.current?.release();
  };

  const go = async (msg: GuideMsg) => {
    const me = ++run.current;
    setActivity({ kind: 'going', page: msg.label });
    api.current?.gesture('jump', 'happy');
    await wait(900);
    if (run.current !== me) return;
    router.push(msg.target);
    mark(msg.id, t('guide_chat_did_go', { page: msg.label }));
    await wait(1200);
    if (run.current === me) setActivity({ kind: 'idle' });
  };

  /** the answer has typed out: now he acts on it */
  const act = (msg: GuideMsg) => {
    if (msg.action === 'show') show(msg);
    else if (msg.action === 'tour') tour(msg);
    else if (msg.action === 'go') go(msg);
  };

  const ask = async (raw: string) => {
    const q = raw.replace(/\s+/g, ' ').trim().slice(0, LIMITS.question);
    if (!q || thinking) return;
    stopAll();
    setQuestion('');
    const history: ChatTurn[] = messages.flatMap((m): ChatTurn[] => (m.from === 'visitor' ? [{ role: 'visitor', text: m.text }] : m.from === 'guide' ? [{ role: 'guide', text: m.reply }] : []))
      .slice(-LIMITS.turns);
    setMessages((m) => [...m, { id: nextId(), from: 'visitor', text: q }]);
    setThinking(true);
    api.current?.think(true);
    const { page, spots } = pageContext();
    let reply: AskReply;
    try {
      const res = await fetch('/api/guide', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: q, history, page }) });
      reply = await res.json();
    } catch {
      reply = { ok: false, reason: 'busy' };
    }
    setThinking(false);
    api.current?.think(false);
    const id = nextId();
    if (reply.ok) {
      setMessages((m) => [...m, { ...reply, id, from: 'guide', question: q, done: '', spots }]);
      setMood(reply.mood);
      setAnnounce(reply.reply);
      api.current?.gesture(reply.gesture, reply.mood);
    } else {
      if (reply.reason === 'region') setClosed('region');
      setMessages((m) => [...m, { id, from: 'note', reason: reply.reason, question: q }]);
      setMood('sad');
      setAnnounce(reasonText(reply.reason));
      api.current?.gesture('shake_head', 'sad');
    }
  };

  const newChat = () => {
    stopAll();
    setMessages([]);
    setMood('neutral');
    setTypedUpTo(0);
    input.current?.focus({ preventScroll: true });
  };

  const reasonText = (r: Unavailable) => t(r === 'region' ? 'guide_chat_region' : r === 'limit' ? 'guide_chat_limit' : 'guide_chat_busy');

  if (!open) return null;

  const status = closed ? t('guide_chat_status_offline')
    : thinking ? t('guide_chat_thinking')
    : activity.kind === 'walking' ? t('guide_chat_status_walking', { target: short(activity.target) })
    : activity.kind === 'looking' ? t('guide_chat_status_looking', { target: short(activity.target) })
    : activity.kind === 'going' ? t('guide_chat_status_going', { page: short(activity.page) })
    : tourAt ? t('guide_chat_status_tour', { n: tourAt.n, total: tourAt.total })
    : t('guide_chat_status_ready');
  const busy = activity.kind === 'walking' || activity.kind === 'looking' || !!tourAt;
  // while he's out showing something, the chat folds down to its header so the page (and he) can be seen
  const folded = busy && !peek;
  const look = thinking ? 'thinking' : activity.kind !== 'idle' || tourAt ? 'busy' : mood;
  const chips = linesOf(t('guide_chat_suggestions'));
  const lastGuide = [...messages].reverse().find((m): m is GuideMsg => m.from === 'guide');

  return (
    <>
      {spot && <Spotlight el={spot.el} caption={spot.caption} />}
      <div ref={panel} role="dialog" aria-modal="false" aria-labelledby={titleId} className={`guide-chat ${css.chat} ${folded ? css.chatFolded : ''}`}>
        <div className={css.chatHead}>
          <Visor look={look} />
          <div className={css.chatTitle}>
            <p id={titleId}>{t('guide_chat_title')}</p>
            <p className={css.status} data-state={closed ? 'off' : thinking || activity.kind !== 'idle' || tourAt ? 'busy' : 'on'}>
              <i aria-hidden="true" /><span>{status}</span>
            </p>
          </div>
          {busy && (
            <button type="button" onClick={() => setPeek(!peek)} className={css.headBtn} aria-expanded={!folded} aria-label={folded ? 'Show the chat' : 'Fold the chat away'}>
              <Icon name={folded ? 'open_in_full' : 'south'} className="text-[17px]" />
            </button>
          )}
          {messages.length > 0 && (
            <button type="button" onClick={newChat} className={css.headBtn} aria-label={t('guide_chat_new')} title={t('guide_chat_new')}>
              <Icon name="restart_alt" className="text-[18px]" />
            </button>
          )}
          <button type="button" onClick={onClose} className={css.headBtn} aria-label="Close the chat">
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        {tourAt && (
          <div className={css.tourBar}>
            <span className={css.tourDots} aria-hidden="true">
              {Array.from({ length: tourAt.total }, (_, i) => <i key={i} data-on={i < tourAt.n ? '' : undefined} />)}
            </span>
            <span className={css.tourCount}>{t('guide_chat_status_tour', { n: tourAt.n, total: tourAt.total })}</span>
            <button type="button" onClick={stopAll}><Icon name="stop" className="text-[15px]" />{t('guide_chat_stop')}</button>
          </div>
        )}

        <div ref={list} className={css.chatList} data-lenis-prevent>
          <p className={css.fromGuide}>{closed ? reasonText(closed) : t('guide_chat_hello')}</p>
          {closed && <a className={css.cta} href={wa('')} target="_blank" rel="noopener noreferrer">{t('guide_chat_whatsapp')}<Icon name="north_east" className="text-[14px]" /></a>}

          {!closed && !messages.length && chips.length > 0 && (
            <div className={css.starters}>
              <p>{t('guide_chat_try')}</p>
              {chips.map((c) => (
                <button key={c} type="button" onClick={() => ask(c)}><span>{c}</span><Icon name="east" className="text-[15px]" /></button>
              ))}
            </div>
          )}

          {messages.map((m) => (m.from === 'visitor' ? (
            <p key={m.id} className={css.fromVisitor}>{m.text}</p>
          ) : m.from === 'guide' ? (
            <div key={m.id} className={css.guideTurn}>
              <p className={css.fromGuide}>
                {m.id > typedUpTo ? <Typed text={m.reply} onDone={() => { setTypedUpTo(m.id); act(m); }} /> : m.reply}
              </p>
              {m.id <= typedUpTo && (
                <>
                  {m.done && <p className={css.receipt}><Icon name="check" className="text-[13px]" />{m.done}</p>}
                  <div className={css.ctas}>
                    {m.action === 'link' && <Link className={css.cta} href={m.target}>{t('guide_chat_open', { page: m.label })}<Icon name="north_east" className="text-[14px]" /></Link>}
                    {m.action === 'go' && !m.done && <Link className={css.cta} href={m.target}>{t('guide_chat_open', { page: m.label })}<Icon name="north_east" className="text-[14px]" /></Link>}
                    {m.action === 'whatsapp' && <a className={`${css.cta} ${css.ctaMain}`} href={wa(m.question)} target="_blank" rel="noopener noreferrer">{t('guide_chat_whatsapp')}<Icon name="north_east" className="text-[14px]" /></a>}
                    {(m.action === 'show' || m.action === 'tour') && m.done && (
                      <button type="button" className={css.cta} onClick={() => act(m)}>{t('guide_chat_again')}</button>
                    )}
                  </div>
                  {m === lastGuide && !thinking && m.followUps.length > 0 && (
                    <div className={css.followUps}>
                      {m.followUps.map((f) => <button key={f} type="button" onClick={() => ask(f)}>{f}</button>)}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div key={m.id} className={css.guideTurn}>
              <p className={css.fromGuide}>{reasonText(m.reason)}</p>
              <a className={`${css.cta} ${css.ctaMain}`} href={wa(m.question)} target="_blank" rel="noopener noreferrer">{t('guide_chat_whatsapp')}<Icon name="north_east" className="text-[14px]" /></a>
            </div>
          )))}
          {thinking && <p className={`${css.fromGuide} ${css.dots}`} aria-label={t('guide_chat_thinking')}><i /><i /><i /></p>}
        </div>
        <p className="sr-only" aria-live="polite">{announce}</p>

        {!closed && (
          <>
            <form className={css.chatForm} onSubmit={(e) => { e.preventDefault(); ask(question); }}>
              <input ref={input} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={LIMITS.question}
                placeholder={t('guide_chat_placeholder')} aria-label={t('guide_chat_placeholder')} enterKeyHint="send" autoComplete="off" />
              <button type="submit" disabled={thinking || !question.trim()} aria-label={t('guide_chat_send')}>
                <Icon name="arrow_upward" className="text-[18px]" />
              </button>
            </form>
            <p className={css.chatNote}>
              {t(messages.length ? 'guide_chat_note_short' : 'guide_chat_note')} <Link href="/privacy">{t('guide_chat_privacy')}</Link>
            </p>
          </>
        )}
      </div>
    </>
  );
}

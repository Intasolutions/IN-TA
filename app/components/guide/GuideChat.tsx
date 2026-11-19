'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useId, useRef, useState, type RefObject } from 'react';
import { useSite, useText } from '../../site/SiteContext';
import { linesOf, whatsappDigits } from '../../site/site';
import Icon from '../Icon';
import { scrollToY } from '../SmoothScroll';
import { whatsappLink } from '../whatsappTopic';
import { LIMITS, NO_LEAD, withName, type Answer, type AskMode, type AskReply, type ChatTurn, type LeadInfo, type Mood, type Unavailable } from './chatTypes';
import { journeyText } from './journey';
import { clip, pageContext, short } from './pageContext';
import type { Guide as GuideApi } from './engine';
import css from './guide.module.css';

// The robot's chat. He starts by asking their name and how to reach them (they answer in the chat), then he talks:
// he greets them by name, guides them round the site (walks to things, tours pages, takes them to other pages),
// learns what they need and recommends the right service. Questions go to app/api/guide/route.ts (Google's Gemini);
// the visitor's name, phone and email never do: the AI writes {name} and it's filled in here, and a number or email
// typed into the chat is kept back the same way.
//
// The whole conversation is saved for the team (Django: Contact > Robot chats), with their details, what he learned
// of their needs and the pages they looked at. Everything said around the answers is in the admin (guide_chat_*).
// Where the robot can't run (less motion asked for, a small device), the chat still works on its own.

export type GuideMsg = Answer & { id: number; from: 'guide'; question: string; done: string; spots: Map<string, Element> };
type Message =
  | { id: number; from: 'visitor'; text: string; sent: string }
  | GuideMsg
  | { id: number; from: 'note'; reason: Unavailable; question: string };

/** How the chat was opened: with a question to answer, or with his opening line already written (the teaser) */
export type ChatStart = { id: number; question?: string; seed?: { answer: Answer; spots: Map<string, Element> } } | null;

type Activity =
  | { kind: 'idle' }
  | { kind: 'walking' | 'looking'; target: string }
  | { kind: 'going'; page: string };

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// ---- the visitor and their conversation, for this visit: who they are, and where it's saved ----
type Details = { name: string; phone: string; email: string };
type Me = Details & { id?: number; token?: string };
const ME = 'inta-guide-me';
const readMe = (): Me | null => { try { return JSON.parse(sessionStorage.getItem(ME) ?? 'null'); } catch { return null; } };
const keepMe = (me: Me) => { try { sessionStorage.setItem(ME, JSON.stringify(me)); } catch { /* private mode */ } };
/** Their first name, once they've given it (the teaser uses it too) */
export const savedName = () => readMe()?.name.split(/\s+/)[0] ?? '';

// Contact details typed into the chat: kept out of what goes to the AI, and saved with the conversation
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PHONE = /\+?\d[\d\s().-]{5,}\d/g;
const digits = (s: string) => s.replace(/\D/g, '').length;
function keepBack(text: string) {
  const emails = text.match(EMAIL) ?? [];
  let phone = '';
  const sent = text.replace(EMAIL, '[email shared]').replace(PHONE, (m) => {
    if (digits(m) < 7 || digits(m) > 15) return m;
    phone ||= m.trim();
    return '[phone number shared]';
  });
  return { sent, email: emails[0] ?? '', phone };
}

// ---- getting to know them: he asks their name and how to reach them, and they answer in the chat ----
// Their answers stay in the browser and go only to our database with the conversation, never to the AI, so these are
// read here: "I'm Anu", "hi, this is anu k", "Anu, we need an ERP" (the rest is a question he answers once he knows them).
const HELLO = /^(?:(?:hi|hello|hey|hai|hlo|good (?:morning|afternoon|evening))\b[\s,!.]*)+/i;
const INTRO = /^(?:i am|i'm|im|my name is|my name's|name is|name's|this is|it's|its|call me|myself|me)\s+/i;
const QUESTION = /^(?:what|how|can|could|do|does|is|are|who|where|when|why|which|would|will|i need|i want|we need|we want|need|want|show|tell|give|price|cost|looking)\b/i;
const TITLE = /\b(dr|mr|mrs|ms|prof)\.\s*/gi; // "Dr. Asha": the dot isn't the end of a sentence
const SIDE = /\s+(?:here|this side|speaking)$/i; // "Sneha here", "Rahul this side"
const NAME_WORD = /^[\p{L}][\p{L}'’.-]{0,24}$/u;

function readName(text: string): { name: string; question: string } {
  const greeted = text.replace(HELLO, '').trim();
  const s = greeted.replace(INTRO, '').replace(TITLE, '$1 ').trim();
  const introduced = s.replace(TITLE, '') !== greeted.replace(TITLE, '');
  if (!s) return { name: '', question: '' };
  // the first part is the name; whatever follows it ("…, we need an ERP") is a question for later
  const split = s.match(/^(.*?)(?:\s*(?:[,;!?]|\.(?:\s|$)|\s-\s|\s+(?:and|&)\s+)\s*)([\s\S]*)$/);
  const head = (split ? split[1] : s).replace(SIDE, '').trim();
  const tail = (split ? split[2] : '').replace(/^(?:and|&)\s+/i, '').trim();
  const words = head.split(/\s+/).filter(Boolean);
  const asking = !introduced && (QUESTION.test(head) || (!tail && words.length > 1 && /\?\s*$/.test(s)));
  if (asking || !words.length || words.length > 4 || !words.every((w) => NAME_WORD.test(w))) {
    return { name: '', question: introduced ? '' : text.trim() };
  }
  const name = words.map((w) => (w === w.toLowerCase() ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
  return { name, question: tail.split(/\s+/).length >= 3 ? tail : '' };
}

type IntakeLine = { id: number; from: 'guide' | 'visitor'; text: string; note?: boolean };
const CONTINUE = 'inta-guide-continue'; // he's taking them to this page, and will carry on guiding there

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

let availability: Promise<{ available: boolean; reason?: Unavailable }> | null = null;
export const checkAvailable = () => (availability ??= fetch('/api/guide', { cache: 'no-store' })
  .then((r) => r.json())
  .catch(() => { availability = null; return { available: false, reason: 'busy' as const }; }));

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A reply typing itself out, quickly (all at once when less motion is asked for) */
function Typed({ text, onDone }: { text: string; onDone?: () => void }) {
  const [n, setN] = useState(() => (typeof window !== 'undefined' && reducedMotion() ? text.length : 0));
  const finished = useEffectEvent(() => onDone?.());
  useEffect(() => {
    if (n >= text.length) { finished(); return; }
    const t = window.setTimeout(() => setN((x) => Math.min(text.length, x + 3)), /[.!?]/.test(text[n] ?? '') ? 45 : 12);
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

type Fetched = { reply: AskReply; spots: Map<string, Element> };

export default function GuideChat({ api, open, onClose, robot, onOut, start }: {
  api: RefObject<GuideApi | null>;
  open: boolean;
  onClose: () => void;
  /** the robot is on the screen (otherwise the chat works on its own) */
  robot: boolean;
  /** he's out on the page showing something (the robot hides while the chat is open, except then) */
  onOut: (out: boolean) => void;
  /** how it was opened (a question, or his opening line from the teaser) */
  start: ChatStart;
}) {
  const t = useText();
  const site = useSite();
  const router = useRouter();
  const pathname = usePathname();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [me, setMe] = useState<Me | null>(readMe);
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
  const [lead, setLead] = useState<LeadInfo>(NO_LEAD); // what he has understood of their needs
  const run = useRef(0); // each walk or tour gets a number: a newer one (or closing, or a new chat) stops the older
  const seq = useRef(0); // message numbers, in order
  const nextId = () => ++seq.current;
  const name = me?.name.split(/\s+/)[0] ?? '';
  const reasonText = (r: Unavailable) => t(r === 'region' ? 'guide_chat_region' : r === 'limit' ? 'guide_chat_limit' : 'guide_chat_busy');

  // getting to know them (before `me`): what he asked and they answered, and what he has so far
  const [intake, setIntake] = useState<IntakeLine[]>([]);
  const [intakeTyped, setIntakeTyped] = useState(0);
  const [step, setStep] = useState<'name' | 'contact'>('name');
  const draft = useRef<Details>({ name: '', phone: '', email: '' });

  // his opening line, asked for while he gets to know them, and a question waiting for it
  const opener = useRef<Promise<Fetched | null> | null>(null);
  const waiting = useRef<string>('');
  const started = useRef(false);

  // ---- saving the conversation for the team (Django: Contact > Robot chats) ----
  const unsaved = useRef<{ role: 'visitor' | 'robot'; text: string; at: string; action?: string }[]>([]);
  const saving = useRef(false);
  const saveTimer = useRef(0);
  const meRef = useRef(me);
  const leadRef = useRef(lead);
  useEffect(() => { meRef.current = me; leadRef.current = lead; });
  const save = async (extra: { phone?: string; email?: string } = {}) => {
    const who = meRef.current;
    if (!who || saving.current) return;
    saving.current = true;
    try {
      let { id, token } = who;
      if (!id || !token) {
        // the conversation starts on the server (retried with the next message if it can't be reached now)
        const res = await fetch(`${API}/api/contact/chats/`, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: who.name, phone: who.phone, email: who.email, pages: journeyText().slice(0, 4000), source: window.location.pathname }),
        });
        if (!res.ok) throw new Error(`start ${res.status}`);
        ({ id, token } = await res.json());
        const saved = { ...who, id, token };
        keepMe(saved);
        meRef.current = saved;
        setMe(saved);
      }
      const batch = unsaved.current.splice(0);
      const res = await fetch(`${API}/api/contact/chats/${id}/append/`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, messages: batch, lead: leadRef.current, pages: journeyText().slice(0, 4000), ...extra }),
      });
      if (!res.ok) { unsaved.current.unshift(...batch); throw new Error(`append ${res.status}`); }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') console.warn('Robot chat not saved yet:', e);
    } finally {
      saving.current = false;
    }
  };
  const record = (role: 'visitor' | 'robot', text: string, action?: string) => {
    unsaved.current.push({ role, text, at: new Date().toISOString(), ...(action ? { action } : {}) });
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => save(), 600);
  };

  // a new question, a new chat or closing it: any walk or tour stops, and he heads home
  const stopAll = () => {
    run.current += 1;
    setPeek(false);
    setSpot(null);
    setActivity({ kind: 'idle' });
    setTourAt(null);
    api.current?.release();
  };

  /** ask Gemini: the visitor's words (already kept back), what he's said so far, the page and the visit */
  const fetchAnswer = async (sent: string, mode: AskMode, history: ChatTurn[]): Promise<Fetched> => {
    const { page, spots } = pageContext();
    try {
      const res = await fetch('/api/guide', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: sent, history, page, journey: journeyText(), mode, named: true }),
      });
      return { reply: await res.json(), spots };
    } catch {
      return { reply: { ok: false, reason: 'busy' }, spots };
    }
  };

  /** an answer arrives: into the conversation, his move and face, what he learned, and saved */
  const take = ({ reply, spots }: Fetched, q: string, mode: AskMode) => {
    const id = nextId();
    const name = meRef.current?.name.split(/\s+/)[0] ?? ''; // (just given, when it's his first line)
    if (reply.ok) {
      setLead((was) => ({
        service: reply.lead.service || was.service, need: reply.lead.need || was.need, business: reply.lead.business || was.business,
        timeline: reply.lead.timeline || was.timeline, budget: reply.lead.budget || was.budget,
      }));
      setMessages((m) => [...m, { ...reply, id, from: 'guide', question: q, done: '', spots }]);
      setMood(reply.mood);
      setAnnounce(withName(reply.reply, name));
      api.current?.gesture(reply.gesture, reply.mood);
      record('robot', withName(reply.reply, name), reply.action === 'none' ? undefined : `${reply.action}${reply.label ? `: ${reply.label}` : ''}`);
    } else if (mode === 'ask') {
      if (reply.reason === 'region') setClosed('region');
      setMessages((m) => [...m, { id, from: 'note', reason: reply.reason, question: q }]);
      setMood('sad');
      setAnnounce(reasonText(reply.reason));
      api.current?.gesture('shake_head', 'sad');
    }
    // (his opening line or the tour on arrival didn't come: the standard hello does)
  };

  const historyOf = (list: Message[]): ChatTurn[] => list.flatMap((m): ChatTurn[] => (
    m.from === 'visitor' ? [{ role: 'visitor', text: m.sent }] : m.from === 'guide' ? [{ role: 'guide', text: m.reply }] : []
  )).slice(-LIMITS.turns);

  const ask = async (raw: string, mode: AskMode = 'ask') => {
    const q = raw.replace(/\s+/g, ' ').trim().slice(0, LIMITS.question);
    if ((mode === 'ask' && !q) || thinking) return;
    stopAll();
    let sent = q;
    if (mode === 'ask') {
      setQuestion('');
      const kept = keepBack(q);
      sent = kept.sent;
      setMessages((m) => [...m, { id: nextId(), from: 'visitor', text: q, sent }]);
      record('visitor', q);
      if (kept.phone || kept.email) save({ phone: kept.phone, email: kept.email });
    }
    const history = historyOf(messages);
    setThinking(true);
    api.current?.think(true);
    const got = await fetchAnswer(sent, mode, history);
    setThinking(false);
    api.current?.think(false);
    take(got, q, mode);
  };

  /** one line of the getting-to-know-you part, his or theirs */
  const intakeSays = (from: IntakeLine['from'], text: string, note = false) => {
    setIntake((l) => [...l, { id: nextId(), from, text, note }]);
    if (from === 'guide') setAnnounce(text);
  };

  /** their answer to his question (their name, or how to reach them); he asks again for whatever is still missing */
  const answer = async (raw: string) => {
    const text = raw.replace(/\s+/g, ' ').trim().slice(0, LIMITS.question);
    if (!text || thinking) return;
    setQuestion('');
    intakeSays('visitor', text);
    const d = draft.current;
    const kept = keepBack(text);
    if (kept.email) d.email = kept.email;
    if (kept.phone) d.phone = kept.phone;
    let asked = false;
    if (!d.name) {
      // (their number or email taken out first, so it's never read as part of a name)
      const words = text.replace(EMAIL, ' ').replace(PHONE, (m) => (digits(m) >= 7 && digits(m) <= 15 ? ' ' : m)).replace(/\s+/g, ' ').trim();
      const got = readName(words);
      if (got.name) d.name = got.name;
      if (got.question) { asked = true; waiting.current ||= got.question; }
    }
    const first = d.name.split(/\s+/)[0] ?? '';
    // a moment to "think", as he does with every answer
    setThinking(true);
    await wait(reducedMotion() ? 150 : 650);
    setThinking(false);
    if (!d.name) {
      setMood(asked ? 'happy' : 'surprised');
      intakeSays('guide', t(asked ? 'guide_chat_question_first' : 'guide_chat_need_name'));
      return;
    }
    if (!d.phone && !d.email) {
      const again = step === 'contact';
      setStep('contact');
      setMood(again ? 'surprised' : 'happy');
      if (!again) api.current?.gesture('wave', 'happy');
      intakeSays('guide', t(again ? 'guide_chat_need_contact' : 'guide_chat_ask_contact', { name: first }), true);
      return;
    }
    api.current?.gesture('thumbs_up', 'happy');
    intakeSays('guide', t('guide_chat_thanks', { name: first }));
    begin({ ...d });
  };

  /** he knows who they are: the conversation starts on the server, and he greets them (the line's ready) */
  const begin = async (details: Details) => {
    const who: Me = { ...details };
    keepMe(who);
    meRef.current = who;
    setMe(who);
    save();
    const q = waiting.current;
    waiting.current = '';
    if (q) { ask(q); return; }
    setThinking(true);
    api.current?.think(true);
    const got = (await opener.current) ?? (await fetchAnswer('', 'opener', []));
    opener.current = null;
    setThinking(false);
    api.current?.think(false);
    take(got, '', 'opener');
  };

  // opening: is the chat usable from here, and he turns to watch it; closing: back to his own business
  const greet = useEffectEvent((available: boolean) => {
    if (!available || started.current) return;
    started.current = true;
    if (!me) opener.current ??= fetchAnswer('', 'opener', []); // ready by the time the form is filled in
    else if (!messages.length) ask('', 'opener');
  });
  const leave = useEffectEvent(() => stopAll());
  useEffect(() => {
    if (!open) return;
    const guide = api.current;
    guide?.chat(true, panel.current);
    let gone = false;
    checkAvailable().then((a) => {
      if (gone) return;
      setClosed(a.available ? null : a.reason ?? 'busy');
      greet(a.available);
    });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { gone = true; window.removeEventListener('keydown', onKey); leave(); guide?.chat(false, null); };
  }, [open, api, onClose]);

  // straight to typing with a keyboard (on a phone the keyboard waits for a tap, so it doesn't cover the chat)
  useEffect(() => {
    if (open && window.matchMedia('(pointer: fine)').matches) input.current?.focus({ preventScroll: true });
  }, [open]);

  // opened with something: his line from the teaser, or a question (the Contact page, a link elsewhere)
  const opened = useEffectEvent((how: NonNullable<ChatStart>) => {
    started.current = true;
    if (how.seed) {
      const seed: Fetched = { reply: how.seed.answer, spots: how.seed.spots };
      if (me) take(seed, '', 'opener'); else opener.current = Promise.resolve(seed);
    }
    if (how.question) { if (me) ask(how.question); else waiting.current = how.question; }
  });
  useEffect(() => {
    if (!start) return;
    const timer = window.setTimeout(() => opened(start), 0); // after the chat has rendered open
    return () => window.clearTimeout(timer);
  }, [start]);

  // a new page he took them to: he carries on guiding them there
  const arrivedThere = useEffectEvent(() => ask('', 'continue'));
  useEffect(() => {
    let to = '';
    try { to = sessionStorage.getItem(CONTINUE) ?? ''; } catch { /* private mode */ }
    if (!open || !to || to.toLowerCase() !== pathname.toLowerCase()) return;
    try { sessionStorage.removeItem(CONTINUE); } catch { /* private mode */ }
    const timer = window.setTimeout(() => arrivedThere(), 1500);
    return () => window.clearTimeout(timer);
  }, [pathname, open]);

  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' }); }, [messages, thinking, typedUpTo, me, intake, intakeTyped]);

  // he's out on the page: the robot shows (Guide.tsx hides him while the chat simply sits open)
  const out = open && (activity.kind === 'walking' || activity.kind === 'looking' || !!tourAt);
  const tellOut = useEffectEvent((o: boolean) => onOut(o));
  useEffect(() => { tellOut(out); }, [out]);

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

  const wa = (q: string) => whatsappLink(whatsappDigits(site), q);
  const mark = (id: number, done: string) => setMessages((m) => m.map((x) => (x.id === id && x.from === 'guide' ? { ...x, done } : x)));

  /** the element an answer points at: a spot from this question, or a section (its heading) */
  const resolve = (msg: GuideMsg, id: string) => {
    const el = msg.spots.get(id) ?? document.getElementById(id);
    if (!el || !el.isConnected) return null;
    return el.matches('section') ? el.querySelector('h1, h2, h3') ?? el : el;
  };

  /** bring it into view, light it up, and (with the robot) walk over to it; resolves once he's looking at it */
  const walkTo = async (mine: number, el: Element, label: string, caption: string, hold: boolean) => {
    const r = el.getBoundingClientRect();
    const inView = r.top > 110 && r.bottom < window.innerHeight * 0.62;
    if (!inView) {
      scrollToY(window.scrollY + r.top - window.innerHeight * 0.3);
      await wait(reducedMotion() ? 150 : 1900);
    }
    if (run.current !== mine) return false;
    setPeek(false);
    setSpot({ el, caption: robot ? '' : caption });
    const going = api.current?.show(el, { caption: withName(caption, name), hold }) ?? false;
    if (!going) { setActivity({ kind: 'looking', target: label }); return true; }
    setActivity({ kind: 'walking', target: label });
    for (let i = 0; i < 70 && run.current === mine && api.current?.status() === 'walking'; i++) await wait(150);
    if (run.current !== mine) return false;
    setActivity({ kind: 'looking', target: label });
    return true;
  };

  const show = async (msg: GuideMsg) => {
    const el = resolve(msg, msg.target);
    if (!el) return;
    const mine = ++run.current;
    if (!(await walkTo(mine, el, msg.label, msg.caption, false))) return;
    mark(msg.id, t('guide_chat_did_show', { target: msg.label }));
    await wait(robot ? 3400 + msg.caption.length * 40 : 3800);
    if (run.current !== mine) return;
    setSpot(null);
    setActivity({ kind: 'idle' });
  };

  const tour = async (msg: GuideMsg) => {
    const mine = ++run.current;
    const stops = msg.steps.map((s) => ({ ...s, el: resolve(msg, s.target) })).filter((s): s is typeof s & { el: Element } => !!s.el);
    for (let i = 0; i < stops.length; i++) {
      setTourAt({ n: i + 1, total: stops.length });
      const s = stops[i];
      const label = clip(s.el.textContent ?? '') || s.target;
      if (!(await walkTo(mine, s.el, label, s.say, i < stops.length - 1))) return;
      await wait(1500 + s.say.length * 50);
      if (run.current !== mine) return;
    }
    mark(msg.id, t('guide_chat_did_tour', { total: stops.length }));
    setSpot(null);
    setActivity({ kind: 'idle' });
    setTourAt(null);
    api.current?.release();
  };

  const go = async (msg: GuideMsg) => {
    const mine = ++run.current;
    setActivity({ kind: 'going', page: msg.label });
    api.current?.gesture('jump', 'happy');
    await wait(700);
    if (run.current !== mine) return;
    try { sessionStorage.setItem(CONTINUE, msg.target); } catch { /* private mode */ }
    router.push(msg.target);
    mark(msg.id, t('guide_chat_did_go', { page: msg.label }));
    await wait(1200);
    if (run.current === mine) setActivity({ kind: 'idle' });
  };

  /** the answer has typed out: now he acts on it */
  const act = (msg: GuideMsg) => {
    if (msg.action === 'show') show(msg);
    else if (msg.action === 'tour') tour(msg);
    else if (msg.action === 'go') go(msg);
  };

  const newChat = () => {
    stopAll();
    setMessages([]);
    setMood('neutral');
    setTypedUpTo(0);
    setLead(NO_LEAD);
    ask('', 'opener');
  };

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
  // the empty box says what he's waiting for
  const box = me ? t('guide_chat_placeholder') : step === 'name' ? t('guide_chat_name_box') : t('guide_chat_contact_box');
  const lastGuide = [...messages].reverse().find((m): m is GuideMsg => m.from === 'guide');

  return (
    <>
      {spot && <Spotlight el={spot.el} caption={withName(spot.caption, name)} />}
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
          {closed ? (
            <>
              <p className={css.fromGuide}>{reasonText(closed)}</p>
              <a className={`${css.cta} ${css.ctaMain}`} href={wa('')} target="_blank" rel="noopener noreferrer">{t('guide_chat_whatsapp')}<Icon name="north_east" className="text-[14px]" /></a>
            </>
          ) : (
            <>
              {/* first he gets to know them, in the chat: their name, then how to reach them */}
              {(!me || intake.length > 0) && <p className={css.fromGuide}>{t('guide_chat_start_intro')}</p>}
              {intake.map((l) => (l.from === 'visitor' ? (
                <p key={l.id} className={css.fromVisitor}>{l.text}</p>
              ) : (
                <div key={l.id} className={css.guideTurn}>
                  <p className={css.fromGuide}>
                    {l.id > intakeTyped ? <Typed text={l.text} onDone={() => setIntakeTyped(l.id)} /> : l.text}
                  </p>
                  {l.note && l.id <= intakeTyped && <p className={css.intakeNote}><Icon name="lock" className="text-[12px]" />{t('guide_chat_contact_note')}</p>}
                </div>
              )))}
            </>
          )}
          {!closed && me && (
            <>
              {!messages.length && !thinking && <p className={css.fromGuide}>{withName(t('guide_chat_hello'), name)}</p>}
              {!messages.some((m) => m.from === 'visitor') && !thinking && chips.length > 0 && (
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
                    {m.id > typedUpTo ? <Typed text={withName(m.reply, name)} onDone={() => { setTypedUpTo(m.id); act(m); }} /> : withName(m.reply, name)}
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
            </>
          )}
          {thinking && <p className={`${css.fromGuide} ${css.dots}`} aria-label={t('guide_chat_thinking')}><i /><i /><i /></p>}
        </div>
        <p className="sr-only" aria-live="polite">{announce}</p>

        {!closed && (
          <form className={css.chatForm} onSubmit={(e) => { e.preventDefault(); if (me) ask(question); else answer(question); }}>
            <input ref={input} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={LIMITS.question}
              placeholder={box} aria-label={box} enterKeyHint="send"
              autoComplete={me ? 'off' : step === 'name' ? 'name' : 'off'} autoCapitalize={!me && step === 'name' ? 'words' : 'sentences'} />
            <button type="submit" disabled={thinking || !question.trim()} aria-label={t('guide_chat_send')}>
              <Icon name="arrow_upward" className="text-[18px]" />
            </button>
          </form>
        )}
        {!closed && (
          <p className={css.chatNote}>
            <Link href="/privacy">{t('guide_chat_privacy')}</Link>
          </p>
        )}
      </div>
    </>
  );
}

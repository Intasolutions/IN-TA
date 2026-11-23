'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSite, useText } from '../../site/SiteContext';
import { linesOf, standardText } from '../../site/site';
import { useOfficeStatus } from '../OfficeStatus';
import type { Guide as GuideApi, GuideLines } from './engine';
import GuideChat, { checkAvailable, savedName, type ChatStart } from './GuideChat';
import { withName, type AskReply, type PagePlan, type PlanReply } from './chatTypes';
import { arrived, engagement, journeyText, spent } from './journey';
import { OPEN_CHAT } from './openChat';
import { pageContext, spotByText } from './pageContext';
import css from './guide.module.css';
import { restingZone, watchCover } from '../clearance';
import { afterOpening } from '../../site/afterOpening';

// The website guide: a small 3D character beside the WhatsApp button, on every page (mounted once in ClientLayout, so
// he stays put as the visitor moves between pages). The 3D engine (./engine, with three.js) is only fetched on a
// computer that can run it comfortably, after the opening has cleared and the browser has a quiet moment, so it never
// slows the page down. His lines are in the admin (Site settings > Page wording > Website guide). "Ask me" opens his
// chat (GuideChat.tsx), answered by Google's Gemini on the server (app/api/guide/route.ts). On each page Gemini also
// writes his plan (app/api/guide/plan/route.ts): what he walks to, says and does there; his admin lines are the fallback.

const MET = 'inta-guide-met'; // he has greeted this browser before
const HIDDEN = 'inta-guide-hidden'; // hidden by the visitor, for this visit
const PLAN = 'inta-guide-plan:'; // + the page's address: Gemini's plan for it, kept for this visit
const SLOW = 'inta-guide-slow'; // this device couldn't draw him smoothly: the chat button alone, for this visit
const CHATTED = 'inta-guide-chatted'; // the visitor has opened the chat this visit: he doesn't nudge any more
const NUDGES = 'inta-guide-nudges'; // how many times he has opened the conversation himself this visit (two at most)

const read = (store: () => Storage, key: string) => { try { return store().getItem(key); } catch { return null; } };
const write = (store: () => Storage, key: string, value: string) => { try { store().setItem(key, value); } catch { /* private mode */ } };

/** Any screen (phone, tablet or computer) with enough memory and cores and WebGL, and no request for less motion or less data */
function canRun() {
  const mm = (q: string) => window.matchMedia(q).matches;
  if (mm('(prefers-reduced-motion: reduce)') || !mm('(min-width: 320px)')) return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData || (nav.deviceMemory ?? 8) < 4 || (navigator.hardwareConcurrency ?? 8) < 4) return false;
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

type Bubble = { text: string; x: number; y: number; ms: number; id: number } | null;

const NO_LINES: GuideLines = {
  welcome: [], back: [], tab: [], hover: () => [], pokes: [], about: [], serviceLines: [], services: [], dropped: [], missed: [], madeIt: [],
  stroll: [], strollHome: [], section: () => [], sectionAny: [], look: { heading: [], button: [], image: [], field: [] }, invite: [],
  plan: null, resolve: () => null,
};

/** Typing speed for each character: a natural rhythm, with a breath after the end of a sentence or a comma */
const beat = (ch: string) => 22 + Math.random() * 16 + (/[.!?…]/.test(ch) ? 170 : /[,;:]/.test(ch) ? 80 : 0);

/** The bubble over his head: its tail points at his head and its body stays on the screen whatever the length of the
 *  line (it slides along, the tail stays on him), dropping below his head when he's held up near the top */
function place(b: HTMLElement, at: { x: number; y: number }) {
  const w = b.offsetWidth, h = b.offsetHeight, m = 12;
  const below = at.y - h - 14 < 88;
  const x = Math.min(Math.max(at.x, m + w / 2), window.innerWidth - m - w / 2);
  const tail = Math.max(-(w / 2 - 16), Math.min(w / 2 - 16, at.x - x));
  b.style.left = `${x}px`;
  b.style.top = `${below ? at.y + 64 : at.y}px`;
  b.style.setProperty('--tail', `${tail}px`);
  if (below) b.dataset.below = '1'; else delete b.dataset.below;
}

export default function Guide() {
  const t = useText();
  const site = useSite();
  const status = useOfficeStatus();
  const pathname = usePathname();
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const api = useRef<GuideApi | null>(null);
  const [on, setOn] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [bubble, setBubble] = useState<Bubble>(null);
  const [typed, setTyped] = useState('');
  const [zz, setZz] = useState<{ x: number; y: number } | null>(null);
  const [hot, setHot] = useState(false);
  const [docked, setDocked] = useState(true);
  const [fx, setFx] = useState<{ id: number; kind: string; x: number; y: number; size: number }[]>([]);
  const [closeShown, setCloseShown] = useState(false);
  const [hideAt, setHideAt] = useState<{ x: number; y: number } | null>(null); // beside his head on the button
  const closeTimer = useRef(0);
  const bubbleEl = useRef<HTMLDivElement>(null);
  const lastAt = useRef<{ x: number; y: number } | null>(null); // where his head was on the last frame
  const zzEl = useRef<HTMLSpanElement>(null);
  const [tuckedOn, setTuckedOn] = useState<string | null>(null);
  const tucked = tuckedOn === pathname;
  const [chatOpen, setChatOpen] = useState(false);
  const [chatOnly, setChatOnly] = useState(false); // no robot on this screen, but the chat still works
  const [chatOut, setChatOut] = useState(false); // the chat sent him out on the page to show something
  // the open chat takes the whole height: he steps away, and only comes back to walk to what the chat is showing
  const offstage = tucked || (chatOpen && !chatOut);
  const chatOpenRef = useRef(false);
  const refocus = useRef(false); // closing the chat puts the keyboard back on the chat button once it's back
  const [start, setStart] = useState<ChatStart>(null);
  // his own opening line, offered in a card by his button: the visitor has been reading a while
  const [teaser, setTeaser] = useState<(NonNullable<NonNullable<ChatStart>['seed']> & { name: string }) | null>(null);
  const openChat = () => { chatOpenRef.current = true; write(() => sessionStorage, CHATTED, '1'); setBubble(null); setTeaser(null); setChatOpen(true); };
  const openRef = useRef(openChat);
  useEffect(() => { openRef.current = openChat; });
  const closeChat = useCallback(() => { chatOpenRef.current = false; refocus.current = true; setChatOpen(false); }, []);

  // his lines, read fresh whenever he speaks (they follow the admin wording and the office hours)
  const lines = useRef<() => GuideLines>(() => NO_LINES);
  // Gemini's plan for the page on screen, and the things on it, numbered as when the plan was asked for (fresh: by
  // this very page view, so the numbers can be trusted; a plan kept from earlier finds things by their words)
  const plan = useRef<{ path: string; plan: PagePlan; spots: Map<string, Element>; fresh: boolean } | null>(null);

  useEffect(() => {
    lines.current = () => ({
    // every box can hold several lines (one per line): one is picked at random each time
    welcome: linesOf(t('guide_welcome')),
    back: linesOf(t('guide_back')),
    tab: linesOf(t('guide_tab')),
    hover: () => linesOf(t(status?.startsWith('OPEN') ? 'guide_hover_open' : 'guide_hover_closed')),
    pokes: linesOf(t('guide_pokes')),
    dropped: linesOf(t('guide_dropped')),
    missed: linesOf(t('guide_missed')),
    madeIt: linesOf(t('guide_madeit')),
    about: linesOf(t('guide_about')),
    serviceLines: linesOf(t('guide_service')),
    services: site.services.map((s) => s.title.trim()).filter(Boolean),
    stroll: linesOf(t('guide_stroll')),
    strollHome: linesOf(t('guide_stroll_home')),
    // a part of the page with its own box in the admin (guide_section_services…); an unknown key has none
    section: (key) => (/^[a-z0-9-]+$/.test(key) && standardText(`guide_section_${key.replace(/-/g, '_')}`) !== '' ? linesOf(t(`guide_section_${key.replace(/-/g, '_')}`)) : []),
    sectionAny: linesOf(t('guide_section_any')),
    look: { heading: linesOf(t('guide_look_heading')), button: linesOf(t('guide_look_button')), image: linesOf(t('guide_look_image')), field: linesOf(t('guide_look_field')) },
    invite: linesOf(t('guide_chat_invite')),
    plan: plan.current?.path === window.location.pathname ? plan.current.plan : null,
    resolve: (beat) => {
      const p = plan.current;
      if (!p || p.path !== window.location.pathname) return null;
      const el = p.fresh ? p.spots.get(beat.target) : null;
      return el?.isConnected ? el : spotByText(beat.text);
    },
    });
  });

  // start: only where he can run, once the opening is done and the browser is idle
  useEffect(() => {
    // hidden by the visitor, or where he can't run (less motion asked for, a small device): the chat button is still
    // there, once the opening is done
    if (read(() => sessionStorage, HIDDEN) || read(() => sessionStorage, SLOW) || !canRun()) return afterOpening(() => setChatOnly(true));
    let stopped = false;
    let idle = 0;
    const cancelOpening = afterOpening(() => {
      const begin = () => {
        if (stopped || !host.current || !canvas.current) return;
        setOn(true);
        const firstVisit = !read(() => localStorage, MET);
        import('./engine')
          .then(({ startGuide }) => startGuide(host.current!, canvas.current!, {
            // while the chat is open its panel has the words: no bubble over it, except what the chat asked him to say
            say: (text, at, ms = 2200, force) => {
              if (chatOpenRef.current && !force) return;
              setTyped(''); setBubble({ text, x: at.x, y: at.y, ms, id: Date.now() + Math.random() });
            },
            hush: () => setBubble(null),
            sleeping: (z, at) => setZz(z ? at : null),
            // the bubble and the z's ride along above his head (moved directly, without re-rendering)
            anchor: (at) => {
              const b = bubbleEl.current, zEl = zzEl.current;
              lastAt.current = at;
              if (b) place(b, at);
              if (zEl) { zEl.style.left = `${at.x + 18}px`; zEl.style.top = `${at.y - 6}px`; }
            },
            mode: (m) => setDocked(m === 'dock'),
            dock: (at) => setHideAt((was) => (was && was.x === at.x && was.y === at.y ? was : at)),
            fx: (kind, at, size = 1) => {
              if (kind === 'wobble') {
                // the chat button wobbles where he bumped into it
                document.querySelector('[data-guide-dock] > span')?.animate(
                  [{ transform: 'rotate(0)' }, { transform: 'rotate(-16deg) scale(0.9)' }, { transform: 'rotate(11deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(0)' }],
                  { duration: 520, easing: 'ease-out' },
                );
                return;
              }
              const id = Date.now() + Math.random();
              setFx((list) => [...list, { id, kind, x: at.x, y: at.y, size }]);
              window.setTimeout(() => setFx((list) => list.filter((f) => f.id !== id)), kind === 'dust' ? 900 : 2000);
            },
            hot: (h) => {
              setHot(h);
              window.clearTimeout(closeTimer.current);
              if (h) setCloseShown(true);
              else closeTimer.current = window.setTimeout(() => setCloseShown(false), 2600);
            },
            firstVisit,
            lines: () => lines.current(),
            // too slow here: he goes, and the chat button (which still opens the chat) stays, for the rest of the visit
            tooSlow: () => {
              write(() => sessionStorage, SLOW, '1');
              setBubble(null);
              setZz(null);
              api.current?.stop();
              api.current = null;
              setOn(false);
              setChatOnly(true);
            },
          }))
          .then((g) => {
            if (stopped) { g.stop(); return; }
            api.current = g;
            write(() => localStorage, MET, '1');
          })
          .catch(() => { setOn(false); setChatOnly(true); }); // no model or no WebGL after all: just the chat
      };
      if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(begin, { timeout: 3000 });
      else idle = window.setTimeout(begin, 1200);
    });
    return () => {
      stopped = true;
      cancelOpening();
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle); else window.clearTimeout(idle);
      api.current?.stop();
      api.current = null;
    };
  }, []);

  // each page: Gemini's plan for it, once the page has settled (kept for the visit, and by the server for everyone)
  useEffect(() => {
    if (!on) return;
    plan.current = null;
    let gone = false;
    let timer = 0;
    const path = window.location.pathname;
    const get = async () => {
      if (gone) return;
      if (!api.current) { timer = window.setTimeout(get, 1000); return; } // he's still arriving
      const { page, spots } = pageContext(false);
      let got: PagePlan | null = null;
      let fresh = false;
      try { got = JSON.parse(read(() => sessionStorage, PLAN + path) ?? 'null'); } catch { got = null; }
      if (!got) {
        try {
          const res = await fetch('/api/guide/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ page }) });
          const reply: PlanReply = await res.json();
          if (reply.ok) { got = reply.plan; fresh = true; write(() => sessionStorage, PLAN + path, JSON.stringify(got)); }
        } catch { /* no plan: his admin lines carry on */ }
      }
      if (gone || !got || window.location.pathname !== path) return;
      plan.current = { path, plan: got, spots, fresh };
      // its greeting as soon as he's free (he may be mid-line or mid-walk), a few tries at most
      const intro = got.intro;
      const greet = (tries: number) => {
        if (gone || window.location.pathname !== path) return;
        if (!api.current?.announce(intro) && tries > 0) timer = window.setTimeout(() => greet(tries - 1), 2500);
      };
      greet(5);
    };
    timer = window.setTimeout(get, 2200);
    return () => { gone = true; window.clearTimeout(timer); };
  }, [pathname, on]);

  // the visit: each page, the time on it and the parts read (for the robot to talk about, and for the team with a lead)
  useEffect(() => {
    const timer = window.setTimeout(() => arrived(window.location.pathname, document.title), 700);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  // the chat opened from elsewhere on the site (the Contact page's Robot line), with a question or without
  useEffect(() => {
    const onOpen = (e: Event) => {
      const question = (e as CustomEvent<{ question?: string }>).detail?.question;
      setStart({ id: Date.now(), question });
      openRef.current();
    };
    window.addEventListener(OPEN_CHAT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT, onOpen);
  }, []);

  // Every five seconds: time on the page and what's being read; and, when the visitor has been reading a while (a
  // page for over a minute, or two pages and half a minute on this one), he opens the conversation himself, about what
  // they're looking at: twice a visit at most, never once they've used the chat
  const readyRef = useRef(false);
  const tuckedRef = useRef(false);
  useEffect(() => { readyRef.current = on || chatOnly; tuckedRef.current = tucked; });
  useEffect(() => {
    let asking = false;
    let lastNudge = 0;
    const partNow = () => {
      const mid = window.innerHeight * 0.45;
      const sec = [...document.querySelectorAll('main section[id]')].filter((x) => { const r = x.getBoundingClientRect(); return r.top <= mid && r.bottom >= mid; }).pop();
      return sec ? (sec.getAttribute('aria-label') || sec.querySelector('h1, h2, h3')?.textContent || sec.id).replace(/\s+/g, ' ').trim() : '';
    };
    const tick = async () => {
      if (document.visibilityState !== 'visible') return;
      spent(5, partNow());
      const e = engagement();
      const nudges = Number(read(() => sessionStorage, NUDGES) ?? 0);
      if (asking || !readyRef.current || tuckedRef.current || chatOpenRef.current || read(() => sessionStorage, CHATTED)) return;
      if (nudges >= 2 || Date.now() - lastNudge < 120_000 || !(e.here >= 60 || (e.pages >= 2 && e.here >= 30))) return;
      asking = true;
      lastNudge = Date.now();
      write(() => sessionStorage, NUDGES, String(nudges + 1));
      try {
        const a = await checkAvailable();
        if (!a.available) return;
        const { page, spots } = pageContext();
        const res = await fetch('/api/guide', { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ question: '', history: [], page, journey: journeyText(), mode: 'opener' }) });
        const reply: AskReply = await res.json();
        if (!reply.ok || chatOpenRef.current) return;
        setTeaser({ answer: reply, spots, name: savedName() });
        api.current?.gesture(reply.gesture === 'none' ? 'wave' : reply.gesture, 'happy');
      } catch { /* no line this time */ } finally { asking = false; }
    };
    const timer = window.setInterval(tick, 5000);
    return () => window.clearInterval(timer);
  }, []);
  // the card goes by itself after a while
  useEffect(() => {
    if (!teaser) return;
    const timer = window.setTimeout(() => setTeaser(null), 30_000);
    return () => window.clearTimeout(timer);
  }, [teaser]);

  // the speech bubble types itself out at a natural rhythm, stays long enough to read (the engine's ms), then goes
  useEffect(() => {
    if (!bubble) return;
    let i = 0;
    let timer = 0;
    const next = () => {
      i += 1;
      setTyped(bubble.text.slice(0, i));
      timer = i < bubble.text.length ? window.setTimeout(next, beat(bubble.text[i - 1])) : window.setTimeout(() => setBubble(null), bubble.ms);
    };
    timer = window.setTimeout(next, 30);
    return () => window.clearTimeout(timer);
  }, [bubble]);

  // the cursor shows he can be picked up (the "Hide" button stays a moment after the pointer leaves him: see hot above)
  useEffect(() => { document.documentElement.classList.toggle('guide-hot', hot); }, [hot]);

  // he and his button step aside only where they would cover [data-floating-clear] (the hero's buttons, the footer's
  // back-to-top row) or [data-guide-clear] on the screens its media query names (the services board's cards on phones
  // and tablets, the enquiry form's send button): his button, and the room he stands in above it (see clearance.ts)
  useEffect(() => {
    api.current?.moved();
    const S = window.innerWidth < 640 || window.innerHeight < 560 ? 0.68 : window.innerWidth < 1024 ? 0.82 : 1;
    return watchCover(
      '[data-floating-clear], [data-guide-clear]',
      () => restingZone(document.querySelector<HTMLElement>('[data-guide-dock]'), 12, { top: Math.round(112 * S) + 16, left: 16 }),
      (covered) => setTuckedOn(covered ? pathname : null),
      (el) => !el.dataset.guideClear || window.matchMedia(el.dataset.guideClear).matches,
    );
  }, [pathname]);

  // no drawing while he's tucked away, hidden, or the tab isn't being looked at; a hello when the visitor comes back
  useEffect(() => { api.current?.pause(offstage || hidden); }, [offstage, hidden]);
  useEffect(() => {
    let away = 0;
    const onVis = () => {
      if (document.hidden) { away = performance.now(); api.current?.pause(true); return; }
      api.current?.pause(offstage || hidden);
      if (away && performance.now() - away > 5000) api.current?.greetTab();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [offstage, hidden]);

  // "Hide": the robot goes for this visit; his chat button stays
  const hide = () => {
    write(() => sessionStorage, HIDDEN, '1');
    setHidden(true);
    setBubble(null);
    setZz(null);
    setOn(false);
    setChatOnly(true);
    api.current?.stop();
    api.current = null;
    document.documentElement.classList.remove('guide-hot');
  };

  const ready = on || chatOnly;
  return (
    <>
      {!hidden && (
        <div ref={host} aria-hidden="true" className={`guide ${css.host} ${on ? css.on : ''} ${offstage ? css.tucked : ''}`}>
          <canvas ref={canvas} />
        </div>
      )}
      {bubble && !offstage && (
        // the whole line takes its space from the start (hidden), so the bubble doesn't grow and shift as it types
        <div ref={(el) => { bubbleEl.current = el; if (el) place(el, lastAt.current ?? bubble); }} aria-hidden="true" className={`guide-say ${css.say}`} key={bubble.id}>
          <span className={css.full}>{bubble.text}</span>
          <span className={css.typed}>{typed}</span>
        </div>
      )}
      {fx.map((f) => (
        <span key={f.id} aria-hidden="true" className={`guide-fx ${css.fx} ${css[f.kind] ?? ''}`}
          style={{ left: f.x, top: f.y, ['--size' as string]: f.size }}>
          {f.kind === 'dust' ? <><i /><i /><i /><i /><i /></> : <><i>✦</i><i>✦</i><i>✦</i></>}
        </span>
      ))}
      {zz && <span ref={zzEl} aria-hidden="true" className={`guide-z ${css.z}`} style={{ left: zz.x + 18, top: zz.y - 6 }}>z</span>}
      {on && !tucked && docked && !chatOpen && (
        <button type="button" onClick={hide} onPointerEnter={() => setCloseShown(true)} className={`guide-hide ${css.hide} ${closeShown ? css.shown : ''}`} aria-label="Hide the guide character"
          style={hideAt ? { left: Math.min(hideAt.x + 16, window.innerWidth - 60), top: Math.max(8, hideAt.y - 30) } : undefined}>
          Hide
        </button>
      )}
      {/* The chat button in the corner: his face (two blinking eyes) on a midnight disc. He stands on it (the engine
          docks on [data-guide-dock]), so it stays in the page while it's out of sight, only faded and inert. */}
      <button
        ref={(el) => { if (el && refocus.current && !chatOpen) { refocus.current = false; el.focus({ preventScroll: true }); } }}
        type="button"
        data-guide-dock=""
        onClick={openChat}
        aria-haspopup="dialog"
        aria-label={t('guide_chat_title')}
        inert={!ready || tucked || chatOpen}
        className={`guide-launch ${css.launcher} ${!ready || tucked || chatOpen ? css.launcherAway : ''}`}
      >
        <span className={css.launcherEyes} aria-hidden="true"><i /><i /></span>
        <span className={css.launcherTip} aria-hidden="true">{t('guide_chat_button')}</span>
      </button>
      {teaser && ready && !tucked && !chatOpen && (
        // his opening line, by his button: "Let's talk" opens the chat with it
        <div role="status" className={`guide-teaser ${css.teaser} ${on ? '' : css.teaserAlone}`}>
          <p>{withName(teaser.answer.reply, teaser.name)}</p>
          <div>
            <button type="button" onClick={() => { setStart({ id: Date.now(), seed: teaser }); openChat(); }}>{t('guide_chat_teaser_reply')}</button>
            <button type="button" onClick={() => setTeaser(null)}>{t('guide_chat_teaser_later')}</button>
          </div>
        </div>
      )}
      {ready && <GuideChat api={api} open={chatOpen} onClose={closeChat} robot={on} onOut={setChatOut} start={start} />}
    </>
  );
}

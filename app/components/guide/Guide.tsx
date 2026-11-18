'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSite, useText } from '../../site/SiteContext';
import { linesOf, standardText } from '../../site/site';
import { useOfficeStatus } from '../OfficeStatus';
import type { Guide as GuideApi, GuideLines } from './engine';
import css from './guide.module.css';

// The website guide: a small 3D character beside the WhatsApp button, on every page (mounted once in ClientLayout, so
// he stays put as the visitor moves between pages). The 3D engine (./engine, with three.js) is only fetched on a
// computer that can run it comfortably, after the opening has cleared and the browser has a quiet moment, so it never
// slows the page down. His lines are in the admin (Site settings > Page wording > Website guide).

const MET = 'inta-guide-met'; // he has greeted this browser before
const HIDDEN = 'inta-guide-hidden'; // hidden by the visitor, for this visit

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

/** Once the opening screen has cleared (or straight away when it didn't play) */
function afterOpening(go: () => void) {
  const state = document.documentElement.dataset.loader;
  if (state === 'seen' || state === 'left') { go(); return () => {}; }
  const done = () => { window.clearTimeout(fallback); go(); };
  const fallback = window.setTimeout(done, 7000);
  window.addEventListener('inta:opening-done', done, { once: true });
  return () => { window.clearTimeout(fallback); window.removeEventListener('inta:opening-done', done); };
}

type Bubble = { text: string; x: number; y: number; ms: number; id: number } | null;

const NO_LINES: GuideLines = {
  welcome: [], back: [], tab: [], hover: () => [], pokes: [], about: [], serviceLines: [], services: [], dropped: [], missed: [], madeIt: [],
  stroll: [], strollHome: [], section: () => [], sectionAny: [], look: { heading: [], button: [], image: [], field: [] },
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

  // his lines, read fresh whenever he speaks (they follow the admin wording and the office hours)
  const lines = useRef<() => GuideLines>(() => NO_LINES);

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
    });
  });

  // start: only where he can run, once the opening is done and the browser is idle
  useEffect(() => {
    if (read(() => sessionStorage, HIDDEN) || !canRun()) return;
    let stopped = false;
    let idle = 0;
    const cancelOpening = afterOpening(() => {
      const begin = () => {
        if (stopped || !host.current || !canvas.current) return;
        setOn(true);
        const firstVisit = !read(() => localStorage, MET);
        import('./engine')
          .then(({ startGuide }) => startGuide(host.current!, canvas.current!, {
            say: (text, at, ms = 2200) => { setTyped(''); setBubble({ text, x: at.x, y: at.y, ms, id: Date.now() + Math.random() }); },
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
                // the WhatsApp logo wobbles where he bumped into the button
                document.querySelector('a[aria-label="Chat on WhatsApp"] svg')?.animate(
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
          }))
          .then((g) => {
            if (stopped) { g.stop(); return; }
            api.current = g;
            write(() => localStorage, MET, '1');
          })
          .catch(() => setOn(false)); // no model or no WebGL after all: the page simply has no guide
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

  // he steps aside wherever the WhatsApp button does (the hero's buttons, the footer's back-to-top row), and on his own
  // where [data-guide-clear] shows, on the screens its value names as a media query (the services board on phones and
  // tablets, whose cards sit just above the button: he and his bubble would cover their words)
  useEffect(() => {
    const targets = [...document.querySelectorAll('[data-floating-clear], [data-guide-clear]')];
    api.current?.moved();
    if (!targets.length) return;
    const seen = new Set<Element>();
    const applies = (el: Element) => {
      const media = (el as HTMLElement).dataset.guideClear;
      return !media || window.matchMedia(media).matches;
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting && applies(e.target) ? seen.add(e.target) : seen.delete(e.target)));
      setTuckedOn(seen.size ? pathname : null);
    });
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  // no drawing while he's tucked away, hidden, or the tab isn't being looked at; a hello when the visitor comes back
  useEffect(() => { api.current?.pause(tucked || hidden); }, [tucked, hidden]);
  useEffect(() => {
    let away = 0;
    const onVis = () => {
      if (document.hidden) { away = performance.now(); api.current?.pause(true); return; }
      api.current?.pause(tucked || hidden);
      if (away && performance.now() - away > 5000) api.current?.greetTab();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [tucked, hidden]);

  const hide = () => {
    write(() => sessionStorage, HIDDEN, '1');
    setHidden(true);
    setBubble(null);
    api.current?.stop();
    api.current = null;
    document.documentElement.classList.remove('guide-hot');
  };

  if (hidden) return null;
  return (
    <>
      <div ref={host} aria-hidden="true" className={`guide ${css.host} ${on ? css.on : ''} ${tucked ? css.tucked : ''}`}>
        <canvas ref={canvas} />
      </div>
      {bubble && !tucked && (
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
      {on && !tucked && docked && (
        <button type="button" onClick={hide} onPointerEnter={() => setCloseShown(true)} className={`guide-hide ${css.hide} ${closeShown ? css.shown : ''}`} aria-label="Hide the guide character"
          style={hideAt ? { left: Math.min(hideAt.x + 16, window.innerWidth - 60), top: Math.max(8, hideAt.y - 30) } : undefined}>
          Hide
        </button>
      )}
    </>
  );
}

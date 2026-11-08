'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Icon from '../Icon';
import { useSocials } from '../Footer';
import { underHeader } from '../underHeader';
import { useOfficeStatus } from '../OfficeStatus';
import { useSite, useText } from '../../site/SiteContext';
import { accent, addressLines, coords, daysLong, hoursShort, mapUrl, phoneHref, timeLong, TIME_ZONE } from '../../site/site';
import { calm } from '../blog/data';
import { scrollToY } from '../SmoothScroll';
import { usePlayIntro } from '../../context/usePlayIntro';
import { refreshSoon } from '../services/detail/refresh';
import MessageLine from './MessageLine';
import VisitGlobe from './VisitGlobe';
import { createCable, type Cable } from './patchCable';

gsap.registerPlugin(ScrollTrigger, useGSAP);

type PortId = 'message' | 'call' | 'email' | 'visit';

// The line under each port's name comes from Site settings (see `portValue` in the page)
const PORTS: { id: PortId; no: string; name: string }[] = [
  { id: 'message', no: '01', name: 'Message' },
  { id: 'call', no: '02', name: 'Call' },
  { id: 'email', no: '03', name: 'Email' },
  { id: 'visit', no: '04', name: 'Visit' },
];
const isPort = (v: string): v is PortId => PORTS.some((p) => p.id === v);

/** A short buzz on phones, once the visitor has touched the page (before that, browsers block it and log a warning) */
const buzz = (ms: number) => {
  if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(ms);
};

// The plug: how far it stands out of the panel, once it's in
const PLUG_OUT = 42;
const NEAR = 84; // how close to a port it has to be dropped, in pixels
const DRAW_BELOW_JACK = 300; // how far below the console's jack the cable can be carried

const ACTION = 'kinetic-cta-btn group inline-flex h-12 items-center justify-center gap-3 rounded-xl bg-brand-blue px-6 font-mono text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#2563eb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dbbff]';
const QUIET = 'blog-wipe inline-flex h-12 items-center justify-center rounded-xl border border-white/25 px-5 font-mono text-xs font-semibold uppercase tracking-wider text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dbbff]';
const RAIL_LABEL = 'font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/60';

function Copy({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      window.setTimeout(() => setDone(false), 2000);
    } catch {
      window.prompt(label, text); // the browser wouldn't let us: it can still be copied by hand
    }
  };
  return (
    <button type="button" onClick={copy} className={QUIET}>
      <span aria-live="polite">{done ? 'Copied' : label}</span>
    </button>
  );
}

/** Wayanad's time, and the visitor's if it's different. Only ever worked out in the browser */
function Clocks() {
  const site = useSite();
  const [times, setTimes] = useState<{ office: string; you: string; place: string } | null>(null);
  useEffect(() => {
    const clock = (timeZone?: string) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone });
    const office = clock(TIME_ZONE);
    const you = clock();
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    const place = zone.split('/').pop()?.replace(/_/g, ' ') ?? '';
    const tick = () => {
      const now = new Date();
      setTimes({ office: office.format(now), you: you.format(now), place });
    };
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <dl className="grid grid-cols-2 gap-3">
      <div>
        <dt className={RAIL_LABEL}>In {site.address.district || 'our office'}</dt>
        <dd className="mt-1 font-display text-xl font-bold tabular-nums text-white">{times?.office ?? '--:--'}</dd>
      </div>
      {times && times.you !== times.office && (
        <div>
          <dt className={RAIL_LABEL}>Your time{times.place ? ` · ${times.place}` : ''}</dt>
          <dd className="mt-1 font-display text-xl font-bold tabular-nums text-white">{times.you}</dd>
        </div>
      )}
    </dl>
  );
}

export default function ContactPage() {
  const site = useSite();
  const t = useText();
  const socials = useSocials();
  const address = addressLines(site);
  const phone = { href: phoneHref(site.phone), label: site.phone };
  const email = site.email;
  const [titlePlain, titleBright] = accent(t('contact_title'));
  const portValue = (id: PortId) =>
    ({
      message: t('contact_message_port'),
      call: site.phone,
      email,
      visit: [site.address.locality, site.address.district].filter(Boolean).join(', '),
    })[id];
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const plugRef = useRef<HTMLDivElement>(null);
  const jackRef = useRef<HTMLSpanElement>(null);
  const scanRef = useRef<HTMLSpanElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const cableRef = useRef<Cable | null>(null);
  const introRef = useRef<gsap.core.Timeline | null>(null);
  const plugIntoRef = useRef<(id: PortId, first?: boolean) => void>(() => {});
  const firstRef = useRef(true);
  const [active, setActive] = useState<PortId>('message');
  const [everVisit, setEverVisit] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [connected, setConnected] = useState(false);
  const status = useOfficeStatus();
  const open = status?.startsWith('OPEN') ?? false;
  const playedRef = usePlayIntro(introRef);

  const portEl = useCallback((id: PortId) => rootRef.current?.querySelector<HTMLElement>(`[data-port="${id}"]`) ?? null, []);

  // A blink on a port's light
  const blink = useCallback(
    (id: PortId, strong = false) => {
      portEl(id)?.querySelector('.patch-led')?.animate(strong ? [{ opacity: 0.1 }, { opacity: 1 }, { opacity: 0.1 }, { opacity: 1 }, { opacity: 0.1 }, { opacity: 1 }] : [{ opacity: 0.25 }, { opacity: 1 }], { duration: strong ? 520 : 130 });
    },
    [portEl],
  );

  const activeRef = useRef<PortId>('message');

  // ---- The cable, and everything that moves it ----
  useEffect(() => {
    const stage = stageRef.current!;
    const canvas = canvasRef.current!;
    const plug = plugRef.current!;
    const jack = jackRef.current!;
    // (held here, not read from the ref later: leaving the page clears refs before this effect is cleaned up)
    const panel = consoleRef.current!;
    const still = calm();
    const head = { x: 0, y: 0 };
    const mouths = new Map<PortId, { x: number; y: number }>();

    const cable = createCable(canvas, {
      still,
      onFrame: (x, y, angle) => {
        plug.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-100%) rotate(${angle.toFixed(2)}deg)`;
      },
      onArrive: (dir) => {
        if (dir === 'up') blink(activeRef.current);
      },
    });
    cableRef.current = cable;

    const measure = () => {
      const box = stage.getBoundingClientRect();
      const j = jack.getBoundingClientRect();
      const anchorY = j.top - box.top + j.height / 2;
      cable.resize(Math.round(box.width), Math.round(Math.min(box.height, anchorY + DRAW_BELOW_JACK)));
      cable.setAnchor(j.left - box.left + j.width / 2, anchorY);
      cable.setFloor(panel.getBoundingClientRect().top - box.top - 3);
      PORTS.forEach(({ id }) => {
        const slot = stage.querySelector<HTMLElement>(`[data-port="${id}"] .patch-slot`)!.getBoundingClientRect();
        mouths.set(id, { x: slot.left - box.left + slot.width / 2, y: slot.bottom - box.top + PLUG_OUT });
      });
    };

    let flight: gsap.core.Timeline | null = null;
    let carried = false;
    let touched = false;
    let seated: PortId | null = null;

    const showHead = () => cable.setHead(head.x, head.y);

    // Going home to a port when the plug's where it is now, the short way, and clicking in
    const seat = (id: PortId, first = false) => {
      const mouth = mouths.get(id);
      if (!mouth) return;
      flight?.kill();
      if (!first) touched = true;
      const same = seated === id;
      cable.setPlugged(false);
      if (still) {
        head.x = mouth.x;
        head.y = mouth.y;
        cable.setPlugged(true);
        showHead();
        arrive(id, same);
        return;
      }
      setConnected(false);
      const rise = first ? 1.05 : 0.66;
      flight = gsap
        .timeline({ onUpdate: showHead })
        .to(head, { x: mouth.x, duration: rise, ease: 'power2.inOut' }, 0)
        .to(head, { y: mouth.y + 34, duration: rise - 0.04, ease: 'power2.out' }, 0)
        // it squares up to the port on the way, so that it goes in straight
        .call(() => cable.setPlugged(true), [], rise - 0.2)
        .to(head, { y: mouth.y, duration: 0.18, ease: 'power3.in' }, rise)
        .call(() => {
          showHead();
          arrive(id, same && !first);
        });
    };

    // In: the light comes on, a ring goes out from the port, the line opens below
    const arrive = (id: PortId, same: boolean) => {
      const changed = activeRef.current !== id;
      seated = id;
      activeRef.current = id;
      setActive(id);
      setConnected(true);
      if (id === 'visit') setEverVisit(true);
      if (!same) {
        blink(id, true);
        if (!still) {
          portEl(id)?.querySelector('.patch-ring')?.animate(
            [
              { transform: 'translate(-50%, 50%) scale(0.4)', opacity: 0.9 },
              { transform: 'translate(-50%, 50%) scale(3.4)', opacity: 0 },
            ],
            { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
          );
          cable.kick(-16);
          cable.pulse('down', true);
          buzz(12);
        }
        if (!firstRef.current && changed) {
          window.history.replaceState(null, '', `#${id}`);
          // the line that just opened is what they want to see
          const top = panel.getBoundingClientRect().top;
          if (top > window.innerHeight * 0.5) scrollToY(stage.getBoundingClientRect().top + window.scrollY - 16);
        }
      }
      firstRef.current = false;
    };

    plugIntoRef.current = seat;

    // First placement: hanging loose by the jack, until the opening plugs it in
    measure();
    {
      const box = stage.getBoundingClientRect();
      const j = jack.getBoundingClientRect();
      head.x = j.left - box.left + j.width / 2 + 90;
      head.y = j.top - box.top + 24;
    }
    showHead();
    const hash = window.location.hash.slice(1);
    if (isPort(hash)) activeRef.current = hash;
    // with reduced motion it's simply in place; on a page that was already on screen as it arrived (its opening
    // skipped, see usePlayIntro) it plugs itself in now, as the opening would have
    if (still || playedRef.current) seat(activeRef.current, true);

    const sized = new ResizeObserver(() => {
      if (!stage.isConnected) return; // the page is being left
      measure();
      if (seated && !carried && !flight?.isActive()) {
        const mouth = mouths.get(seated)!;
        head.x = mouth.x;
        head.y = mouth.y;
        showHead();
      }
      refreshSoon();
    });
    sized.observe(stage);

    // ---- Carrying the plug by hand ----
    const nearest = (x: number, y: number) => {
      let best: PortId | null = null;
      let bestD = NEAR;
      mouths.forEach((m, id) => {
        const d = Math.hypot(m.x - x, m.y - y);
        if (d < bestD) {
          bestD = d;
          best = id;
        }
      });
      return best as PortId | null;
    };
    const markNear = (id: PortId | null) => {
      stage.querySelectorAll<HTMLElement>('[data-port]').forEach((el) => {
        el.dataset.near = String(el.dataset.port === id);
      });
    };
    const grip = { x: 0, y: 0 };
    const toStage = (e: PointerEvent) => {
      const box = stage.getBoundingClientRect();
      return {
        x: Math.max(14, Math.min(box.width - 14, e.clientX - box.left + grip.x)),
        y: Math.max(40, Math.min(canvas.clientHeight - 14, e.clientY - box.top + grip.y)),
      };
    };
    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      flight?.kill();
      carried = true;
      touched = true;
      const box = stage.getBoundingClientRect();
      grip.x = head.x - (e.clientX - box.left);
      grip.y = head.y - (e.clientY - box.top);
      plug.setPointerCapture(e.pointerId);
      cable.setPlugged(false);
      setDragging(true);
      setConnected(false);
      seated = null;
      buzz(6);
    };
    const onMove = (e: PointerEvent) => {
      if (!carried) return;
      const at = toStage(e);
      const near = nearest(at.x, at.y);
      markNear(near);
      // it pulls towards a port as it comes close
      const pull = near ? mouths.get(near)! : null;
      head.x = pull ? at.x + (pull.x - at.x) * 0.35 : at.x;
      head.y = pull ? at.y + (pull.y - at.y) * 0.35 : at.y;
      showHead();
    };
    const drop = (e?: PointerEvent) => {
      if (!carried) return;
      carried = false;
      setDragging(false);
      const near = e ? nearest(head.x, head.y) : null;
      markNear(null);
      seat(near ?? activeRef.current);
    };
    const onUp = (e: PointerEvent) => drop(e);
    const onCancel = () => drop();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') drop();
    };
    // a link to one of the lines, from this page
    const onHash = () => {
      const next = window.location.hash.slice(1);
      if (isPort(next) && next !== seated) seat(next);
    };
    window.addEventListener('hashchange', onHash);
    plug.addEventListener('pointerdown', onDown);
    plug.addEventListener('pointermove', onMove);
    plug.addEventListener('pointerup', onUp);
    plug.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey);

    // ---- It feels the page: a scroll swings it, a passing cursor brushes it ----
    let lastY = window.scrollY;
    const onScroll = () => {
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      cable.kick(Math.max(-22, Math.min(22, dy * 0.5)));
    };
    const onHover = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || carried) return;
      const box = stage.getBoundingClientRect();
      cable.blow(e.clientX - box.left, e.clientY - box.top);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onHover, { passive: true });

    // Until someone's touched it, it stirs now and again, to say it can be
    let stirs = 0;
    const stir = window.setInterval(() => {
      if (firstRef.current || carried || touched || stirs > 6) return;
      stirs += 1;
      cable.kick(stirs % 2 ? 12 : -12);
    }, 4200);

    return () => {
      flight?.kill();
      sized.disconnect();
      window.clearInterval(stir);
      plug.removeEventListener('pointerdown', onDown);
      plug.removeEventListener('pointermove', onMove);
      plug.removeEventListener('pointerup', onUp);
      plug.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onHover);
      cable.destroy();
      cableRef.current = null;
    };
  }, [blink, portEl, playedRef]);

  // ---- The opening, once: the words rise, the rack's lights come on, the plug swings up and clicks in ----
  useGSAP(
    () => {
      if (calm()) return;
      introRef.current = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-contact="kicker"]', { y: 10, autoAlpha: 0, duration: 0.7 }, 0)
        .from('[data-contact="word"]', { y: 44, autoAlpha: 0, duration: 1.2, stagger: 0.14 }, 0.1)
        .from('[data-contact="in"]', { y: 16, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.35)
        .from('[data-contact="panel"]', { autoAlpha: 0, duration: 0.9 }, 0.3)
        .from('.patch-led', { opacity: 0.08, duration: 0.5, stagger: 0.12, ease: 'steps(3)' }, 0.5)
        .call(() => plugIntoRef.current(activeRef.current, true), [], 0.75);
      if (playedRef.current) introRef.current.progress(1);
      // the heading drifts up and away as the panel takes over
      gsap.fromTo('[data-contact="head"]', { y: 0, autoAlpha: 1 }, { y: -28, autoAlpha: 0.2, ease: 'none', scrollTrigger: { trigger: '[data-contact="head"]', start: underHeader(), end: 'bottom top', scrub: true } });
      const scrub = window.matchMedia('(pointer: fine)').matches ? true : 0.3;
      gsap.utils.toArray<HTMLElement>('[data-contact="rail"] > *').forEach((part) => {
        gsap.fromTo(part, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'sine.out', scrollTrigger: { trigger: part, start: 'top 98%', end: 'top 80%', scrub } });
      });
      refreshSoon();
    },
    { scope: rootRef },
  );

  // ---- A new line opens: a bar of light passes down the console and its contents rise behind it ----
  const firstLine = useRef(true);
  useGSAP(
    () => {
      if (!connected) return;
      if (firstLine.current) {
        firstLine.current = false;
        return;
      }
      if (calm()) return;
      gsap.fromTo(`[data-line-panel="${active}"] [data-line]`, { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.05, ease: 'expo.out', overwrite: true, clearProps: 'all' });
      const h = consoleRef.current?.offsetHeight ?? 0;
      scanRef.current?.animate(
        [
          { transform: 'translateY(0)', opacity: 0 },
          { transform: `translateY(${h * 0.12}px)`, opacity: 1 },
          { transform: `translateY(${h}px)`, opacity: 0 },
        ],
        { duration: 760, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      );
    },
    { scope: rootRef, dependencies: [active, connected] },
  );

  // ---- The form talks to the cable ----
  const onFormKey = useCallback(() => cableRef.current?.pulse('up'), []);
  const onSending = useCallback(() => {
    const cable = cableRef.current;
    for (let i = 0; i < 8; i++) window.setTimeout(() => cable?.pulse('up', i % 3 === 0), i * 130);
  }, []);
  const onSent = useCallback(() => {
    const cable = cableRef.current;
    for (let i = 0; i < 3; i++) window.setTimeout(() => cable?.pulse('down', true), i * 170);
    PORTS.forEach((p, i) => window.setTimeout(() => blink(p.id, true), i * 110));
  }, [blink]);

  const startFromKeyboard = (e: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const move = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!move) return;
    e.preventDefault();
    const next = PORTS[(index + move + PORTS.length) % PORTS.length];
    portEl(next.id)?.focus();
    plugIntoRef.current(next.id);
  };

  const noDefault = (e: ReactPointerEvent) => e.stopPropagation();

  return (
    <main ref={rootRef} className="inside-grid relative overflow-x-clip text-white">
      <div aria-hidden="true" className="patch-glow pointer-events-none absolute inset-x-0 top-0 h-[900px]" />

      <section aria-labelledby="contact-title" className="relative mx-auto w-full max-w-[1320px] px-4 pb-10 pt-[calc(var(--header-h)+1.5rem)] sm:px-6 sm:pb-16 sm:pt-[calc(var(--header-h)+2.25rem)]">
        <div data-contact="head" className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:items-end lg:gap-10">
          <div>
          <p data-contact="kicker" className="inline-flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9dbbff] sm:text-[11px] sm:tracking-[0.3em]">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current" />
            {t('contact_kicker')}
          </p>
          <h1 id="contact-title" className="heading-page mt-2.5 text-white sm:mt-3">
            <span data-contact="word" className="inline-block">{titlePlain}</span>{' '}
            <span data-contact="word" className="heading-accent-dark heading-serif">{titleBright}</span>
          </h1>
          </div>
          <p data-contact="in" className="text-[15px] leading-relaxed text-white/85 [text-wrap:balance] sm:text-lg lg:pb-3 lg:text-right">
            {t('contact_text')} <span className="pointer-coarse:hidden">Drag the cable into whichever suits you, or just click one.</span><span className="hidden pointer-coarse:inline">Tap whichever suits you.</span>
          </p>
        </div>

        <div ref={stageRef} data-contact-stage className="relative mt-5 sm:mt-7">
          <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-[2]" />

          {/* The plug. Mouse and touch can carry it; everyone can use the ports themselves */}
          <div ref={plugRef} aria-hidden="true" onPointerDown={noDefault} className={`patch-plug absolute left-0 top-0 z-[3] ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}>
            <span className="patch-plug-head" />
            <span className="patch-plug-boot" />
          </div>

          {/* The panel, from the same rack as the portfolio page */}
          <div data-contact="panel" className="rack-plate relative z-[4] rounded-lg">
            <div className="flex items-center gap-3 border-b border-black/30 px-3 py-2.5 sm:gap-4 sm:px-4">
              <span aria-hidden="true" className="rack-screw shrink-0 [--uh:44px]" />
              <Image src="/logo/logo-inta.png" alt="" width={120} height={50} className="h-5 w-auto shrink-0 sm:h-6" />
              <span aria-hidden="true" className="rack-vent hidden h-4 min-w-0 flex-1 rounded-[2px] sm:block" />
              <p className="ml-auto inline-flex min-w-0 items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-wider sm:ml-0 sm:text-[11px]">
                <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${open ? 'bg-[#9dbbff] shadow-[0_0_8px_2px_#5b8cff]' : 'bg-white/25'}`} />
                <span className={`truncate ${open ? 'text-[#c6d8ff]' : 'text-white/70'}`}>{status ?? hoursShort(site)}</span>
              </p>
              <span aria-hidden="true" className="rack-screw shrink-0 [--uh:44px]" />
            </div>
            <div role="radiogroup" aria-label="How would you like to reach us?" className="grid grid-cols-4">
              {PORTS.map((port, i) => {
                const on = active === port.id && connected;
                return (
                  <button
                    key={port.id}
                    type="button"
                    role="radio"
                    aria-checked={active === port.id}
                    tabIndex={active === port.id ? 0 : -1}
                    data-port={port.id}
                    data-live={on}
                    onClick={() => plugIntoRef.current(port.id)}
                    onKeyDown={(e) => startFromKeyboard(e, i)}
                    className="patch-port group relative flex min-w-0 flex-col items-center px-1.5 pb-0 pt-3 text-center first:rounded-bl-lg last:rounded-br-lg focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#9dbbff] sm:items-start sm:px-4 sm:pt-4 sm:text-left"
                  >
                    <span className="flex w-full items-center justify-center gap-1.5 sm:justify-between">
                      <span aria-hidden="true" className="hidden font-mono text-[10px] text-white/45 sm:inline">{port.no}</span>
                      <span aria-hidden="true" className="patch-led" />
                    </span>
                    <span className="patch-name mt-1.5 max-w-full truncate font-mono text-[10px] font-bold uppercase tracking-wider sm:mt-2 sm:font-display sm:text-[1.15rem] sm:normal-case sm:tracking-tight">{port.name}</span>
                    <span className="patch-value mt-0.5 hidden max-w-full truncate font-mono text-[11px] sm:block">{portValue(port.id)}</span>
                    <span aria-hidden="true" className="mt-2.5 flex w-full justify-center sm:mt-4">
                      <span className="patch-slot relative">
                        <span className="patch-ring absolute bottom-0 left-1/2 opacity-0" />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Room for the cable */}
          <div aria-hidden="true" className="h-[clamp(92px,11vw,132px)]" />

          {/* The console: what's plugged in shows here */}
          <div ref={consoleRef} className="relative z-[1] rounded-2xl border border-white/12 bg-[#040c38]/90 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)]">
            <span ref={jackRef} aria-hidden="true" className="patch-jack absolute left-1/2 top-0 z-[2]" />
            <span ref={scanRef} aria-hidden="true" className="patch-scan pointer-events-none absolute inset-x-0 top-0 z-[2] opacity-0" />

            <div className="grid gap-7 p-4 pt-7 sm:p-7 sm:pt-9 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10">
              <div className="relative min-w-0">
                <div data-line-panel="message" hidden={active !== 'message'}>
                  <MessageLine onKey={onFormKey} onSending={onSending} onSent={onSent} />
                </div>

                <div data-line-panel="call" hidden={active !== 'call'}>
                  <p data-line className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9dbbff] sm:text-[11px]">Line 02 // Call</p>
                  <h2 data-line className="heading-section mt-2.5 text-white [overflow-wrap:anywhere]"><a href={phone.href} className="rounded transition-colors duration-300 hover:text-[#9dbbff] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9dbbff]">{phone.label}</a></h2>
                  <p data-line className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/85 sm:text-base">{t('contact_call_text', { days: daysLong(site), time: timeLong(site) })}</p>
                  <div data-line className="mt-5 flex flex-wrap gap-2.5">
                    <a href={phone.href} className={`${ACTION} max-sm:w-full`}>
                      Call now
                      <Icon name="call" className="text-[16px]" />
                    </a>
                    <Copy text={phone.label} label="Copy number" />
                  </div>
                </div>

                <div data-line-panel="email" hidden={active !== 'email'}>
                  <p data-line className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9dbbff] sm:text-[11px]">Line 03 // Email</p>
                  <h2 data-line className="mt-2.5 font-display text-[clamp(1.35rem,4.2vw,3rem)] font-extrabold leading-[1.05] tracking-tight text-white [overflow-wrap:anywhere]"><a href={`mailto:${email}`} className="rounded transition-colors duration-300 hover:text-[#9dbbff] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9dbbff]">{email}</a></h2>
                  <p data-line className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/85 sm:text-base">{t('contact_email_text')}</p>
                  <div data-line className="mt-5 flex flex-wrap gap-2.5">
                    <a href={`mailto:${email}`} className={`${ACTION} max-sm:w-full`}>
                      Write to us
                      <Icon name="mail" className="text-[16px]" />
                    </a>
                    <Copy text={email} label="Copy address" />
                  </div>
                </div>

                <div data-line-panel="visit" hidden={active !== 'visit'}>
                  {everVisit && <VisitGlobe active={active === 'visit'} />}
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p data-line className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9dbbff] sm:text-[11px]">Line 04 // Visit</p>
                      <address data-line className="mt-2 font-display text-lg font-bold not-italic leading-snug tracking-tight text-white sm:text-2xl">{address[0]}<br />{address[1]}</address>
                      <p data-line className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/60 sm:text-[11px]">{coords(site)}</p>
                    </div>
                    <div data-line className="flex flex-wrap gap-2.5 max-sm:w-full">
                      <a href={mapUrl(site)} target="_blank" rel="noopener noreferrer" className={`${ACTION} max-sm:w-full`}>
                        Open in Maps
                        <Icon name="north_east" className="text-[16px]" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* The plug's been pulled */}
                <div aria-hidden={!dragging} className={`pointer-events-none absolute -inset-2 z-[1] flex flex-col items-center rounded-xl bg-[#01072b]/90 pt-[clamp(1.5rem,7vw,5rem)] text-center transition-opacity duration-300 ${dragging ? 'opacity-100' : 'opacity-0'}`}>
                  <p className="font-mono text-2xl font-bold tracking-[0.2em] text-white sm:text-4xl">NO CARRIER</p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-[#9dbbff] sm:text-[11px]">Plug into a port to get us back</p>
                </div>
              </div>

              <aside data-contact="rail" className="space-y-5 border-t border-white/10 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-1">
                <Clocks />
                <div>
                  <p className={RAIL_LABEL}>Office hours</p>
                  <p className="mt-1 text-[15px] text-white/90">{daysLong(site)}<br />{timeLong(site)} IST</p>
                </div>
                <div className="sm:hidden">
                  <p className={RAIL_LABEL}>Direct</p>
                  <p className="mt-1 space-y-0.5 text-[15px]">
                    <a href={phone.href} className="block text-white underline-offset-2 hover:underline">{phone.label}</a>
                    <a href={`mailto:${email}`} className="block text-white underline-offset-2 hover:underline">{email}</a>
                  </p>
                </div>
                <div>
                  <p className={RAIL_LABEL}>Find us</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {socials.map((s) => (
                      <li key={s.name}>
                        <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.name} className="blog-wipe flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dbbff]">
                          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]">{s.icon}</svg>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

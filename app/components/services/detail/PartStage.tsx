'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Icon from '../../Icon';
import { scrollToY } from '../../SmoothScroll';
import { useReveal } from '../../../context/RevealContext';
import { usePlayIntro } from '../../../context/usePlayIntro';
import { createChip, type ChipEngine } from '../chipEngine';
import { ALL_BLOCKS, BLOCKS, boardOf, centreOf, KIND, nameOf, STANDARD_SERVICES, type Block, type Board, type Holder } from '../floorplan';
import { cameraAt, fieldOfView, FOV, partKeys, ramp, smooth, smoother } from '../score';
import { refreshSoon } from './refresh';
import { splitAccent, type DetailService, type Words } from './types';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// In screens of scrolling: the words and the whole board, the camera arriving at the part, then down into it
const TOTAL = 2;
const AT_PART = 1.05;
// In seconds from the page opening: the board wakes, the lid lifts, and the part goes to work. Scrolling only ever brings this forward.
const STORY = 16;
const KICKER = 'inline-flex items-center gap-3 font-mono text-[10px] sm:text-[11px] tracking-[0.2em] sm:tracking-[0.3em] uppercase font-bold';
const PRIMARY = 'kinetic-cta-btn pointer-events-auto inline-flex items-center gap-2.5 rounded-xl bg-brand-blue px-5 py-3 font-mono text-[11px] sm:text-xs uppercase tracking-wider font-semibold text-white transition-colors duration-300 hover:bg-midnight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue';
const SECONDARY = 'pointer-events-auto inline-flex items-center gap-2.5 rounded-xl border border-midnight/15 bg-white px-5 py-3 font-mono text-[11px] sm:text-xs uppercase tracking-wider font-semibold text-midnight shadow-sm transition-colors duration-300 hover:border-brand-blue hover:text-brand-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue';

export type Fact = { label: string; value: number };

export function Title({ title, dark = false }: { title: string; dark?: boolean }) {
  const [plain, bright] = splitAccent(title);
  return (
    <h1 className={`heading-page ${dark ? 'text-white' : 'text-midnight'}`}>
      {plain && <span data-part="word" className="block">{plain}</span>}
      <span className="block"><span data-part="word" className={`${dark ? 'heading-accent-dark' : 'heading-accent'} heading-serif`}>{bright}</span></span>
    </h1>
  );
}

function Breadcrumb({ title, label }: { title: string; label: string }) {
  return (
    <nav aria-label="Breadcrumb" className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-midnight/60 [@media(max-height:480px)]:hidden">
      <Link href="/services" className="pointer-events-auto underline underline-offset-2 hover:text-brand-blue">{label}</Link>
      <span aria-hidden="true"> / </span>
      <span aria-current="page" className="text-midnight">{title}</span>
    </nav>
  );
}

function Facts({ facts }: { facts: Fact[] }) {
  if (!facts.length) return null;
  return (
    <dl data-part="in" className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-midnight/10 pt-3 sm:mt-6 sm:pt-4 [@media(max-height:720px)]:hidden">
      {facts.map((f) => (
        <div key={f.label} className="flex items-baseline gap-2">
          <dd className="font-display text-xl font-extrabold tabular-nums text-brand-blue sm:text-2xl">{f.value}</dd>
          <dt className="font-mono text-[10px] uppercase tracking-wider text-midnight/65 sm:text-[11px]">{f.label}</dt>
        </div>
      ))}
    </dl>
  );
}

type Props = {
  service: DetailService;
  block: Block;
  /** the other parts of the board that have a page to go to */
  others: { block: Block; slug: string }[];
  /** which service is on each part, and the names printed on them (from the admin) */
  board: Board<Holder>;
  formId: string;
  insideId: string;
  facts: Fact[];
  part: string;
  title: string;
  words: Words;
};

/** The opening of a service's page: its part lights up on the board and starts working, and scrolling flies down into it */
export default function PartStage({ service, block, others, board, formId, insideId, facts, part, title, words: say }: Props) {
  // the centre part carries the title of the service the admin put there
  const aiName = (board.at.get('ai') ?? STANDARD_SERVICES.find((s) => s.part === 'ai')!).title;
  const rootRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<gsap.core.Timeline | null>(null);
  const router = useRouter();
  const [still, setStill] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { isIntroReady } = useReveal();
  const playedRef = usePlayIntro(introRef);
  const readyRef = useRef(false);

  useEffect(() => {
    readyRef.current = isIntroReady;
  }, [isIntroReady]);

  const goTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY);
  };

  useGSAP(
    () => {
      const root = rootRef.current!;
      if (attempt > 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setStill(true);
        return;
      }
      const canvas = root.querySelector<HTMLCanvasElement>('[data-part="canvas"]')!;
      const engine: ChipEngine | null = createChip(canvas, () => setAttempt((n) => n + 1), () => setStill(true), aiName, board.names);
      if (!engine) {
        setStill(true);
        return;
      }

      // ---- Words ----
      const scrub = window.matchMedia('(pointer: fine)').matches ? true : 0.3;
      introRef.current = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-part="word"]', { y: 26, autoAlpha: 0, duration: 1, stagger: 0.1 }, 0.1)
        .from('[data-part="in"]', { y: 18, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.3);
      if (attempt > 0 || playedRef.current) introRef.current.progress(1);

      const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub } });
      tl.to({}, { duration: TOTAL }, 0);
      tl.to('[data-part="heroWrap"]', { y: -44, autoAlpha: 0, duration: 0.3, ease: 'sine.in' }, 0.22);
      tl.to('[data-part="callout"]', { autoAlpha: 0, duration: 0.14 }, 0.72);
      tl.fromTo('[data-part="entering"]', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.14, ease: 'sine.out' }, 0.98);
      tl.to('[data-part="entering"]', { autoAlpha: 0, duration: 0.12 }, 1.5);
      tl.to('[data-part="hud"]', { autoAlpha: 0, duration: 0.14 }, 1.56);
      tl.fromTo('[data-part="fade"]', { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'sine.in' }, 1.66);

      // ---- The page, measured ----
      let keys = partKeys(block, TOTAL);
      const wordsEl = root.querySelector<HTMLElement>('[data-part="heroWrap"] [data-card]')!;
      const stage = root.querySelector<HTMLElement>('[data-part="sticky"]')!;
      let top = 0;
      let run = 1;
      const [x0, , x1] = block.rect;
      const [cx, cz] = centreOf(block);
      const measure = () => {
        top = root.getBoundingClientRect().top + window.scrollY;
        run = Math.max(1, root.offsetHeight - window.innerHeight);
        // on a tall screen the board takes all the room left under the words, however much they've needed
        const tall = window.innerWidth / window.innerHeight <= 1.15;
        const y0 = Math.min(0.8, (wordsEl.offsetTop + wordsEl.offsetHeight + 14) / window.innerHeight);
        keys = partKeys(block, TOTAL, tall ? { sx: 0, sy: 1 - y0 - 0.985, fw: 1, fh: 0.985 - y0 } : undefined);
      };
      measure();
      document.fonts?.ready.then(measure);
      ScrollTrigger.addEventListener('refresh', measure);

      // ---- The visitor's hand ----
      const parts = [{ block, slug: service.slug }, ...others];
      const partAt = (p: [number, number] | null) => (p ? (parts.find(({ block: b }) => p[0] >= b.rect[0] && p[0] <= b.rect[2] && p[1] >= b.rect[1] && p[1] <= b.rect[3]) ?? null) : null);
      const onWords = (t: EventTarget | null) => !(t instanceof Element) || !stage.contains(t) || !!t.closest('a, button, input, [data-card]');
      const localPoint = (x: number, y: number) => {
        const r = canvas.getBoundingClientRect();
        return engine.onBoard(x - r.left, y - r.top);
      };
      let handX = -1;
      let handY = -1;
      let handLive = false;
      let handFade = 0;
      let handOnWords = false;
      let pressed = false;
      let pressX = 0;
      let pressY = 0;
      let dragX = 0;
      let moved = 0;
      let orbit = 0;
      let orbitGoal = 0;
      let clock = 0;
      let tapAt = -10;
      const tap: [number, number, number] = [0, 0, -1];
      const onDown = (e: PointerEvent) => {
        handX = e.clientX;
        handY = e.clientY;
        handLive = true;
        handOnWords = onWords(e.target);
        if (handOnWords) return;
        pressed = true;
        moved = 0;
        pressX = e.clientX;
        pressY = e.clientY;
        dragX = e.clientX;
      };
      const onMove = (e: PointerEvent) => {
        handX = e.clientX;
        handY = e.clientY;
        handLive = true;
        handOnWords = onWords(e.target);
        if (!pressed) return;
        moved = Math.max(moved, Math.abs(e.clientX - pressX), Math.abs(e.clientY - pressY));
        if (Math.abs(e.clientX - pressX) > Math.abs(e.clientY - pressY)) orbitGoal = Math.max(-60, Math.min(60, orbitGoal + (e.clientX - dragX) * 0.24));
        dragX = e.clientX;
      };
      const onUp = (e: PointerEvent) => {
        if (pressed && moved < 7 && window.scrollY < top + run * 0.6) {
          const point = localPoint(e.clientX, e.clientY);
          const part = partAt(point);
          if (part && part.block !== block) router.push(`/services/${part.slug}`);
          else if (point) {
            tap[0] = point[0];
            tap[1] = point[1];
            tapAt = clock;
          }
        }
        pressed = false;
        if (e.pointerType !== 'mouse') handLive = false;
      };
      const onCancel = () => {
        pressed = false;
        handLive = false;
      };
      window.addEventListener('pointerdown', onDown, { passive: true });
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerup', onUp, { passive: true });
      window.addEventListener('pointercancel', onCancel, { passive: true });

      // ---- Only runs while the stage is on screen ----
      let onScreen = true;
      const seen = new IntersectionObserver(([e]) => {
        onScreen = e.isIntersecting;
      });
      seen.observe(root);

      const tipEl = root.querySelector<HTMLElement>('[data-part="tip"]')!;
      const calloutEl = root.querySelector<HTMLElement>('[data-part="callout"]')!;
      const fieldEl = root.querySelector<HTMLElement>('[data-part="field"]')!;
      const on = new Float32Array(9);
      const prog = new Float32Array(9);
      const openGoal = new Float32Array(9);
      const open = new Float32Array(9);
      open[KIND.yours] = 1;
      openGoal[KIND.yours] = 1;
      const k = KIND[block.kind];
      const lean: [number, number] = [0, 0];
      const hand: [number, number, number] = [0, 0, 0];
      const uiPart = BLOCKS.find((b) => b.kind === 'ui')!;
      const [uiX, uiZ] = centreOf(uiPart);
      const arrow: [number, number] = [uiX, uiZ];
      const hover = { rect: block.rect as [number, number, number, number], kind: k, on: 0 };
      const link = { path: null, t: 0, alpha: 0 };
      let lastTime = gsap.ticker.time;
      let smoothed = -1;
      let shownTip = '';
      let shownCursor = '';
      let shownField = '';
      let openedAt = -1;

      const tick = (time: number) => {
        if (!onScreen || document.hidden) return;
        const dt = Math.min(0.25, Math.max(0.001, time - lastTime));
        lastTime = time;
        clock = time;
        const raw = Math.min(1, Math.max(0, (window.scrollY - top) / run)) * TOTAL;
        if (smoothed < 0) smoothed = raw;
        else smoothed += (raw - smoothed) * (1 - Math.exp(-dt * 8));
        const s = smoothed;
        // the screen has gone dark by here: nothing to draw until the visitor comes back up
        if (s >= TOTAL - 0.04) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        const aspect = w / h;

        // ---- The clock of the opening: after losing the graphics context, it doesn't play again ----
        if (openedAt < 0 && readyRef.current) openedAt = attempt > 0 ? time - STORY * 2 : time;
        const age = openedAt < 0 ? 0 : time - openedAt;
        const story = Math.max(age, (s / AT_PART) * STORY);
        const dive = smooth(s, AT_PART + 0.2, TOTAL);

        // ---- The lid, and what's under it ----
        openGoal[k] = story > 0.9 ? 1 : 0;
        const lidEase = 1 - Math.exp(-dt * 5.5);
        for (let i = 0; i < 9; i++) {
          const next = open[i] + (openGoal[i] - open[i]) * lidEase;
          open[i] = Math.abs(openGoal[i] - next) < 0.002 ? openGoal[i] : next;
        }
        on.fill(0);
        prog.fill(0);
        on[k] = smooth(story, 1, 2.2);
        // a timeline keeps playing round; everything else is built and then stays built
        prog[k] = block.kind === 'media' ? (Math.max(0, story - 1.2) / 14) % 1 : ramp(story, 1.2, 11);
        const web = block.kind === 'web' ? on[k] * smooth(prog[k], 0.02, 0.3) : 0;

        // ---- The camera ----
        const leanEase = 1 - Math.exp(-dt * 2.4);
        const nx = handLive && handX >= 0 && s < 1.2 ? (handX / w) * 2 - 1 : 0;
        const ny = handLive && handY >= 0 && s < 1.2 ? 1 - (handY / h) * 2 : 0;
        lean[0] += (nx - lean[0]) * leanEase;
        lean[1] += (ny - lean[1]) * leanEase;
        if (!pressed && Math.abs(raw - smoothed) > 0.004) orbitGoal *= Math.exp(-dt * 2.6);
        orbit += (orbitGoal - orbit) * (1 - Math.exp(-dt * 7));
        const cam = cameraAt(keys, s - (1 - smoother(ramp(age, 0, 2.8))), aspect, lean, 3, orbit + Math.sin(time * 0.13) * 2.4 * (1 - dive));

        // ---- The hand on the board ----
        const point = handLive && handX >= 0 && !handOnWords && s < 1.2 ? localPoint(handX, handY) : null;
        const under = partAt(point);
        handFade += ((point ? 1 : 0) - handFade) * (1 - Math.exp(-dt * 6));
        if (point) {
          hand[0] = point[0];
          hand[1] = point[1];
        }
        hand[2] = handFade;
        // the part this page is about is ringed until the camera is on it; a hand on another part takes the ring
        const offered = under && under.block !== block ? under : null;
        const hoverGoal = offered ? 1 : 0.9 * (1 - smooth(s, 0.5, 0.95));
        hover.on += (hoverGoal - hover.on) * (1 - Math.exp(-dt * 7));
        hover.rect = (offered ? offered.block.rect : block.rect) as [number, number, number, number];
        hover.kind = offered ? KIND[offered.block.kind] : k;
        const tipText = offered ? nameOf(offered.block, board.names) : '';
        if (tipText !== shownTip) {
          shownTip = tipText;
          tipEl.textContent = tipText;
          tipEl.style.opacity = tipText ? '1' : '0';
        }
        if (tipText) tipEl.style.transform = `translate3d(${handX + 16}px,${handY + 18}px,0)`;
        const cursor = offered ? 'pointer' : pressed && moved > 6 ? 'grabbing' : point ? 'grab' : '';
        if (cursor !== shownCursor) {
          shownCursor = cursor;
          stage.style.cursor = cursor;
        }
        // the parts that answer the hand directly
        if (block.kind === 'media' && under?.block === block && point) prog[k] = Math.max(0, Math.min(1, (point[0] - x0) / (x1 - x0)));
        const overUi = block.kind === 'ui' && under?.block === block && point;
        const wantX = overUi ? point[0] : uiX + Math.sin(time * 0.53) * 0.18 + Math.sin(time * 1.3) * 0.03;
        const wantZ = overUi ? point[1] : uiZ + Math.cos(time * 0.41) * 0.14;
        const arrowEase = 1 - Math.exp(-dt * (overUi ? 14 : 2.2));
        arrow[0] += (wantX - arrow[0]) * arrowEase;
        arrow[1] += (wantZ - arrow[1]) * arrowEase;
        tap[2] = time - tapAt;

        engine.frame({
          time,
          dt,
          cam,
          boot: ramp(age, 0.05, 1.7) * 2.5,
          open,
          on,
          prog,
          hand,
          arrow,
          tap,
          hover,
          ai: [0, 0, 0.86, 1],
          form: 0,
          net: block.kind === 'ai' ? smooth(story, 13.5, 15.5) * (1 - smooth(s, AT_PART + 0.25, AT_PART + 0.5)) : 0,
          web,
          learn: block.kind === 'ai' ? [smooth(story, 3.4, 5.4), ramp(story, 4.6, 14)] : [0, 0],
          link,
          quiet: on[k],
          room: 1 - 0.7 * dive,
        });

        // ---- The name on the part, and how close the camera is ----
        if (s < 0.95) {
          const [px, py] = engine.project(cx, 0.06, cz);
          calloutEl.style.transform = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0)`;
        }
        const fieldText = fieldOfView(2 * cam.dist * aspect * Math.tan(FOV / 2));
        if (fieldText !== shownField) {
          shownField = fieldText;
          fieldEl.textContent = fieldText;
        }
      };
      gsap.ticker.add(tick);

      const ro = new ResizeObserver(() => {
        engine.resize();
        refreshSoon();
      });
      ro.observe(canvas);

      return () => {
        gsap.ticker.remove(tick);
        ScrollTrigger.removeEventListener('refresh', measure);
        window.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        seen.disconnect();
        ro.disconnect();
        engine.destroy();
      };
    },
    { scope: rootRef, dependencies: [attempt], revertOnUpdate: true },
  );

  const words = (
    <>
      <Breadcrumb title={service.title} label={say('breadcrumb')} />
      <p data-part="in" className={`${KICKER} mt-3 mb-2.5 text-brand-blue sm:mt-4 sm:mb-3`}>
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current animate-pulse" />
        {say('hero_kicker')}
      </p>
      <Title title={title} />
      {service.short && <p data-part="in" className="mt-3 max-w-xl text-[15px] leading-relaxed text-midnight/85 sm:mt-4 sm:text-lg [@media(max-height:560px)]:hidden [@media(max-height:680px)_and_(orientation:portrait)]:hidden">{service.short}</p>}
      <div data-part="in" className="mt-4 flex flex-wrap gap-2 sm:mt-6">
        <button type="button" onClick={() => goTo(formId)} className={PRIMARY}>{say('cta_primary')} <Icon name="north_east" className="text-[15px]" /></button>
        <button type="button" onClick={() => goTo(insideId)} className={SECONDARY}>{say('cta_secondary')} <Icon name="south" className="text-[15px]" /></button>
      </div>
      <Facts facts={facts} />
    </>
  );

  // ---- Animations off, or no way to draw the board: a sharp picture of the part, and the same words ----
  if (still) {
    return (
      <div ref={rootRef} className="relative bg-white pt-[calc(var(--header-h)+1.5rem)] pb-12">
        <div className="mx-auto grid max-w-[1520px] gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>{words}</div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-canvas">
            <Image src={`/services/chip/${block.id}.jpg`} alt={`${part} on the INTA board`} fill sizes="(min-width: 1024px) 50vw, 100vw" quality={90} className="object-contain" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative touch-pan-y bg-white" style={{ height: `${(TOTAL + 1) * 100}svh` }}>
      <div data-part="sticky" className="sticky top-0 h-svh overflow-hidden">
        {/* hidden until the board's first frame is drawn: an opaque WebGL canvas is black until then */}
        <canvas key={attempt} data-part="canvas" aria-hidden="true" className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-500 data-[drawn]:opacity-100" />

        {/* ---- The name on the part ---- */}
        <div data-part="callout" aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-10">
          <span className="absolute -left-1.5 -top-1.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7fa6ff] opacity-80" />
            <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-brand-blue" />
          </span>
          <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-midnight px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">{part}</span>
          <span className="absolute -top-3 left-1/2 h-1.5 w-px -translate-x-1/2 bg-midnight" />
        </div>

        {/* ---- What this part is ---- */}
        <div data-part="heroWrap" className="pointer-events-none absolute inset-x-0 top-0 z-10 pt-[calc(var(--header-h)+1rem)] [@media(min-aspect-ratio:23/20)]:inset-y-0 [@media(min-aspect-ratio:23/20)]:flex [@media(min-aspect-ratio:23/20)]:items-center [@media(min-aspect-ratio:23/20)]:pt-[var(--header-h)]">
          <div className="mx-auto w-full max-w-[1520px] px-4 sm:px-6">
            <div data-card className="pointer-events-auto max-w-[46rem] [@media(min-aspect-ratio:23/20)]:max-w-[min(42rem,46vw)]">{words}</div>
          </div>
        </div>

        <p data-part="entering" className={`${KICKER} invisible absolute inset-x-0 bottom-[12svh] z-10 justify-center text-midnight`}>
          <span className="rounded-full bg-white px-4 py-2 shadow-lg">{say('diving')}</span>
        </p>

        <dl data-part="hud" aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 z-10 hidden rounded-xl bg-white/90 px-3 py-2 font-mono text-[10px] uppercase tracking-wider shadow-md sm:left-6 sm:bottom-5 sm:block [@media(max-height:480px)]:hidden">
          <div className="flex gap-3"><dt className="w-[8.5em] text-midnight/65">{say('hud_target')}</dt><dd className="font-bold text-brand-blue">{part}</dd></div>
          <div className="flex gap-3"><dt className="w-[8.5em] text-midnight/65">{say('hud_field')}</dt><dd data-part="field" className="font-bold tabular-nums text-midnight">-</dd></div>
        </dl>

        <div data-part="fade" aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 bg-midnight opacity-0" />
        <div data-part="tip" aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-30 rounded-md bg-midnight px-2 py-1 font-mono text-[10px] uppercase tracking-wider font-bold text-white opacity-0 transition-opacity duration-200" />
      </div>
    </div>
  );
}

/** Which part of the board a service is on, if any (as the admin set it), and the other parts that have a page to go to.
 * If the list of services couldn't be loaded, the parts keep the services they always had and nothing links onwards. */
export function partsFor(slug: string, related: Holder[]) {
  const board = boardOf<Holder>(related.length ? related : STANDARD_SERVICES);
  const block = ALL_BLOCKS.find((b) => board.at.get(b.kind)?.slug === slug) ?? null;
  const others = related.length
    ? ALL_BLOCKS.flatMap((b) => {
        const s = board.at.get(b.kind);
        return s && s.slug !== slug ? [{ block: b, slug: s.slug }] : [];
      })
    : [];
  return { block, others, board };
}

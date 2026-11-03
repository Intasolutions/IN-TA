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
import { createChip, type ChipEngine } from '../chipEngine';
import { AI_SLUG, ALL_BLOCKS, BLOCKS, centreOf, KIND, type Block } from '../floorplan';
import { cameraAt, partKeys, ramp, smooth, smoother } from '../score';
import { splitAccent, type DetailService } from './types';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// In screens of scrolling: the opening words, then the part on its own until the page slides over it
const TOTAL = 1.2;
// In seconds from the page opening: the board wakes, the lid lifts, and the part goes to work. Scrolling only ever brings this forward.
const STORY = 16;
const KICKER = 'inline-flex items-center gap-3 font-mono text-[10px] sm:text-[11px] tracking-[0.2em] sm:tracking-[0.3em] uppercase font-bold text-brand-blue';
const CARD = 'pointer-events-auto rounded-3xl border border-brand-blue/20 bg-white p-5 sm:p-7 shadow-xl shadow-brand-blue/10';

export function Title({ title }: { title: string }) {
  const [plain, bright] = splitAccent(title);
  return (
    <h1 className="heading-page text-midnight">
      {plain && <span data-part="word" className="block">{plain}</span>}
      <span className="block"><span data-part="word" className="heading-accent heading-serif">{bright}</span></span>
    </h1>
  );
}

function Breadcrumb({ title }: { title: string }) {
  return (
    <nav aria-label="Breadcrumb" className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-midnight/60">
      <Link href="/services" className="underline underline-offset-2 hover:text-brand-blue">Services</Link>
      <span aria-hidden="true"> / </span>
      <span aria-current="page" className="text-midnight">{title}</span>
    </nav>
  );
}

type Props = {
  service: DetailService;
  block: Block;
  /** the other parts of the board that have a page to go to */
  others: { block: Block; slug: string }[];
  formId: string;
};

/** The opening of a service's page: its own part on the board, which lifts its lid and starts working as soon as the page opens */
export default function PartStage({ service, block, others, formId }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<gsap.core.Timeline | null>(null);
  const router = useRouter();
  const [still, setStill] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { isIntroReady } = useReveal();
  const readyRef = useRef(false);

  useEffect(() => {
    readyRef.current = isIntroReady;
    if (isIntroReady) introRef.current?.restart();
  }, [isIntroReady]);

  const toForm = () => {
    const form = document.getElementById(formId);
    if (form) scrollToY(form.getBoundingClientRect().top + window.scrollY - 90);
  };

  useGSAP(
    () => {
      const root = rootRef.current!;
      if (attempt > 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setStill(true);
        return;
      }
      const canvas = root.querySelector<HTMLCanvasElement>('[data-part="canvas"]')!;
      const engine: ChipEngine | null = createChip(canvas, () => setAttempt((n) => n + 1), () => setStill(true));
      if (!engine) {
        setStill(true);
        return;
      }

      // ---- Words ----
      const scrub = window.matchMedia('(pointer: fine)').matches ? true : 0.3;
      introRef.current = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-part="hero"]', { y: 22, autoAlpha: 0, duration: 0.9 }, 0.05)
        .from('[data-part="word"]', { y: 22, autoAlpha: 0, duration: 1, stagger: 0.1 }, 0.15);
      if (attempt > 0) introRef.current.progress(1);

      const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub } });
      tl.to({}, { duration: TOTAL }, 0);
      tl.to('[data-part="heroWrap"]', { y: -36, autoAlpha: 0, duration: 0.22, ease: 'sine.in' }, 0.56);

      // ---- The page, measured ----
      const keys = partKeys(block, TOTAL);
      const stage = root.querySelector<HTMLElement>('[data-part="sticky"]')!;
      let top = 0;
      let run = 1;
      const [x0, , x1] = block.rect;
      const measure = () => {
        top = root.getBoundingClientRect().top + window.scrollY;
        run = Math.max(1, root.offsetHeight - window.innerHeight);
      };
      measure();
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
        if (pressed && moved < 7 && window.scrollY < top + run) {
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
      const on = new Float32Array(9);
      const prog = new Float32Array(9);
      const openGoal = new Float32Array(9);
      const open = new Float32Array(9);
      open[KIND.yours] = 1;
      const k = KIND[block.kind];
      if (block.kind === 'yours') openGoal[k] = 1;
      const lean: [number, number] = [0, 0];
      const hand: [number, number, number] = [0, 0, 0];
      const uiPart = BLOCKS.find((b) => b.kind === 'ui')!;
      const [uiX, uiZ] = centreOf(uiPart);
      const arrow: [number, number] = [uiX, uiZ];
      const hover = { rect: [0, 0, 0, 0] as [number, number, number, number], kind: -1, on: 0 };
      const link = { path: null, t: 0, alpha: 0 };
      let lastTime = gsap.ticker.time;
      let smoothed = -1;
      let shownTip = '';
      let shownCursor = '';
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
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        const aspect = w / h;

        // ---- The clock of the opening: after losing the graphics context, it doesn't play again ----
        if (openedAt < 0 && readyRef.current) openedAt = attempt > 0 ? time - STORY * 2 : time;
        const age = openedAt < 0 ? 0 : time - openedAt;
        const story = Math.max(age, (s / TOTAL) * STORY);

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
        const nx = handLive && handX >= 0 ? (handX / w) * 2 - 1 : 0;
        const ny = handLive && handY >= 0 ? 1 - (handY / h) * 2 : 0;
        lean[0] += (nx - lean[0]) * leanEase;
        lean[1] += (ny - lean[1]) * leanEase;
        if (!pressed && Math.abs(raw - smoothed) > 0.004) orbitGoal *= Math.exp(-dt * 2.6);
        orbit += (orbitGoal - orbit) * (1 - Math.exp(-dt * 7));
        const cam = cameraAt(keys, s - (1 - smoother(ramp(age, 0, 2.8))), aspect, lean, 3, orbit + Math.sin(time * 0.13) * 2.4);

        // ---- The hand on the board ----
        const point = handLive && handX >= 0 && !handOnWords ? localPoint(handX, handY) : null;
        const under = partAt(point);
        handFade += ((point ? 1 : 0) - handFade) * (1 - Math.exp(-dt * 6));
        if (point) {
          hand[0] = point[0];
          hand[1] = point[1];
        }
        hand[2] = handFade;
        const offered = under && under.block !== block ? under : null;
        hover.on += ((offered ? 1 : 0) - hover.on) * (1 - Math.exp(-dt * 9));
        if (offered) {
          hover.rect = offered.block.rect;
          hover.kind = KIND[offered.block.kind];
        }
        const tipText = offered ? offered.block.short : '';
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
          net: block.kind === 'ai' ? smooth(story, 13.5, 15.5) : 0,
          web,
          learn: block.kind === 'ai' ? [smooth(story, 3.4, 5.4), ramp(story, 4.6, 14)] : [0, 0],
          link,
          quiet: on[k],
          room: 1,
        });
      };
      gsap.ticker.add(tick);

      const ro = new ResizeObserver(() => {
        engine.resize();
        ScrollTrigger.refresh();
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

  const buttons = (
    <div className="mt-4 sm:mt-6 flex flex-wrap gap-2">
      <button type="button" onClick={toForm} className="kinetic-cta-btn pointer-events-auto inline-flex items-center gap-2.5 rounded-xl bg-brand-blue px-5 py-3 font-mono text-[11px] sm:text-xs uppercase tracking-wider font-semibold text-white transition-colors duration-300 hover:bg-midnight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
        Start this project <Icon name="north_east" className="text-[15px]" />
      </button>
    </div>
  );

  // ---- Animations off, or no way to draw the board: a sharp picture of the part, and the same words ----
  if (still) {
    return (
      <div ref={rootRef} className="relative bg-white pt-[calc(var(--header-h)+1.5rem)] pb-12">
        <div className="mx-auto grid max-w-[1520px] gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <Breadcrumb title={service.title} />
            <p className={`${KICKER} mt-4 mb-3`}>{block.part} {'//'} Our service</p>
            <Title title={service.title} />
            <p className="mt-4 text-[15px] sm:text-lg leading-relaxed text-midnight/85">{service.short}</p>
            {buttons}
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-canvas">
            <Image src={`/services/chip/${block.id}.jpg`} alt={`${block.part} on the INTA board`} fill sizes="(min-width: 1024px) 50vw, 100vw" quality={90} className="object-contain" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative touch-pan-y bg-white" style={{ height: `${(TOTAL + 1) * 100}svh` }}>
      <div data-part="sticky" className="sticky top-0 h-svh overflow-hidden">
        <canvas key={attempt} data-part="canvas" aria-hidden="true" className="absolute inset-0 h-full w-full" />

        {/* ---- Opening: what this part is ---- */}
        <div data-part="heroWrap" className={`pointer-events-none absolute inset-x-0 bottom-[max(1rem,2.5svh)] [@media(min-aspect-ratio:23/20)]:inset-y-0 [@media(min-aspect-ratio:23/20)]:bottom-0 [@media(min-aspect-ratio:23/20)]:flex [@media(min-aspect-ratio:23/20)]:items-center [@media(min-aspect-ratio:23/20)]:pt-[var(--header-h)]`}>
          <div className="mx-auto w-full max-w-[1520px] px-3 sm:px-6">
            <div data-card data-part="hero" className={`${CARD} max-w-[46rem] [@media(min-aspect-ratio:23/20)]:max-w-[min(46rem,48vw)]`}>
              <Breadcrumb title={service.title} />
              <p className={`${KICKER} mt-3 mb-2.5 sm:mt-4 sm:mb-3`}>
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current animate-pulse" />
                {block.part} {'//'} Our service
              </p>
              <Title title={service.title} />
              {service.short && <p className="mt-3 sm:mt-4 text-[15px] sm:text-lg leading-relaxed text-midnight/85 [@media(max-height:560px)]:hidden">{service.short}</p>}
              {buttons}
            </div>
          </div>
        </div>

        <div data-part="tip" aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-30 rounded-md bg-midnight px-2 py-1 font-mono text-[10px] uppercase tracking-wider font-bold text-white opacity-0 transition-opacity duration-200" />
      </div>
    </div>
  );
}

export const slugOf = (b: Block) => (b.kind === 'ai' ? AI_SLUG : b.service?.slug);

/** Which part of the board a service is, if it has one, and the parts around it that have a page */
export function partsFor(slug: string, known: { slug: string }[]) {
  const block = ALL_BLOCKS.find((b) => slugOf(b) === slug) ?? null;
  const has = new Set(known.map((k) => k.slug));
  const others = ALL_BLOCKS.flatMap((b) => {
    const s = slugOf(b);
    return s && s !== slug && has.has(s) ? [{ block: b, slug: s }] : [];
  });
  return { block, others };
}

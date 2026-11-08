'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Icon from '../../Icon';
import { scrollToY } from '../../SmoothScroll';
import { smoother } from '../score';
import type { DieEngine, DieLayout } from './dieEngine';
import { refreshSoon } from './refresh';
import { optimisable, plainTitle, splitAccent } from './types';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export type DieItem = { id: number; title: string; description: string; points: string[]; image: string | null };

const ramp = (x: number, a: number, b: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));
const isWide = (w: number, h: number) => w / h > 1.15;
const number = (i: number) => String(i + 1).padStart(2, '0');

type Cam = { x: number; y: number; perPixel: number };

/** The camera that puts this rectangle of the die inside this part of the screen */
function aim(r: [number, number, number, number], W: number, H: number, free: [number, number, number, number], fill: number): Cam {
  const [fx0, fy0, fx1, fy1] = free;
  const fw = (fx1 - fx0) * W;
  const fh = (fy1 - fy0) * H;
  const perPixel = Math.max((r[2] - r[0]) / (fw * fill), (r[3] - r[1]) / (fh * fill));
  return {
    x: (r[0] + r[2]) / 2 - ((fx0 + fx1) / 2 - 0.5) * W * perPixel,
    y: (r[1] + r[3]) / 2 - ((fy0 + fy1) / 2 - 0.5) * H * perPixel,
    perPixel,
  };
}

type Props = {
  id: string;
  kicker: string;
  title: string;
  skipLabel: string;
  /** the part this is the inside of */
  part: string;
  items: DieItem[];
  seed: string;
  nextId: string;
};

/**
 * What we do, as the part's own silicon. The die stays on screen while the blocks of text scroll past it, and the camera
 * flies to the block being read. Scrolling back flies back, and the list at the top lets anyone go straight to a block.
 */
export default function DieScene({ id, kicker, title, skipLabel, part, items, seed, nextId }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const [plain, setPlain] = useState(false);
  const count = Math.min(items.length, 8);
  const [titlePlain, titleBright] = splitAccent(title);

  const goTo = (target: string) => {
    const el = document.getElementById(target);
    if (!el) return;
    const r = el.getBoundingClientRect();
    scrollToY(r.top + window.scrollY - Math.max(0, (window.innerHeight - r.height) / 2));
  };

  useGSAP(
    () => {
      const root = rootRef.current!;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const scrub = window.matchMedia('(pointer: fine)').matches ? true : 0.3;

      // ---- The blocks of text come and go with the scroll ----
      if (!reduced) {
        gsap.utils.toArray<HTMLElement>('[data-die="card"]', root).forEach((card) => {
          gsap
            .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: card, start: 'top 96%', end: 'bottom 4%', scrub } })
            .fromTo(card, { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.24 })
            .to(card, { y: 0, duration: 0.5 })
            .to(card, { y: -46, autoAlpha: 0, duration: 0.26 });
          // its points, if the service lists any
          const points = card.querySelectorAll('[data-die="point"]');
          if (points.length) gsap.fromTo(points, { x: -14, autoAlpha: 0 }, { x: 0, autoAlpha: 1, stagger: 0.12, ease: 'sine.out', scrollTrigger: { trigger: card, start: 'top 90%', end: 'top 64%', scrub } });
        });
      }
      if (reduced) {
        setPlain(true);
        return;
      }

      const canvas = root.querySelector<HTMLCanvasElement>('[data-die="canvas"]')!;
      const stage = root.querySelector<HTMLElement>('[data-die="stage"]')!;
      const over = root.querySelector<HTMLElement>('[data-die="over"]')!;
      const labels = gsap.utils.toArray<HTMLElement>('[data-die="label"]', root);
      const titleWidths0 = items.slice(0, count).map((item) => item.title.length * 7.4 + 62);
      const skip = root.querySelector<HTMLElement>('[data-die="skip"]')!;

      // ---- The die itself is only built when this part of the page is nearly on screen ----
      let engine: DieEngine | null = null;
      let plan: ((count: number, wide: boolean, name: string) => DieLayout) | null = null;
      let layout: DieLayout | null = null;
      let wide = false;
      let cleaned = false;
      const fail = () => {
        cleaned = true;
        setPlain(true);
      };

      // ---- The page, measured ----
      let W = 1;
      let H = 1;
      let top = 0;
      let anchors: number[] = [];
      let cams: Cam[] = [];
      const titleWidths = titleWidths0;
      const measure = () => {
        if (!engine || !plan) return;
        W = canvas.clientWidth;
        H = canvas.clientHeight;
        const nowWide = isWide(W, H);
        if (nowWide !== wide || !layout) {
          wide = nowWide;
          layout = plan(count, wide, seed);
          engine.setLayout(layout);
        }
        engine.resize();
        const y = (el: Element) => {
          const r = el.getBoundingClientRect();
          return r.top + window.scrollY + r.height / 2;
        };
        top = root.getBoundingClientRect().top + window.scrollY;
        const intro = root.querySelector<HTMLElement>('[data-die="intro"]')!;
        const outro = root.querySelector('[data-die="outro"]')!;
        const cards = gsap.utils.toArray<HTMLElement>('[data-die="slot"]', root);
        anchors = [y(intro), ...cards.map(y), y(outro)];
        // on a tall screen the whole die sits under the list, however much room the list has taken
        const list = root.querySelector<HTMLElement>('[data-die="list"]')!;
        const below = (list.offsetTop + list.offsetHeight - (intro.offsetHeight - H) / 2) / H;
        const under = Math.min(0.66, Math.max(0.3, below + 0.015));
        const whole = aim(layout.die, W, H, wide ? [0.44, 0.1, 0.98, 0.92] : [0.03, under, 0.97, 0.97], 0.94);
        const end = aim(layout.die, W, H, wide ? [0.14, 0.08, 0.86, 0.92] : [0.03, 0.14, 0.97, 0.86], 0.92);
        // (a short landscape screen gives the words more of its width)
        const focus: [number, number, number, number] = wide ? (H <= 480 ? [0.66, 0.08, 0.98, 0.92] : [0.5, 0.14, 0.97, 0.88]) : [0.04, 0.05, 0.96, 0.4];
        // (the die has room for eight blocks: if there are more things to say, they share)
        cams = [whole, ...cards.map((_, i) => aim(layout!.blocks[i % count], W, H, focus, 0.92)), end];
      };
      ScrollTrigger.addEventListener('refresh', measure);
      const ro = new ResizeObserver(refreshSoon);
      ro.observe(root);

      let booted = false;
      const boot = () => {
        if (booted) return;
        booted = true;
        import('./dieEngine').then((mod) => {
          if (cleaned) return;
          plan = mod.planDie;
          wide = isWide(canvas.clientWidth, canvas.clientHeight);
          layout = plan(count, wide, seed);
          engine = mod.createDie(canvas, layout, fail);
          if (!engine) {
            fail();
            return;
          }
          measure();
        });
      };

      // ---- A hand on the list, or on a name on the die, lights that block ----
      let handOn = -1;
      const enter = (e: Event) => {
        const i = (e.target as Element).closest?.('[data-die-index]')?.getAttribute('data-die-index');
        if (i != null) handOn = Number(i);
      };
      const leave = (e: Event) => {
        if ((e.target as Element).closest?.('[data-die-index]')) handOn = -1;
      };
      root.addEventListener('pointerover', enter);
      root.addEventListener('pointerout', leave);

      let inView = false;
      const seen = new IntersectionObserver(([e]) => {
        inView = e.isIntersecting;
      });
      seen.observe(root);
      const nearly = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) boot();
      }, { rootMargin: '120% 0px' });
      nearly.observe(root);

      const on = new Float32Array(8);
      const shown = labels.map(() => '');
      let shownFade = -1;
      let shownSkip = '';
      let power = 0;
      let last = gsap.ticker.time;
      let smooth = -1;

      const lightAt = (key: number, i: number) => (key === 0 || key === anchors.length - 1 ? 0.58 : (key - 1) % count === i ? 1 : 0.1);

      const tick = (time: number) => {
        if (!inView || document.hidden || !engine || !layout || cleaned || !anchors.length) return;
        const dt = Math.min(0.25, Math.max(0.001, time - last));
        last = time;
        const raw = window.scrollY + H / 2;
        if (smooth < 0) smooth = raw;
        else smooth += (raw - smooth) * (1 - Math.exp(-dt * 9));
        const pos = smooth;

        // which two moments the scroll is between: it rests on each one, and flies between them
        let a = 0;
        while (a < anchors.length - 2 && pos >= anchors[a + 1]) a += 1;
        const b = a + 1;
        const t = ramp(pos, anchors[a], anchors[b]);
        const k = smoother(ramp(t, 0.2, 0.8));
        const from = cams[a];
        const to = cams[b];
        const hop = 1 + 0.5 * Math.sin(Math.PI * k) * (a > 0 && b < anchors.length - 1 ? 1 : 0);
        const perPixel = Math.exp(Math.log(from.perPixel) + (Math.log(to.perPixel) - Math.log(from.perPixel)) * k) * hop;
        const x = from.x + (to.x - from.x) * k + Math.sin(time * 0.23) * perPixel * 7;
        const y = from.y + (to.y - from.y) * k + Math.cos(time * 0.19) * perPixel * 5;

        layout.blocks.forEach((_, i) => {
          const scrolled = lightAt(a, i) + (lightAt(b, i) - lightAt(a, i)) * k;
          on[i] = handOn === i ? 1 : handOn >= 0 ? Math.min(scrolled, 0.3) : scrolled;
        });

        // the power comes on as this part of the page arrives
        const goal = window.scrollY > top - H * 0.55 ? 1 : 0;
        power += (goal - power) * (1 - Math.exp(-dt * 1.5));

        // ---- The next section takes over at the end, and once the die has gone there's nothing to draw ----
        const fade = 1 - ramp(pos, anchors[anchors.length - 1], anchors[anchors.length - 1] + H * 0.42);
        if (Math.abs(fade - shownFade) > 0.004) {
          shownFade = fade;
          stage.style.opacity = fade.toFixed(3);
          over.style.opacity = fade.toFixed(3);
        }
        if (fade <= 0) return;
        engine.frame({ time, x, y, perPixel, on, power });

        const skipState = pos > anchors[0] + H * 0.25 && pos < anchors[anchors.length - 1] ? 'on' : 'off';
        if (skipState !== shownSkip) {
          shownSkip = skipState;
          skip.style.opacity = skipState === 'on' ? '1' : '0';
          skip.style.pointerEvents = skipState === 'on' ? 'auto' : 'none';
        }

        // ---- The names stay on their blocks ----
        labels.forEach((el, i) => {
          const r = layout!.blocks[i];
          if (!r) return;
          const sx = (r[0] - x) / perPixel + W / 2;
          const sy = (r[1] - y) / perPixel + H / 2;
          const width = (r[2] - r[0]) / perPixel;
          const inFrame = sx < W && sy < H && sx + width > 0 && sy + (r[3] - r[1]) / perPixel > 0;
          const mode = !inFrame || on[i] < 0.2 || power < 0.5 ? 'off' : width > titleWidths[i] ? 'full' : 'short';
          if (mode !== 'off') el.style.transform = `translate3d(${(sx + 9).toFixed(1)}px,${(sy + 9).toFixed(1)}px,0)`;
          if (mode !== shown[i]) {
            shown[i] = mode;
            el.dataset.mode = mode;
          }
        });
      };
      gsap.ticker.add(tick);

      return () => {
        cleaned = true;
        gsap.ticker.remove(tick);
        ScrollTrigger.removeEventListener('refresh', measure);
        ro.disconnect();
        seen.disconnect();
        nearly.disconnect();
        root.removeEventListener('pointerover', enter);
        root.removeEventListener('pointerout', leave);
        engine?.destroy();
      };
    },
    { scope: rootRef, revertOnUpdate: true, dependencies: [count, seed] },
  );

  return (
    <section ref={rootRef} id={id} aria-label={plainTitle(title)} className="relative bg-midnight text-white">
      {!plain && (
        <div data-die="stage" className="pointer-events-none sticky top-0 z-0 -mb-[100svh] h-svh overflow-hidden">
          {/* hidden until its first frame is drawn: an opaque WebGL canvas is black until then */}
          <canvas data-die="canvas" aria-hidden="true" className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-500 data-[drawn]:opacity-100" />
        </div>
      )}
      {/* The names on the blocks and the way out sit above the words, so that a hand can reach them */}
      {!plain && (
        <div data-die="over" className="pointer-events-none sticky top-0 z-20 -mb-[100svh] h-svh overflow-hidden">
          {items.slice(0, count).map((item, i) => (
            <a
              key={item.id}
              href={`#block-${item.id}`}
              tabIndex={-1}
              aria-hidden="true"
              data-die="label"
              data-mode="off"
              data-die-index={i}
              onClick={(e) => {
                e.preventDefault();
                goTo(`block-${item.id}`);
              }}
              className="group pointer-events-auto absolute left-0 top-0 inline-flex items-center gap-2 rounded-md border border-white/20 bg-midnight/85 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white transition-opacity duration-300 hover:border-[#9dbbff] data-[mode=off]:pointer-events-none data-[mode=off]:opacity-0"
            >
              <span className="text-[#9dbbff]">{number(i)}</span>
              <span className="whitespace-nowrap group-data-[mode=short]:hidden">{item.title}</span>
            </a>
          ))}
          <button
            type="button"
            data-die="skip"
            onClick={() => goTo(nextId)}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-midnight/85 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white opacity-0 transition-[opacity,border-color] duration-300 hover:border-[#9dbbff] focus-visible:outline-2 focus-visible:outline-[#9dbbff] lg:right-14"
          >
            {skipLabel} <Icon name="south" className="text-[13px]" />
          </button>
        </div>
      )}

      {/* The words sit above the die, but only they stop the hand from reaching it */}
      <div className="pointer-events-none relative z-10">
        {/* ---- The whole die, and a list of what's on it ---- */}
        <div data-die="intro" className={`mx-auto flex w-full max-w-[1520px] flex-col px-4 sm:px-6 ${plain ? 'pt-12 pb-4 sm:pt-20' : 'min-h-svh pb-[40svh] pt-14 [@media(min-aspect-ratio:23/20)]:justify-center [@media(min-aspect-ratio:23/20)]:pb-14'}`}>
          <div data-die="list" className="pointer-events-auto [@media(min-aspect-ratio:23/20)]:max-w-[40%]">
            <p className="inline-flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9dbbff] sm:text-[11px] sm:tracking-[0.3em]">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-current" />
              {kicker}
            </p>
            <h2 className="heading-section mt-2.5 text-white">{titlePlain} <span className="heading-accent-dark">{titleBright}</span></h2>
            <ol className="mt-4 divide-y divide-white/10 border-y border-white/10 sm:mt-6">
              {items.map((item, i) => (
                <li key={item.id} data-die-index={i % count}>
                  <a
                    href={`#block-${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      goTo(`block-${item.id}`);
                    }}
                    className="group flex items-center gap-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-white/80 transition-colors duration-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dbbff] sm:py-2.5 sm:text-xs"
                  >
                    <span className="text-[#9dbbff]">{number(i)}</span>
                    <span className="flex-1">{item.title}</span>
                    <Icon name="east" className="text-[15px] text-[#9dbbff] transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* ---- One block at a time ---- */}
        {items.map((item, i) => {
          const [first, last] = splitAccent(item.title);
          return (
            <div key={item.id} id={`block-${item.id}`} data-die="slot" className={`mx-auto flex w-full max-w-[1520px] px-3 sm:px-6 ${plain ? 'py-2.5' : 'min-h-[74svh] items-end pb-[4svh] [@media(min-aspect-ratio:23/20)]:items-center [@media(min-aspect-ratio:23/20)]:pb-0'}`}>
              <article data-die="card" className={`pointer-events-auto w-full rounded-3xl border border-white/12 bg-[#040c38]/95 p-5 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)] sm:p-8 [@media(max-height:480px)]:p-4! ${plain ? '' : '[@media(min-aspect-ratio:23/20)_and_(min-height:481px)]:max-w-[44%] [@media(min-aspect-ratio:23/20)_and_(max-height:480px)]:max-w-[62%]'}`}>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9dbbff] sm:text-[11px]">
                  {number(i)} <span className="text-white/45">/ {number(items.length - 1)}</span> <span className="text-white/45">{'//'} {part}</span>
                </p>
                <h3 className="heading-section mt-2 text-white">
                  {first && <>{first} </>}<span className="heading-accent-dark">{last}</span>
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-white/85 sm:text-lg">{item.description}</p>
                {item.points.length > 0 && (
                  <ul className="mt-3.5 grid gap-1.5 sm:mt-5 sm:gap-2">
                    {item.points.slice(0, 5).map((point) => (
                      <li key={point} data-die="point" className="flex items-start gap-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-white sm:text-xs">
                        <span aria-hidden="true" className="mt-1 h-2 w-3 shrink-0 rounded-[2px] bg-[#5b8cff] shadow-[0_0_10px_1px_rgb(91_140_255/0.7)]" />
                        {point}
                      </li>
                    ))}
                  </ul>
                )}
                {item.image && (
                  <span className="relative mt-4 block aspect-[16/9] overflow-hidden rounded-xl border border-white/12 bg-midnight max-sm:hidden [@media(max-height:760px)]:hidden">
                    <Image src={item.image} alt="" fill sizes="(min-width: 1024px) 40vw, 90vw" quality={90} unoptimized={!optimisable(item.image)} className="object-contain" />
                  </span>
                )}
              </article>
            </div>
          );
        })}

        {/* ---- Back out to the whole die, every block lit ---- */}
        <div data-die="outro" className={plain ? 'h-8' : 'min-h-[56svh]'} />
      </div>
    </section>
  );
}

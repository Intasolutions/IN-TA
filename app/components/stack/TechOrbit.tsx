'use client';

import { useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useSite, useText } from '../../site/SiteContext';
import { accent, type StackGroup } from '../../site/site';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const TONES = {
  light: {
    kicker: 'text-brand-blue',
    dot: 'bg-brand-blue',
    title: 'text-midnight',
    gradient: 'bg-linear-to-r from-brand-blue via-[#2563eb] to-[#3b7bf7] bg-clip-text text-transparent',
    copy: 'text-midnight/80',
    hint: 'text-midnight/50',
    ring: 'stroke-brand-blue/25',
    line: 'stroke-brand-blue',
    glow: 'rgb(1 68 181 / 0.12)',
    label: 'bg-midnight',
  },
  dark: {
    kicker: 'text-[#9dbbff]',
    dot: 'bg-[#9dbbff]',
    title: 'text-white',
    gradient: 'bg-linear-to-r from-[#5b8cff] via-[#7fa6ff] to-[#b9ceff] bg-clip-text text-transparent',
    copy: 'text-white/75',
    hint: 'text-white/50',
    ring: 'stroke-[#7fa6ff]/40',
    line: 'stroke-[#b9ceff]',
    glow: 'rgb(59 123 247 / 0.28)',
    label: 'bg-[#0a2a80] border border-[#7fa6ff]/40',
  },
};

// r = ring radius as a fraction of the stage width; speed = radians per second (sign = direction)
// Which tools sit on which ring: each tool's "Orbit ring" in the admin (Technologies)
const RINGS: { label: string; groups: StackGroup[]; r: number; speed: number }[] = [
  { label: 'Intelligence', groups: ['ai'], r: 0.2, speed: 0.24 },
  { label: 'Product', groups: ['frontend', 'design'], r: 0.33, speed: -0.15 },
  { label: 'Platform', groups: ['backend', 'cloud'], r: 0.46, speed: 0.1 },
];
const VB_H = 56; // initial viewBox height; kept in step with the stage's aspect ratio at runtime

/**
 * Tech Stack: the tools orbiting an INTA core in three tilted rings.
 * `embedded`: lives inside the About page's scene, which drives its reveal from the scroll (see SystemMap).
 */
export default function TechOrbit({
  tone = 'light',
  embedded = false,
  titleId = 'orbit-title',
}: {
  tone?: keyof typeof TONES;
  embedded?: boolean;
  titleId?: string;
}) {
  const { stack } = useSite();
  const t = useText();
  const rings = RINGS.map((ring) => stack.filter((tool) => ring.groups.includes(tool.group)));
  const [titlePlain, titleBright] = accent(t('about_stack_title'));
  const ref = useRef<HTMLElement>(null);
  const c = TONES[tone];

  useGSAP(
    () => {
      const root = ref.current!;
      const stage = root.querySelector<HTMLElement>('[data-orb="stage"]')!;
      const tiltEl = root.querySelector<HTMLElement>('[data-orb="tilt"]')!;
      const svg = root.querySelector<SVGSVGElement>('[data-orb="svg"]')!;
      const line = root.querySelector<SVGLineElement>('[data-orb="line"]')!;
      const ellipses = gsap.utils.toArray<SVGEllipseElement>('[data-orb="ring"]');
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const fine = window.matchMedia('(pointer: fine)').matches;
      const move = (v: number) => (calm ? 0 : v);
      const offs: (() => void)[] = [];
      const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
        el.addEventListener(type, fn as EventListener);
        offs.push(() => el.removeEventListener(type, fn as EventListener));
      };

      // ---- Geometry (kept in step with the responsive stage) ----
      let W = 0;
      let H = 0;
      let vbH = VB_H;
      let lastTilt = -1;
      const narrow = () => W < 640; // phones: square stage, rounder rings
      const measure = () => {
        W = stage.clientWidth;
        H = stage.clientHeight;
        vbH = W ? (H / W) * 100 : VB_H;
        svg.setAttribute('viewBox', `0 0 100 ${vbH}`);
        ellipses.forEach((e) => e.setAttribute('cy', String(vbH / 2)));
        line.setAttribute('y1', String(vbH / 2));
        lastTilt = -1; // force the rings to redraw
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(stage);
      offs.push(() => ro.disconnect());

      // ---- Orbit state ----
      const items = gsap.utils.toArray<HTMLElement>('[data-orb="item"]').map((el) => {
        const ring = Number(el.dataset.ring);
        const index = Number(el.dataset.index);
        return { el, ring, base: (index / Math.max(1, Number(el.dataset.count))) * Math.PI * 2 + ring * 0.7, z: -1, x: 0, y: 0 };
      });
      const angles = RINGS.map(() => 0);
      const speeds = RINGS.map((r) => (calm ? 0 : r.speed));
      let boost = 0;
      let tilt = calm ? (narrow() ? 0.7 : 0.38) : embedded ? 0.4 : narrow() ? 0.45 : 0.16;
      let tiltTarget = tilt;
      let pausedRing = -1;
      let activeItem: (typeof items)[number] | null = null;
      let onScreen = false;

      // Per frame: write each logo's transform directly (cheapest path); rings and z-order only when they change
      const tick = (_t: number, deltaMs: number) => {
        if (!onScreen || !W) return;
        const dt = Math.min(deltaMs, 50) / 1000;
        tilt += (tiltTarget - tilt) * 0.08;
        if (Math.abs(tilt - lastTilt) > 0.0005) {
          lastTilt = tilt;
          ellipses.forEach((e, ri) => e.setAttribute('ry', String(RINGS[ri].r * 100 * tilt)));
        }
        for (let ri = 0; ri < RINGS.length; ri++) {
          const target = calm || pausedRing === ri ? 0 : RINGS[ri].speed * (1 + boost);
          speeds[ri] += (target - speeds[ri]) * 0.08;
          angles[ri] += speeds[ri] * dt;
        }
        boost *= 0.95;
        for (const it of items) {
          const a = it.base + angles[it.ring];
          const sin = Math.sin(a);
          const rx = RINGS[it.ring].r * W;
          it.x = W / 2 + rx * Math.cos(a);
          it.y = H / 2 + rx * tilt * sin;
          const depth = (sin + 1) / 2; // 0 = back, 1 = front
          it.el.style.transform = `translate3d(${it.x.toFixed(1)}px, ${it.y.toFixed(1)}px, 0) scale(${(0.78 + 0.22 * depth).toFixed(3)})`;
          it.el.style.opacity = (0.6 + 0.4 * depth).toFixed(3);
          const z = it === activeItem ? 60 : sin > 0 ? 30 : 10; // front logos pass over the core, back ones under it
          if (z !== it.z) {
            it.z = z;
            it.el.style.zIndex = String(z);
          }
        }
        if (activeItem) {
          line.setAttribute('x2', String((activeItem.x / W) * 100));
          line.setAttribute('y2', String((activeItem.y / H) * vbH));
        }
      };
      gsap.ticker.add(tick);
      offs.push(() => gsap.ticker.remove(tick));
      // Only animate while on screen
      const vis = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; });
      vis.observe(stage);
      offs.push(() => vis.disconnect());

      // ---- Scroll: rings tilt open as the section arrives; fast scrolling spins them faster ----
      if (!calm && !embedded) {
        const st1 = ScrollTrigger.create({
          trigger: stage, start: 'top bottom', end: 'center center',
          onUpdate: (self) => { tiltTarget = narrow() ? 0.45 + 0.35 * self.progress : 0.16 + 0.24 * self.progress; },
        });
        const st2 = ScrollTrigger.create({
          trigger: root, start: 'top bottom', end: 'bottom top',
          onUpdate: (self) => { boost = Math.max(boost, Math.min(3.5, Math.abs(self.getVelocity()) / 600)); },
        });
        offs.push(() => { st1.kill(); st2.kill(); });
      }

      // ---- Hover / keyboard focus / tap a logo: pause its ring, show its label, draw a line from the core ----
      let closeTimer: ReturnType<typeof setTimeout>;
      let freezeTilt = () => {}; // set below on desktop
      const open = (it: (typeof items)[number], instant = false) => {
        clearTimeout(closeTimer);
        freezeTilt(); // the cursor tilt would otherwise slide the logo out from under the pointer
        if (instant) speeds[it.ring] = 0; // taps: freeze the ring at once so the logo stays under the finger
        // keep the label inside the stage: near an edge it lines up with the logo instead of centring
        const label = it.el.querySelector<HTMLElement>('[data-orb="label"]')!;
        label.dataset.side = it.x < W * 0.25 ? 'left' : it.x > W * 0.75 ? 'right' : 'center';
        // ...then nudge it back inside the screen if it still overflows (long labels on narrow phones)
        label.style.marginLeft = '0px';
        const r = label.getBoundingClientRect();
        const edge = 8;
        const shift = r.left < edge ? edge - r.left : r.right > innerWidth - edge ? innerWidth - edge - r.right : 0;
        label.style.marginLeft = `${Math.round(shift)}px`;
        items.forEach((o) => o.el.classList.toggle('is-open', o === it));
        activeItem = it;
        pausedRing = it.ring;
        gsap.to(line, { opacity: 1, duration: 0.3, overwrite: true });
      };
      const close = () => {
        items.forEach((o) => o.el.classList.remove('is-open'));
        activeItem = null;
        pausedRing = -1;
        gsap.to(line, { opacity: 0, duration: 0.3, overwrite: true });
      };
      items.forEach((it) => {
        const btn = it.el.querySelector<HTMLElement>('button')!;
        // instant stop on hover too, so the logo doesn't drift out from under the cursor (which caused flicker)
        on(btn, 'pointerenter', (e) => { if (e.pointerType === 'mouse') open(it, true); });
        on(btn, 'pointerleave', (e) => { if (e.pointerType === 'mouse') close(); });
        // keyboard focus only: a tap focuses too, and its click would then close the label straight away
        on(btn, 'focus', () => { if (btn.matches(':focus-visible')) open(it); });
        on(btn, 'blur', close);
        // Keyboard (Enter / Space) arrives as a click with no pointer position (detail 0)
        on(btn, 'click', (e) => {
          if (e.detail !== 0) return;
          if (activeItem === it) close();
          else open(it);
        });
      });
      // Touch / pen: a genuine tap (finger lifts quickly without moving, so not the start of a scroll)
      // opens the logo NEAREST the finger, so overlapping or moving logos can't make it miss.
      // Tapping elsewhere closes the open label. Works the same on iOS and Android.
      const TAP_RADIUS = 44;
      let down: { id: number; x: number; y: number; t: number } | null = null;
      const onDown = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
      };
      const onUp = (e: PointerEvent) => {
        if (!down || e.pointerId !== down.id) return;
        const tap = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10 && performance.now() - down.t < 600;
        const { x, y } = down;
        down = null;
        if (!tap || !W) return;
        const r = stage.getBoundingClientRect();
        const scale = r.width / W; // (the About page's scene scales the stage up on large screens)
        let nearest: (typeof items)[number] | null = null;
        let best = TAP_RADIUS;
        for (const it of items) {
          const d = Math.hypot(x - (r.left + it.x * scale), y - (r.top + it.y * scale));
          if (d < best) { best = d; nearest = it; }
        }
        if (!nearest) {
          if (activeItem) close();
          return;
        }
        if (activeItem === nearest) close();
        else {
          open(nearest, true);
          closeTimer = setTimeout(close, 4000);
        }
      };
      const onCancel = () => { down = null; }; // the browser cancels the touch when a scroll starts
      document.addEventListener('pointerdown', onDown, { capture: true, passive: true });
      document.addEventListener('pointerup', onUp, { capture: true, passive: true });
      document.addEventListener('pointercancel', onCancel, { capture: true, passive: true });
      offs.push(() => {
        document.removeEventListener('pointerdown', onDown, { capture: true });
        document.removeEventListener('pointerup', onUp, { capture: true });
        document.removeEventListener('pointercancel', onCancel, { capture: true });
      });

      // ---- Desktop: the whole orbit tilts towards the cursor ----
      if (fine && !calm) {
        gsap.set(tiltEl, { transformPerspective: 1300 });
        const rx = gsap.quickTo(tiltEl, 'rotationX', { duration: 0.8, ease: 'power3.out' });
        const ry = gsap.quickTo(tiltEl, 'rotationY', { duration: 0.8, ease: 'power3.out' });
        // hold the tilt where it is while a logo is hovered
        freezeTilt = () => {
          rx(Number(gsap.getProperty(tiltEl, 'rotationX')));
          ry(Number(gsap.getProperty(tiltEl, 'rotationY')));
        };
        on(stage, 'pointermove', (e) => {
          if (activeItem) return;
          const r = stage.getBoundingClientRect();
          rx(((e.clientY - r.top) / r.height - 0.5) * -10);
          ry(((e.clientX - r.left) / r.width - 0.5) * 12);
        });
        on(stage, 'pointerleave', () => { rx(0); ry(0); });
      }

      // ---- Reveals ----
      if (embedded) {
        onScreen = true;
        tick(0, 16);
        return () => {
          clearTimeout(closeTimer);
          offs.forEach((off) => off());
        };
      }
      const header = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-orb="kicker"]', { y: move(10), autoAlpha: 0, duration: 0.7 }, 0)
        .from('[data-orb="word"]', { yPercent: move(110), autoAlpha: calm ? 0 : 1, duration: 1.1, stagger: 0.1 }, 0.1)
        .from('[data-orb="lede"]', { y: move(18), autoAlpha: 0, duration: 0.9 }, 0.35)
        .from('[data-orb="hint"]', { autoAlpha: 0, duration: 0.8 }, 0.6);
      gsap.set('[data-orb="pop"]', { scale: calm ? 1 : 0, autoAlpha: calm ? 0 : 1 });
      const build = gsap
        .timeline({ paused: true })
        .from(ellipses, { scale: move(0.4), autoAlpha: 0, transformOrigin: '50% 50%', duration: 1.2, ease: 'expo.out', stagger: 0.12 }, 0)
        .from('[data-orb="core"]', { scale: calm ? 1 : 0, autoAlpha: 0, duration: 0.9, ease: 'back.out(1.8)' }, 0.1)
        .to('[data-orb="pop"]', { scale: 1, autoAlpha: 1, duration: 0.7, ease: 'back.out(2)', stagger: 0.06 }, 0.4);

      const io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            io.unobserve(e.target);
            if (e.target === stage) build.play();
            else header.play();
          }),
        { threshold: 0.25 },
      );
      io.observe(stage);
      io.observe(root.querySelector('[data-orb="header"]')!);
      offs.push(() => io.disconnect());

      // place everything once before the first frame
      onScreen = true;
      tick(0, 16);
      return () => {
        clearTimeout(closeTimer);
        offs.forEach((off) => off());
      };
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      id={embedded ? undefined : 'matrix'}
      aria-labelledby={titleId}
      className={embedded ? 'w-full max-w-[1400px] mx-auto px-6 pr-14' : 'max-w-[1520px] mx-auto px-4 sm:px-6 pt-10 sm:pt-12 lg:pt-8 pb-8 sm:pb-10 lg:pb-12 overflow-x-clip'}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 lg:gap-12 items-center">
        {/* Text */}
        <div data-orb="header" className="lg:col-span-5">
          <span data-orb="kicker" className={`inline-flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] uppercase font-bold mb-3 ${c.kicker}`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${c.dot}`} />
            {t('about_stack_kicker')}
          </span>
          <h2 id={titleId} className={`font-display font-extrabold text-[length:clamp(2.25rem,5vw,3.5rem)] leading-[1] tracking-tight uppercase ${c.title}`}>
            <span className="inline-block overflow-hidden align-bottom pb-[0.06em]"><span data-orb="word" className="inline-block">{titlePlain}</span></span>{' '}
            <span className="inline-block overflow-hidden align-bottom pb-[0.06em]"><span data-orb="word" className={`inline-block pb-[0.06em] ${c.gradient}`}>{titleBright}</span></span>
          </h2>
          <p data-orb="lede" className={`mt-4 text-sm sm:text-base leading-relaxed max-w-xl ${c.copy}`}>
            {t('about_stack_text')}
          </p>
          <p data-orb="hint" className={`mt-6 hidden lg:block font-mono text-[11px] uppercase tracking-wider font-semibold ${c.hint}`}>
            <span className="pointer-fine:inline hidden">Hover a logo to pause its orbit</span>
            <span className="pointer-fine:hidden">Tap a logo to see what we use it for</span>
          </p>
        </div>

        {/* Orbit stage */}
        <div className="lg:col-span-7">
          <div data-orb="stage" className={`relative w-full max-w-[520px] sm:max-w-[760px] mx-auto aspect-square sm:aspect-[100/56] select-none ${embedded ? 'pointer-events-auto' : ''}`}>
            <div data-orb="tilt" className="absolute inset-0 [transform-style:preserve-3d]">
              {/* Soft glow behind the core */}
              <div
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[90%] rounded-full pointer-events-none"
                style={{ background: `radial-gradient(closest-side, ${c.glow}, transparent)` }}
              />
              {/* Rings + core-to-logo line */}
              <svg data-orb="svg" aria-hidden="true" viewBox={`0 0 100 ${VB_H}`} className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                {RINGS.map((ring) => (
                  <ellipse
                    key={ring.label}
                    data-orb="ring"
                    cx="50"
                    cy={VB_H / 2}
                    rx={ring.r * 100}
                    ry={ring.r * 100 * 0.3}
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray="4 6"
                    className={`${c.ring} [stroke-width:1.2]`}
                  />
                ))}
                <line data-orb="line" x1="50" y1={VB_H / 2} x2="50" y2={VB_H / 2} vectorEffect="non-scaling-stroke" className={`${c.line} [stroke-width:1.5]`} strokeDasharray="3 4" opacity="0" />
              </svg>

              {/* Core: the official logo file, as-is */}
              {/* pointer-events-none: the expanding sonar rings used to cover the inner logos and swallow taps */}
              <div data-orb="core" className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="relative flex items-center justify-center">
                  <span aria-hidden="true" className="sonar-wave inset-0 w-full h-full" />
                  <span aria-hidden="true" className="sonar-wave sonar-wave-2 inset-0 w-full h-full" />
                  <div className="relative px-2 rounded-2xl bg-[linear-gradient(145deg,#01072b_0%,#06123f_55%,#0a1d5c_100%)] border border-brand-blue/40 ring-1 ring-inset ring-white/5 shadow-[0_12px_40px_-8px_rgb(1_68_181/0.7)]">
                    <Image src="/logo/logo-inta.png" alt="IN-TA Solutions" width={774} height={322} sizes="(min-width: 1280px) 193px, (min-width: 1024px) 135px, (min-width: 640px) 154px, 97px" className="h-10 sm:h-16 lg:h-14 xl:h-20 w-auto" />
                  </div>
                </div>
              </div>

              {/* Orbiting logos */}
              {rings.map((ring, ri) =>
                ring.map((item, i) => {
                  return (
                    <div key={item.slug || item.name} data-orb="item" data-ring={ri} data-index={i} data-count={ring.length} className="group/orb absolute left-0 top-0 will-change-transform">
                      <div data-orb="pop" className="relative -translate-x-1/2 -translate-y-1/2">
                        <button
                          type="button"
                          aria-label={`${item.name}: ${item.use}`}
                          className="relative w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white border border-brand-blue/20 shadow-md shadow-brand-blue/10 flex items-center justify-center p-1.5 sm:p-3
                            touch-manipulation before:absolute before:-inset-2 before:content-[''] pointer-fine:before:hidden
                            transition-[border-color,box-shadow,scale] duration-300 hover:border-brand-blue hover:shadow-xl hover:shadow-brand-blue/25 hover:scale-110
                            group-[.is-open]/orb:border-brand-blue group-[.is-open]/orb:scale-110 focus-visible:outline-2 focus-visible:outline-brand-blue"
                        >
                          <span className="relative w-full h-full">
                            <Image src={item.logo} alt="" fill sizes="56px" loading={embedded ? 'eager' : undefined} className="object-contain" />
                          </span>
                        </button>
                        {/* Label (lines up with the logo near the stage edges so it never gets cut off) */}
                        <span
                          data-orb="label"
                          className={`pointer-events-none absolute top-full mt-2 w-max max-w-[min(15rem,calc(100vw-2rem))] sm:max-w-none sm:whitespace-nowrap rounded-lg text-white px-3 py-1.5 shadow-lg ${c.label}
                            left-1/2 -translate-x-1/2 data-[side=left]:left-0 data-[side=left]:translate-x-0 data-[side=right]:left-auto data-[side=right]:right-0 data-[side=right]:translate-x-0
                            opacity-0 translate-y-1 transition-[opacity,translate] duration-300 group-[.is-open]/orb:opacity-100 group-[.is-open]/orb:translate-y-0`}
                        >
                          <span className="block font-display font-bold uppercase text-[12px] tracking-tight">{item.name}</span>
                          <span className="block font-mono text-xs text-white/70">{item.use}</span>
                        </span>
                      </div>
                    </div>
                  );
                }),
              )}
            </div>
          </div>
          <p className={`lg:hidden mt-4 text-center font-mono text-[11px] uppercase tracking-wider font-semibold ${c.hint}`}>
            <span className="pointer-fine:inline hidden">Hover a logo to pause its orbit</span>
            <span className="pointer-fine:hidden">Tap a logo to see what we use it for</span>
          </p>
        </div>
      </div>
    </section>
  );
}

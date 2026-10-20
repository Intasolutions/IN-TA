'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import HeroCanvas from './HeroCanvas';
import Icon from './Icon';
import Scramble from './Scramble';
import EdgePing from './EdgePing';
import OfficeStatus from './OfficeStatus';
import Marquee from './Marquee';
import { useReveal } from '../context/RevealContext';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const FOCUS_AREAS = ['ENTERPRISE ERP', 'AI PIPELINES', 'HIGH-CONCURRENCY WEB'];

// TODO(content): confirm these figures before going live.
const METRICS = [
  { label: 'EXPERIENCE INDEX', value: '02', unit: '+ Yrs', note: 'High-stakes engineering' },
  { label: 'PRODUCTION UNITS', value: '20', unit: '+', note: 'Enterprise grade deployments' },
  { label: 'UPTIME / SLA', value: '99.9', unit: '%', note: 'Production uptime' },
  { label: 'DATA PIPELINES', value: '<100', unit: 'ms', note: 'Edge telemetry response' },
];

const HEADLINE_TOP = 'Engineering';

// "<100" → { prefix: "<", target: 100, decimals: 0, pad: 3 }
function parseMetric(value: string) {
  const [, prefix = '', num = '0'] = value.match(/^(\D*)([\d.]+)$/) ?? [];
  const decimals = num.split('.')[1]?.length ?? 0;
  return { prefix, target: parseFloat(num), decimals, pad: decimals ? 0 : num.length };
}

function formatMetric(n: number, { prefix, decimals, pad }: ReturnType<typeof parseMetric>) {
  return prefix + n.toFixed(decimals).padStart(pad, '0');
}

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const { isIntroReady } = useReveal();
  const [scrambleKey, setScrambleKey] = useState(0);

  // The gradient shimmer animates background-position, which repaints on the main thread every frame;
  // pause it whenever the hero is off screen
  useEffect(() => {
    const hero = heroRef.current;
    const shimmer = hero?.querySelector<HTMLElement>('[data-hero="gradient"]');
    if (!hero || !shimmer) return;
    const io = new IntersectionObserver(([e]) => {
      shimmer.style.animationPlayState = e.isIntersecting ? 'running' : 'paused';
    });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  // Entrance sequence — waits until the loader / route mask has cleared
  useGSAP(
    () => {
      // Reduced motion → same sequence, but fades only (no travel/rotation)
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const move = (v: number) => (calm ? 0 : v);

      // timeScale > 1 plays the whole sequence faster without re-tuning each step
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } }).timeScale(1.4);
      tl.from('[data-hero="rule"]', { scaleX: 0, duration: 1.4, ease: 'power3.inOut', stagger: 0.2 }, 0)
        .from('[data-hero="datum"] > :not([data-hero="rule"])', { y: move(12), autoAlpha: 0, duration: 0.7, stagger: 0.08 }, 0.15)
        .call(() => setScrambleKey((k) => k + 1), [], 0.2)
        .from('[data-hero="badge"] > *', { y: move(16), autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 0.3)
        .from('.hero-char', { yPercent: move(115), rotate: move(6), autoAlpha: calm ? 0 : 1, duration: 1.2, stagger: 0.035 }, 0.35)
        .fromTo(
          '[data-hero="gradient"]',
          { clipPath: 'inset(-10% 100% -10% 0%)' },
          { clipPath: 'inset(-10% 0% -10% 0%)', duration: 1.4, ease: 'power4.inOut', clearProps: 'clipPath' },
          0.75,
        )
        .from('[data-hero="fade"]', { y: move(28), autoAlpha: 0, duration: 1, stagger: 0.12 }, 1.05)
        .from('[data-hero="hud"]', { scale: calm ? 1 : 0.85, autoAlpha: 0, duration: 0.9, stagger: 0.15, ease: 'back.out(1.7)' }, 1.2)
        .from('[data-hero="metric"]', { y: move(24), autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 1.2);

      // Stats count up from zero
      gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el, i) => {
        const meta = parseMetric(el.dataset.count ?? '0');
        const counter = { v: 0 };
        el.textContent = formatMetric(0, meta);
        tl.to(counter, {
          v: meta.target,
          duration: 1.6,
          ease: 'power2.out',
          onUpdate: () => { el.textContent = formatMetric(counter.v, meta); },
        }, 1.3 + i * 0.08);
      });

      if (isIntroReady) tl.play();
    },
    { scope: heroRef, dependencies: [isIntroReady], revertOnUpdate: true },
  );

  // Cursor interactions + scroll-away parallax
  useGSAP(
    () => {
      const hero = heroRef.current;
      if (!hero) return;

      type Magnet = { el: HTMLElement; strength: number; radius: number; x: gsap.QuickToFunc; y: gsap.QuickToFunc };
      let magnets: Magnet[] = [];

      // Layout is measured once per hover (and after scroll/resize), never on every move
      let heroRect = hero.getBoundingClientRect();
      let magnetRects: DOMRect[] = [];
      let dirty = true;
      const invalidate = () => { dirty = true; };
      const measure = () => {
        heroRect = hero.getBoundingClientRect();
        // Measure resting positions, ignoring the current magnetic offset
        magnetRects = magnets.map((m) => {
          const r = m.el.getBoundingClientRect();
          const dx = Number(gsap.getProperty(m.el, 'x')) || 0;
          const dy = Number(gsap.getProperty(m.el, 'y')) || 0;
          return new DOMRect(r.left - dx, r.top - dy, r.width, r.height);
        });
      };

      // Spotlight follows the cursor for everyone; moved by transform, so nothing repaints
      const spotX = gsap.quickTo(spotlightRef.current, 'x', { duration: 0.35, ease: 'power3.out' });
      const spotY = gsap.quickTo(spotlightRef.current, 'y', { duration: 0.35, ease: 'power3.out' });
      const setSpot = (e: PointerEvent) => {
        if (dirty) { measure(); dirty = false; }
        spotX(e.clientX - heroRect.left);
        spotY(e.clientY - heroRect.top);
      };

      hero.addEventListener('pointermove', setSpot);
      hero.addEventListener('pointerdown', setSpot); // touch: spotlight jumps to the finger
      hero.addEventListener('pointerenter', invalidate);
      window.addEventListener('scroll', invalidate, { passive: true });
      window.addEventListener('resize', invalidate);
      const cleanupSpot = () => {
        hero.removeEventListener('pointermove', setSpot);
        hero.removeEventListener('pointerdown', setSpot);
        hero.removeEventListener('pointerenter', invalidate);
        window.removeEventListener('scroll', invalidate);
        window.removeEventListener('resize', invalidate);
      };

      // Large movement (parallax, tilt, magnetic pull) only when motion is allowed
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return cleanupSpot;

      gsap.timeline({
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
      })
        .to('[data-hero="center"]', { y: -140, opacity: 0.1, ease: 'none' }, 0)
        .to('[data-hero="datum"]', { y: -50, opacity: 0, ease: 'none' }, 0)
        .to('[data-hero="bg"]', { y: 120, scale: 1.08, ease: 'none' }, 0);

      // ---- Touch screens: no hover, so the headline reacts to scrolling and to the phone itself ----
      if (!window.matchMedia('(pointer: fine)').matches) {
        const headline = hero.querySelector('[data-hero="tilt"]');
        const skew = gsap.quickTo(headline, 'skewY', { duration: 0.45, ease: 'power3.out' });
        const tiltX = gsap.quickTo(headline, 'rotationX', { duration: 0.6, ease: 'power3.out' });
        const tiltY = gsap.quickTo(headline, 'rotationY', { duration: 0.6, ease: 'power3.out' });

        // Leans with scroll speed, then springs back when the page stops
        let settle: ReturnType<typeof setTimeout>;
        const lean = ScrollTrigger.create({
          trigger: hero,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: (self) => {
            skew(gsap.utils.clamp(-5, 5, self.getVelocity() / -350));
            clearTimeout(settle);
            settle = setTimeout(() => skew(0), 120);
          },
        });

        // Tilts with the phone (Android etc.). iOS would show a permission prompt, so it's skipped there.
        const onOrient = (e: DeviceOrientationEvent) => {
          if (e.beta === null || e.gamma === null) return;
          tiltY(gsap.utils.clamp(-8, 8, e.gamma / 4));
          tiltX(gsap.utils.clamp(-6, 6, (e.beta - 45) / -6));
        };
        const orientation = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
        const gyro = typeof window.DeviceOrientationEvent !== 'undefined' && typeof orientation.requestPermission !== 'function';
        if (gyro) window.addEventListener('deviceorientation', onOrient);

        return () => {
          cleanupSpot();
          lean.kill();
          clearTimeout(settle);
          if (gyro) window.removeEventListener('deviceorientation', onOrient);
        };
      }

      // Headline tilts in 3D with the cursor
      const headline = hero.querySelector('[data-hero="tilt"]');
      const tiltX = gsap.quickTo(headline, 'rotationX', { duration: 0.5, ease: 'power3.out' });
      const tiltY = gsap.quickTo(headline, 'rotationY', { duration: 0.5, ease: 'power3.out' });

      // Badges and buttons get pulled towards the cursor
      magnets = gsap.utils.toArray<HTMLElement>('[data-magnetic]').map((el) => ({
        el,
        strength: parseFloat(el.dataset.magnetic || '0.12'),
        radius: parseFloat(el.dataset.radius || '320'),
        x: gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' }),
        y: gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' }),
      }));

      // Runs after setSpot (registered first), so heroRect/magnetRects are fresh
      const onMove = (e: PointerEvent) => {
        const r = heroRect;
        tiltX(((e.clientY - r.top) / r.height - 0.5) * -6);
        tiltY(((e.clientX - r.left) / r.width - 0.5) * 8);

        magnets.forEach((m, i) => {
          const b = magnetRects[i];
          if (!b || b.width === 0) return; // hidden at this breakpoint
          const dx = e.clientX - (b.left + b.width / 2);
          const dy = e.clientY - (b.top + b.height / 2);
          const pull = Math.max(0, 1 - Math.hypot(dx, dy) / m.radius);
          m.x(dx * pull * m.strength);
          m.y(dy * pull * m.strength);
        });
      };
      const onLeave = () => {
        tiltX(0);
        tiltY(0);
        magnets.forEach((m) => { m.x(0); m.y(0); });
      };

      hero.addEventListener('pointermove', onMove);
      hero.addEventListener('pointerleave', onLeave);
      return () => {
        cleanupSpot();
        hero.removeEventListener('pointermove', onMove);
        hero.removeEventListener('pointerleave', onLeave);
      };
    },
    { scope: heroRef },
  );

  return (
    <section ref={heroRef} aria-label="Hero" className="group/hero relative pt-(--header-h) overflow-hidden">
      {/* Starts below the fixed header, so the header never re-composites over the animation */}
      <div
        data-hero="bg"
        className="absolute inset-x-0 top-(--header-h) bottom-0 pointer-events-none will-change-transform [mask-image:linear-gradient(to_bottom,#000_0%,#000_82%,transparent_100%)]"
      >
        <HeroCanvas className="absolute inset-0 w-full h-full opacity-75" />
        {/* Ambient aura: a gradient instead of a filter blur, so moving it is free */}
        <div
          className="absolute -top-28 left-1/2 -translate-x-1/2 w-[1300px] max-w-[160%] h-[800px]"
          style={{ background: 'radial-gradient(closest-side, rgb(1 68 181 / 0.09), transparent)' }}
        />
      </div>
      {/* Soft spotlight centred on the pointer, moved by transform */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          ref={spotlightRef}
          className="absolute -left-[520px] -top-[520px] w-[1040px] h-[1040px] rounded-full opacity-0 group-hover/hero:opacity-100 transition-opacity duration-500 will-change-transform"
          style={{ background: 'radial-gradient(closest-side, rgb(1 68 181 / 0.07), transparent 65%)' }}
        />
      </div>

      <div className="relative min-h-[calc(100svh_-_var(--header-h))] flex flex-col justify-between max-w-[1520px] mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-10 sm:pb-12">
        {/* Architectural datum */}
        <div data-hero="datum" className="relative flex flex-wrap items-center justify-between pb-5 gap-4">
            <div className="inline-flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-brand-blue rounded-sm rotate-45 animate-pulse" />
              <Scramble
                text="EST. 2023 // SPECIALIZED ENGINEERING UNIT"
                playKey={scrambleKey}
                duration={600}
                className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.1em] min-[400px]:tracking-[0.16em] sm:tracking-[0.25em] text-brand-blue font-bold"
              />
            </div>
            <div className="hidden sm:flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] tracking-widest text-midnight/70 font-semibold">
              {FOCUS_AREAS.map((area) => (
                <span key={area} className="flex items-center gap-1.5">
                  <span className="text-brand-blue font-bold">+</span>
                  <Scramble text={area} playKey={scrambleKey} duration={750} />
                </span>
              ))}
            </div>
          <span data-hero="rule" className="absolute bottom-0 left-0 right-0 h-px bg-brand-blue/20 origin-left" />
        </div>

        {/* Centerpiece */}
        <div data-hero="center" className="my-auto py-8">
          <div data-hero="badge" className="flex flex-wrap items-center gap-x-4 gap-y-3 mb-5 sm:mb-6">
            <div className="inline-flex flex-wrap items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-md bg-white/95 border border-brand-blue/25 text-brand-blue font-mono text-[10px] sm:text-[11px] tracking-wide shadow-sm">
              <span className="hidden sm:inline text-midnight font-bold">IN-TA SOLUTIONS</span>
              <span className="hidden sm:inline text-brand-blue/40">•</span>
              <span className="font-semibold">CUSTOM SOFTWARE · AI · MOBILE APPS</span>
            </div>
            <span className="inline-flex items-center gap-3">
              <span className="relative flex items-center justify-center w-6 h-6" aria-hidden="true">
                <span className="sonar-wave w-6 h-6" />
                <span className="sonar-wave sonar-wave-2 w-6 h-6" />
                <span className="w-2.5 h-2.5 rounded-full bg-brand-blue relative z-10" />
              </span>
              <Scramble
                text="LET'S BUILD WHAT'S NEXT"
                playKey={scrambleKey}
                duration={800}
                className="font-mono text-[10px] text-brand-blue font-semibold uppercase tracking-wider"
              />
            </span>
          </div>

          <div className="relative [perspective:1200px]">
            <h1
              data-hero="tilt"
              className="font-display font-extrabold text-[length:clamp(2.75rem,min(13vw,19svh),7rem)] leading-[0.92] tracking-[-0.04em] text-midnight uppercase max-w-7xl [transform-style:preserve-3d]"
            >
              <span className="sr-only">Engineering Digital Reality</span>
              <span aria-hidden="true" className="block overflow-hidden pb-[0.06em]">
                {HEADLINE_TOP.split('').map((ch, i) => (
                  <span key={i} className="hero-char inline-block">{ch}</span>
                ))}
              </span>
              <span aria-hidden="true" className="block">
                {/* Gradient text only paints inside its box, so pad it to include the g/y descenders */}
                <span
                  data-hero="gradient"
                  className="font-serif italic font-light normal-case text-gradient-shimmer inline-block pr-2 pb-[0.16em] leading-[1.02]"
                >
                  Digital Reality
                </span>
              </span>
            </h1>

            {/* Floating HUD badges (desktop) */}
            <div
              data-hero="hud"
              data-magnetic="0.12"
              aria-hidden="true"
              className="hidden xl:flex absolute top-4 right-16 p-3.5 rounded-xl bg-white/95 border border-brand-blue/30 shadow-lg shadow-brand-blue/10 flex-col gap-1"
            >
              <EdgePing />
            </div>

            <div
              data-hero="hud"
              data-magnetic="0.12"
              className="hidden xl:flex absolute bottom-2 right-4 p-3 rounded-xl bg-white/95 border border-brand-blue/30 shadow-lg shadow-brand-blue/10 flex-col gap-1"
            >
              <OfficeStatus />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 mt-8 sm:mt-12 items-end">
            <p data-hero="fade" className="lg:col-span-6 max-w-2xl text-midnight/85 text-base sm:text-lg lg:text-xl leading-relaxed">
              We forge hyper-scaled software architecture, resilient manufacturing execution backends, and fine-tuned AI
              ecosystems for enterprise leaders across Kerala and global markets.
            </p>
            <div data-hero="fade" data-floating-clear className="lg:col-span-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-start lg:justify-end gap-3 sm:gap-4">
              <span data-magnetic="0.35" data-radius="140" className="block sm:inline-block">
                <Link
                  href="/portfolio"
                  className="kinetic-cta-btn px-8 py-4 rounded-xl bg-brand-blue hover:bg-midnight text-white font-mono text-[12px] sm:text-[13px] tracking-wider uppercase font-semibold flex items-center justify-center gap-3 group active:scale-[0.97]"
                >
                  <span>Explore Selected Work</span>
                  <Icon name="north_east" className="text-[18px] group-hover:rotate-45 transition-transform duration-300" />
                </Link>
              </span>
              <span data-magnetic="0.35" data-radius="140" className="block sm:inline-block">
                <Link
                  href="/#matrix"
                  className="px-6 py-4 rounded-xl bg-white hover:bg-canvas border border-brand-blue/30 hover:border-brand-blue text-midnight hover:text-brand-blue font-mono text-[12px] sm:text-[13px] tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-sm font-semibold active:scale-[0.97]"
                >
                  <Icon name="developer_board" className="text-brand-blue text-[18px]" />
                  <span>Inspect Matrix</span>
                </Link>
              </span>
            </div>
          </div>

          {/* Live badges for phones/tablets — the floating versions above only fit from xl */}
          <div className="xl:hidden mt-8 grid grid-cols-2 gap-3 sm:gap-4 max-w-2xl">
            <div data-hero="hud" aria-hidden="true" className="p-3 sm:p-3.5 rounded-xl bg-white/95 border border-brand-blue/30 shadow-md shadow-brand-blue/5">
              <EdgePing />
            </div>
            <div data-hero="hud" className="p-3 sm:p-3.5 rounded-xl bg-white/95 border border-brand-blue/30 shadow-md shadow-brand-blue/5">
              <OfficeStatus />
            </div>
          </div>
        </div>

        {/* Metrics strip */}
        <div className="relative pt-8">
          <span data-hero="rule" className="absolute top-0 left-0 right-0 h-px bg-brand-blue/20 origin-left" />
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6 sm:gap-6">
            {METRICS.map((m) => (
              <div key={m.label} data-hero="metric" className="pl-3 sm:pl-4 border-l-2 border-brand-blue">
                <dt className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-midnight/70 font-semibold">
                  <Scramble text={m.label} playKey={scrambleKey} duration={700} />
                </dt>
                <dd className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-midnight mt-1 tabular-nums">
                  <span data-count={m.value}>{m.value}</span>
                  <span className="text-brand-blue text-xl sm:text-2xl font-bold">{m.unit}</span>
                </dd>
                <dd className="text-xs text-midnight/60 mt-1">{m.note}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Services ticker sits inside the hero, over the same background animation */}
      <Marquee />
      {/* Run-out space where the background fades away before the next section */}
      <div aria-hidden="true" className="h-16 sm:h-20 lg:h-24" />
    </section>
  );
}

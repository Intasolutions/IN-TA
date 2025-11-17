// frontend/components/TechStack.tsx
'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * TEMPO: 0.7 = faster, 1.0 = default, 1.4 = slower/cinematic
 * Lower = snappier; higher = more cinematic.
 */
const TEMPO = 0.95;

type Tool = {
  id: string;
  name: string;
  logo?: string;
  accent?: string;
};

const tools: Tool[] = [
  { id: 'react', name: 'React', logo: '/logo/React.svg', accent: '#61dafb' },
  { id: 'next', name: 'Next.js', logo: '/next.svg', accent: '#ffffff' },
  { id: 'node', name: 'Node.js', logo: '/logo/node.svg', accent: '#83CD29' },
  { id: 'ts', name: 'TypeScript', logo: '/logo/typescript.svg', accent: '#2f74c0' },
  { id: 'figma', name: 'Figma', logo: '/logos/figma.svg', accent: '#f24e1e' },
  { id: 'aws', name: 'AWS', logo: '/logos/aws.svg', accent: '#ff9900' },
  { id: 'docker', name: 'Docker', logo: '/logos/docker.svg', accent: '#2496ed' },
  { id: 'tailwind', name: 'Tailwind', logo: '/logos/tailwind.svg', accent: '#06b6d4' },
];

export default function TechStack(): JSX.Element {
  const wrapRef = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const bgLayerA = useRef<HTMLDivElement | null>(null);
  const bgLayerB = useRef<HTMLDivElement | null>(null);
  const toolCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // loops/handlers
  const cardLoops = useRef<Map<HTMLElement, gsap.core.Timeline>>(new Map());
  const logoLoops = useRef<Map<HTMLElement, gsap.core.Timeline>>(new Map());
  const sheenIntervals = useRef<Map<HTMLElement, number>>(new Map());
  const handlers = useRef<Map<HTMLElement, { enter: any; leave: any }>>(new Map());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      // heading reveal
      gsap.fromTo(
        '.ts-hero',
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.56 * TEMPO, ease: 'power3.out', scrollTrigger: { trigger: '.ts-hero', start: 'top 92%' } }
      );

      // gentle layered background floats for depth
      if (!prefersReduce) {
        if (bgLayerA.current) {
          gsap.to(bgLayerA.current, {
            x: -12,
            y: -8,
            rotation: -1.4,
            duration: 26 * TEMPO,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          });
        }
        if (bgLayerB.current) {
          gsap.to(bgLayerB.current, {
            x: 10,
            y: 6,
            rotation: 1,
            duration: 30 * TEMPO,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          });
        }
      }

      // set initial state for cards
      const items = gsap.utils.toArray<HTMLElement>('.ts-card');
      gsap.set(items, { autoAlpha: 0, y: 24, transformOrigin: 'center center', willChange: 'transform, opacity' });

      // reveal with batch for perf
      ScrollTrigger.batch(items, {
        start: 'top 90%',
        onEnter: (batch) => {
          gsap.to(batch, {
            autoAlpha: 1,
            y: 0,
            duration: 0.7 * TEMPO,
            ease: 'power4.out',
            stagger: 0.06,
          });

          // after reveal, start refined loops immediately (no waiting)
          batch.forEach((el: HTMLElement, idx: number) => {
            const logo = el.querySelector<HTMLElement>('.ts-logo');
            const tooltip = el.querySelector<HTMLElement>('.ts-tooltip');

            if (!prefersReduce) {
              // ---- Card: slow 3D tilt + float (professional) ----
              if (!cardLoops.current.has(el)) {
                const tiltX = gsap.utils.random(2.0, 6.0); // small tilt amplitude
                const tiltY = gsap.utils.random(-3.5, 3.5);
                const floatY = gsap.utils.random(-6, -2);

                // timeline: slow 3D tilt arcs with slightly varying durations
                const cardTl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });

                // phase A: tilt to one side with slight lift
                cardTl.to(el, {
                  rotationX: tiltX,
                  rotationY: tiltY,
                  y: floatY,
                  duration: 2.2 * TEMPO,
                }, 0);

                // phase B: counter-tilt and settle with slightly longer time (creates cinematic arc)
                cardTl.to(el, {
                  rotationX: -tiltX * 0.45,
                  rotationY: -tiltY * 0.45,
                  y: floatY * 0.3,
                  duration: 3.4 * TEMPO,
                }, `>-${0.12 * TEMPO}`);

                // gentle settle moment (keeps it from feeling robotic)
                cardTl.to(el, {
                  rotationX: tiltX * 0.08,
                  rotationY: tiltY * -0.08,
                  y: floatY * 0.12,
                  duration: 4.0 * TEMPO,
                }, '>');
                
                // small initial offset per index so they don't sync
                cardTl.pause();
                gsap.delayedCall(idx * (0.06 * TEMPO), () => cardTl.play(0));
                cardLoops.current.set(el, cardTl);
              }

              // ---- Logo/Icon: small counter-parallax, faster cadence ----
              if (logo && !logoLoops.current.has(logo)) {
                // entrance pop for logo
                gsap.fromTo(logo, { autoAlpha: 0, scale: 0.86, rotation: 6 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.36 * TEMPO, ease: 'back.out(1.02)', delay: idx * 0.02 });

                const iconTl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });
                // quicker, smaller oscillation in opposite direction from the card's major tilt
                const iconY = gsap.utils.random(1.5, 5);
                const iconX = gsap.utils.random(-2, 2);
                const iconRot = gsap.utils.random(-3, 3);

                iconTl.to(logo, { y: -iconY, x: iconX, rotation: -iconRot, duration: 0.9 * TEMPO }, 0);
                iconTl.to(logo, { y: iconY * 0.4, x: -iconX * 0.28, rotation: iconRot * 0.5, duration: 1.8 * TEMPO }, `>-${0.06 * TEMPO}`);
                iconTl.pause();
                gsap.delayedCall(idx * (0.06 * TEMPO) + 0.02, () => iconTl.play(0));
                logoLoops.current.set(logo, iconTl);
              }

              // ---- Subtle sheen (shimmer) sweep for premium feel ----
              // create a pseudo-sheen element if not existing
              let sheen = el.querySelector<HTMLElement>('.ts-sheen') as HTMLElement | null;
              if (!sheen) {
                sheen = document.createElement('div');
                sheen.className = 'ts-sheen pointer-events-none';
                sheen.style.position = 'absolute';
                sheen.style.left = '-30%';
                sheen.style.top = '0';
                sheen.style.width = '60%';
                sheen.style.height = '100%';
                sheen.style.transform = 'skewX(-18deg)';
                sheen.style.background = 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0.0) 70%)';
                sheen.style.opacity = '0';
                sheen.style.mixBlendMode = 'overlay';
                sheen.style.pointerEvents = 'none';
                el.style.position = el.style.position || 'relative';
                el.appendChild(sheen);
              }

              // shimmer interval (safely stored)
              if (!sheenIntervals.current.has(el)) {
                // run an initial sweep slightly delayed; then periodic
                const runSheen = () => {
                  const sTl = gsap.timeline();
                  sTl.set(sheen, { xPercent: -100, autoAlpha: 0 });
                  sTl.to(sheen, { autoAlpha: 1, duration: 0.08 * TEMPO, ease: 'power1.out' });
                  sTl.to(sheen, { xPercent: 120, autoAlpha: 0.9, duration: 0.85 * TEMPO, ease: 'power2.out' });
                  sTl.to(sheen, { autoAlpha: 0, duration: 0.18 * TEMPO, ease: 'power1.in' });
                };
                // staggered first
                const firstDelay = idx * (0.9 * TEMPO) + 0.8;
                const interval = window.setInterval(runSheen, Math.round((8000 + Math.random() * 2600) * TEMPO)); // periodic ~8-10s
                // run first one after a small delay
                setTimeout(runSheen, firstDelay * 1000);
                sheenIntervals.current.set(el, interval);
              }
            }

            // Hover & focus handlers (pause loops, show tooltip)
            if (!handlers.current.has(el)) {
              const onEnter = () => {
                try { cardLoops.current.get(el)?.pause(); } catch {}
                try {
                  const logo = el.querySelector<HTMLElement>('.ts-logo');
                  if (logo) logoLoops.current.get(logo)?.pause();
                } catch {}
                gsap.to(el, { scale: 1.06, y: -6, duration: 0.16 * TEMPO, ease: 'power2.out' });
                if (tooltip) {
                  gsap.killTweensOf(tooltip);
                  gsap.fromTo(tooltip, { autoAlpha: 0, y: -6 }, { autoAlpha: 1, y: 0, duration: 0.28 * TEMPO, ease: 'power3.out', pointerEvents: 'auto' });
                }
              };
              const onLeave = () => {
                try { cardLoops.current.get(el)?.resume(); } catch {}
                try {
                  const logo = el.querySelector<HTMLElement>('.ts-logo');
                  if (logo) logoLoops.current.get(logo)?.resume();
                } catch {}
                gsap.to(el, { scale: 1.0, y: 0, duration: 0.5 * TEMPO, ease: 'power3.out' });
                if (tooltip) {
                  gsap.killTweensOf(tooltip);
                  gsap.to(tooltip, { autoAlpha: 0, y: -8, duration: 0.36 * TEMPO, ease: 'power3.out', pointerEvents: 'none' });
                }
              };

              el.addEventListener('pointerenter', onEnter, { passive: true });
              el.addEventListener('pointerleave', onLeave, { passive: true });
              el.addEventListener('focus', onEnter as EventListener);
              el.addEventListener('blur', onLeave as EventListener);
              handlers.current.set(el, { enter: onEnter, leave: onLeave });
            }
          });
        },
        onEnterBack: (batch) => {
          gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.6 * TEMPO, stagger: 0.05, ease: 'power3.out' });
        },
      });

      // pointer micro-parallax for whole block
      if (!prefersReduce && gridRef.current && wrapRef.current) {
        const container = wrapRef.current;
        let raf = 0;
        const onMove = (ev: PointerEvent) => {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            const rect = container.getBoundingClientRect();
            const nx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
            const ny = ((ev.clientY - rect.top) / rect.height) * 2 - 1;

            if (bgLayerA.current) gsap.to(bgLayerA.current, { x: nx * 10, y: ny * 6, duration: 0.7 * TEMPO, ease: 'power3.out', overwrite: true });
            if (bgLayerB.current) gsap.to(bgLayerB.current, { x: nx * -6, y: ny * -4, duration: 0.85 * TEMPO, ease: 'power3.out', overwrite: true });
            if (gridRef.current) gsap.to(gridRef.current, { rotationX: ny * 1.8, rotationY: nx * -1.8, duration: 0.8 * TEMPO, transformPerspective: 900, ease: 'power3.out', overwrite: true });
          });
        };
        const onLeave = () => {
          gsap.to([bgLayerA.current, bgLayerB.current, gridRef.current], { x: 0, y: 0, rotationX: 0, rotationY: 0, duration: 0.9 * TEMPO, ease: 'power3.out', overwrite: true });
        };
        container.addEventListener('pointermove', onMove);
        container.addEventListener('pointerleave', onLeave);
        container.addEventListener('pointercancel', onLeave);
      }
    }, wrapRef);

    return () => {
      // cleanup
      try {
        handlers.current.forEach((h, el) => {
          try { el.removeEventListener('pointerenter', h.enter); } catch {}
          try { el.removeEventListener('pointerleave', h.leave); } catch {}
          try { el.removeEventListener('focus', h.enter); } catch {}
          try { el.removeEventListener('blur', h.leave); } catch {}
        });
        handlers.current.clear();
      } catch {}

      try { cardLoops.current.forEach((tl) => tl.kill()); } catch {}
      try { logoLoops.current.forEach((tl) => tl.kill()); } catch {}
      cardLoops.current.clear();
      logoLoops.current.clear();

      try {
        sheenIntervals.current.forEach((id) => window.clearInterval(id));
      } catch {}
      sheenIntervals.current.clear();

      try { ctx.revert(); } catch {}
      try { ScrollTrigger.getAll().forEach((t) => t.kill()); } catch {}
    };
  }, []);

  return (
    <section ref={wrapRef} id="tech-stack" className="relative bg-[#fbf9f5] py-24 px-6 md:px-20 overflow-hidden">
      {/* layered bg */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div ref={bgLayerA} className="absolute left-[-8%] top-[-12%] w-[62%] h-[120%]">
          <div style={{ mixBlendMode: 'screen' }} className="w-full h-full rounded-full bg-gradient-to-br from-[#1f6fe6]/10 to-[#0b2a5f]/04 blur-[92px]" />
        </div>
        <div ref={bgLayerB} className="absolute right-[-6%] bottom-[-8%] w-[48%] h-[80%]">
          <div style={{ mixBlendMode: 'screen' }} className="w-full h-full rounded-full bg-gradient-to-tl from-[#0b2a5f]/06 to-[#1f6fe6]/04 blur-[68px]" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="ts-hero text-center mb-10">
          <p className="text-sm font-semibold tracking-wide text-slate-600">TECH STACK</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#0b2a5f] mt-2">Tools we love & ship with</h2>
          <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
            Carefully chosen tech and tools — engineered for reliability, scale and speed.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          <div className="px-3 py-1 rounded-full bg-white/60 text-xs font-semibold text-slate-700 shadow">Modern Stacks</div>
          <div className="px-3 py-1 rounded-full bg-white/60 text-xs font-semibold text-slate-700 shadow">Design Systems</div>
          <div className="px-3 py-1 rounded-full bg-white/60 text-xs font-semibold text-slate-700 shadow">Observability</div>
        </div>

        <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8 mt-6">
          {tools.map((t) => (
            <div
              key={t.id}
              ref={(el) => (toolCardRefs.current[t.id] = el)}
              className="ts-card relative rounded-2xl bg-white/90 backdrop-blur-sm p-4 md:p-6 flex items-center justify-center flex-col gap-3 border border-slate-100 shadow-lg"
              aria-label={t.name}
              tabIndex={0}
            >
              <div
                aria-hidden
                className="absolute -inset-0.5 rounded-2xl pointer-events-none"
                style={{
                  boxShadow: `0 12px 40px ${t.accent ?? '#1f6fe6'}33`,
                  opacity: 0.12,
                }}
              />

              <div className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-lg">
                {t.logo ? (
                  <div className="ts-logo w-full h-full relative select-none" aria-hidden>
                    <Image src={t.logo} alt={t.name} fill className="object-contain" sizes="64px" priority={false} />
                  </div>
                ) : (
                  <div className="ts-logo text-lg font-semibold text-slate-900">{t.name}</div>
                )}
              </div>

              <div className="ts-name text-sm font-semibold text-slate-700 opacity-90">{t.name}</div>

              <div className="ts-tooltip absolute left-1/2 -translate-x-1/2 -bottom-10 pointer-events-none opacity-0 transform -translate-y-2">
                <div className="px-3 py-1 rounded-full bg-[#0b2a5f] text-white text-xs shadow-sm">Used in production</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-center">
          <a href="#contact" className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6] text-white px-6 py-3 font-semibold shadow-lg hover:scale-[1.02] transition-transform">
            Work with our stack →
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
        </div>
      </div>

      <style jsx>{`
        .ts-card { transform-origin: center center; will-change: transform, opacity; cursor: default; overflow: visible; }
        .ts-logo { will-change: transform, opacity; pointer-events: none; user-select: none; }
        .ts-tooltip { transition: opacity 220ms ease, transform 260ms ease; }
        .ts-sheen { border-radius: 16px; } /* matches card rounding */
        @media (prefers-reduced-motion: reduce) {
          .ts-card, .ts-logo, .ts-tooltip, .ts-sheen { transition: none !important; animation: none !important; transform: none !important; }
        }
      `}</style>
    </section>
  );
}

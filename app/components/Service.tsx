// frontend/components/Services.tsx
'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type Service = {
  title: string;
  desc: string;
  kind: 'code' | 'ux' | 'mobile' | 'video' | 'marketing' | 'seo';
};

const services: Service[] = [
  { title: 'Web Development', desc: 'Modern, responsive websites and web apps — performant, accessible, and scalable.', kind: 'code' },
  { title: 'UI/UX Design', desc: 'User-centred interfaces, design systems, and rapid validation.', kind: 'ux' },
  { title: 'App Development', desc: 'Cross-platform mobile apps with animations, offline support, and CI/CD pipelines.', kind: 'mobile' },
  { title: 'Video Production', desc: 'Motion graphics and storytelling that enhance your brand identity.', kind: 'video' },
  { title: 'Digital Marketing', desc: 'Performance-driven campaigns and social media strategy that drive growth.', kind: 'marketing' },
  { title: 'SEO Optimization', desc: 'From audits to content strategy, improving visibility and organic traffic.', kind: 'seo' },
];

/**
 * TEMPO controls timing:
 * - 0.8 = faster (medium-fast)
 * - 1.0 = default smooth
 * - 1.3 = slower, more cinematic
 */
const TEMPO = 0.5; // Fast and responsive like the video

export default function Services() {
  const wrapRef = useRef<HTMLElement | null>(null);
  const blobRef = useRef<SVGPathElement | null>(null);

  // store loops and handlers so we can pause/resume/kill reliably
  const cardLoops = useRef<Map<HTMLElement, gsap.core.Timeline>>(new Map());
  const iconLoops = useRef<Map<HTMLElement, gsap.core.Timeline>>(new Map());
  const handlers = useRef<Map<HTMLElement, { enter: () => void; leave: () => void }>>(new Map());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduce) {
      // instant reveal and no loops
      wrapRef.current?.querySelectorAll<HTMLElement>('.svc-reveal').forEach((el) => (el.style.opacity = '1'));
      return;
    }

    const ctx = gsap.context(() => {
      // HERO reveal
      gsap.fromTo(
        '.svc-hero',
        { autoAlpha: 0, y: 22 },
        { autoAlpha: 1, y: 0, duration: 0.56 * TEMPO, ease: 'power3.out', scrollTrigger: { trigger: '.svc-hero', start: 'top 92%' } }
      );

      // blob gentle float for depth
      if (blobRef.current) {
        gsap.to(blobRef.current, {
          x: 10,
          y: -12,
          rotation: 4,
          duration: 18 * TEMPO,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      // Cards setup
      const cards = gsap.utils.toArray<HTMLElement>('.svc-card') as HTMLElement[];
      gsap.set(cards, { autoAlpha: 0, y: 36, transformStyle: 'preserve-3d', willChange: 'transform, opacity' });

      // Use ScrollTrigger.batch for performant reveal
      ScrollTrigger.batch(cards, {
        start: 'top 88%',
        onEnter: (batch) => {
          // Entrance: quick pop + rotateX + slight Z rotation for cinematic feel
          gsap.fromTo(
            batch,
            { autoAlpha: 0, y: 56, rotationX: 10, rotationZ: -2, scale: 0.992 },
            {
              autoAlpha: 1,
              y: 0,
              rotationX: 0,
              rotationZ: 0,
              scale: 1,
              duration: 0.6 * TEMPO,
              ease: 'expo.out',
              stagger: { each: 0.06, from: 'start' },
              onComplete: () => {
                // After reveal, start idle loops (pulse-stack style)
                batch.forEach((card, idx) => {
                  if (cardLoops.current.has(card)) return;

                  // Parameters tuned for medium-fast (matching video feel)
                  const pulseScale = gsap.utils.random(1.02, 1.05); // inhale
                  const settleScale = gsap.utils.random(1.005, 1.018); // settle micro-breath
                  const upY = gsap.utils.random(-8, -4);
                  const rotZ = gsap.utils.random(-3, 3);

                  // Card timeline: inhale (short), exhale (long), micro settle — repeated
                  const tl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });

                  // inhale (shorter)
                  tl.to(card, { scale: pulseScale, y: upY, rotationZ: rotZ, duration: 1.2 * TEMPO }, 0);
                  // exhale (longer)
                  tl.to(card, { scale: settleScale, y: upY * 0.35, rotationZ: -rotZ * 0.35, duration: 3.2 * TEMPO }, `>-${0.06 * TEMPO}`);
                  // micro settle moment to avoid robotic loop
                  tl.to(card, { scale: 1.02, duration: 4.0 * TEMPO }, '>');
                  // start paused and staggered to avoid sync
                  tl.pause();
                  gsap.delayedCall(idx * (0.07 * TEMPO), () => tl.play());
                  cardLoops.current.set(card, tl);

                  // Icon opposite micro-motion (quicker & counter)
                  const icon = card.querySelector<HTMLElement>('.svc-icon');
                  if (icon) {
                    const iconTl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });
                    // counter scale & rotation
                    iconTl.to(icon, { scale: 0.985, y: -upY * 0.24, rotationZ: -rotZ * 0.9, duration: 0.9 * TEMPO }, 0);
                    iconTl.to(icon, { scale: 1.01, y: -upY * 0.08, rotationZ: rotZ * 0.45, duration: 1.9 * TEMPO }, `>-${0.04 * TEMPO}`);
                    // entrance pop for icon
                    gsap.fromTo(icon, { autoAlpha: 0, scale: 0.78, rotation: 6 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.38 * TEMPO, ease: 'back.out(1.02)', delay: idx * 0.02 });
                    iconTl.pause();
                    gsap.delayedCall(idx * (0.07 * TEMPO) + 0.02, () => iconTl.play());
                    iconLoops.current.set(icon, iconTl);
                  }

                  // Hover behavior: pause loops to let hover animation feel crisp
                  const onEnter = () => {
                    try {
                      cardLoops.current.get(card)?.pause();
                      const ic = card.querySelector<HTMLElement>('.svc-icon');
                      if (ic) iconLoops.current.get(ic)?.pause();
                      gsap.to(card, { scale: 1.04, y: -6, duration: 0.18 * TEMPO, ease: 'power2.out' });
                    } catch {}
                  };
                  const onLeave = () => {
                    try {
                      cardLoops.current.get(card)?.resume();
                      const ic = card.querySelector<HTMLElement>('.svc-icon');
                      if (ic) iconLoops.current.get(ic)?.resume();
                      gsap.to(card, { scale: 1.0, y: 0, duration: 0.5 * TEMPO, ease: 'power3.out' });
                    } catch {}
                  };

                  card.addEventListener('pointerenter', onEnter, { passive: true });
                  card.addEventListener('pointerleave', onLeave, { passive: true });
                  handlers.current.set(card, { enter: onEnter, leave: onLeave });
                });
              },
            }
          );
        },
        onEnterBack: (batch) => {
          gsap.fromTo(batch, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.56 * TEMPO, stagger: 0.05, ease: 'power3.out' });
        },
      });

      // Connector draw (keeps decorative line drawing)
      const conn = document.querySelector<SVGPathElement>('.svc-connector-path');
      if (conn) {
        try {
          const L = conn.getTotalLength();
          conn.style.strokeDasharray = `${L}`;
          conn.style.strokeDashoffset = `${L}`;
          gsap.to(conn, {
            strokeDashoffset: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: wrapRef.current!,
              start: 'top 85%',
              end: 'bottom 10%',
              scrub: 1.0,
              invalidateOnRefresh: true,
            },
          });
        } catch {}
      }
    }, wrapRef);

    return () => {
      // cleanup: remove handlers & kill timelines and ScrollTriggers
      try {
        handlers.current.forEach((h, card) => {
          try { card.removeEventListener('pointerenter', h.enter); } catch {}
          try { card.removeEventListener('pointerleave', h.leave); } catch {}
        });
        handlers.current.clear();
      } catch {}

      try { cardLoops.current.forEach((tl) => tl.kill()); } catch {}
      try { iconLoops.current.forEach((tl) => tl.kill()); } catch {}
      try { ctx.revert(); } catch {}
      try { ScrollTrigger.getAll().forEach(t => t.kill()); } catch {}
      cardLoops.current.clear();
      iconLoops.current.clear();
    };
  }, []);

  return (
    <section ref={wrapRef} id="services" className="relative overflow-hidden py-24 bg-[#f9f8f6]">
      {/* decorative blob */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute left-0 top-0 w-[60%] h-full transform -translate-x-12">
          <svg viewBox="0 0 600 800" className="w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
            <defs>
              <linearGradient id="svcG_video" x1="0" x2="1">
                <stop offset="0%" stopColor="#0b2a5f" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#1f6fe6" stopOpacity="0.06" />
              </linearGradient>
            </defs>
            <path ref={blobRef} d="M0 200 C120 80 320 80 420 200 C520 320 640 320 700 200 L700 800 L0 800 Z" fill="url(#svcG_video)" />
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-20 relative">
        <div className="svc-hero max-w-4xl mx-auto text-center mb-12 svc-reveal">
          <p className="text-xl font-semibold tracking-wider text-slate-700 mb-2">OUR SERVICE</p>
          <h3 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6] leading-tight">
            Premium design & engineering
          </h3>
          <p className="mt-4 text-slate-600 max-w-2xl mx-auto">Smooth motion. Layered depth. Crafted interactivity.</p>
        </div>

        {/* connector */}
        <div className="absolute left-1/2 top-[220px] -translate-x-1/2 w-[4px] h-[calc(100%-300px)] pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 10 800" preserveAspectRatio="none" aria-hidden>
            <path className="svc-connector-path" d="M5 0 L5 800" stroke="#1f6fe6" strokeWidth="2" strokeLinecap="round" opacity="0.18" />
          </svg>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 relative z-10">
          {services.map((s) => (
            <article
              key={s.title}
              className="svc-card rounded-3xl overflow-hidden p-6 bg-[#fffdfb] border border-slate-100 shadow-xl transition-transform duration-300"
            >
              <div className="flex items-start gap-6">
                <div
                  className="svc-icon w-16 h-16 md:w-20 md:h-20 flex-shrink-0 rounded-xl bg-gradient-to-br from-[#0b2a5f] to-[#1f6fe6] flex items-center justify-center text-white shadow-lg"
                  aria-hidden
                >
                  {s.kind === 'code' && <CodeIcon />}
                  {s.kind === 'ux' && <UXIcon />}
                  {s.kind === 'mobile' && <MobileIcon />}
                  {s.kind === 'video' && <VideoIcon />}
                  {s.kind === 'marketing' && <MarketingIcon />}
                  {s.kind === 'seo' && <SEOIcon />}
                </div>

                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-slate-900">{s.title}</h4>
                  <p className="text-sm text-slate-600 mt-2">{s.desc}</p>

                  <div className="mt-5 inline-flex items-center gap-3">
                    <a href="#contact" className="svc-cta inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6] text-white px-4 py-2 text-sm font-semibold shadow hover:brightness-105 transition">
                      Get started
                    </a>
                    <a href="#case-studies" className="svc-link text-sm text-slate-500 hover:text-slate-700 transition-colors">
                      See case studies →
                    </a>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

   
      </div>

      <style jsx>{`
        .svc-card { transform-origin: center center; will-change: transform, opacity; cursor: default; }
        .svc-icon { will-change: transform, opacity; }
        @media (prefers-reduced-motion: reduce) {
          .svc-card, .svc-icon { transition: none !important; animation: none !important; transform: none !important; }
        }
      `}</style>
    </section>
  );
}

/* ---------- ICONS (unchanged) ---------- */
const CodeIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M8 10l-4 4 4 4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 10l4 4-4 4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const UXIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="3" y="4" width="18" height="16" rx="2" stroke="white" strokeWidth="1.4" />
    <path d="M7 8h10" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M7 12h6" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const MobileIcon = () => (
  <svg width="24" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="7" y="2" width="10" height="20" rx="2" stroke="white" strokeWidth="1.6" />
    <path d="M12 19h.01" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const VideoIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M3 5h13v14H3z" stroke="white" strokeWidth="1.4" />
    <path d="M16 8l5 4-5 4V8z" fill="white" />
  </svg>
);
const MarketingIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 12h16M12 4v16" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const SEOIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" stroke="white" strokeWidth="1.6" />
    <path d="M2 12h20M12 2v20" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

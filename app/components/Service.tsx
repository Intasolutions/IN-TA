// frontend/components/Services.tsx
'use client';

import React, { useEffect, useRef, ReactNode, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ---------- CommonButton component (with sheen) ---------- */

type CommonButtonProps = {
  variant?: 'primary' | 'ghost';
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  animate?: boolean; // allow consumer to disable animations
};

const CommonButton: React.FC<CommonButtonProps> = ({
  variant = 'primary',
  href,
  size = 'md',
  children,
  className = '',
  ariaLabel,
  animate = true,
}) => {
  const elRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
  const iconRef = useRef<HTMLSpanElement | null>(null);
  const sheenRef = useRef<HTMLSpanElement | null>(null);
  const idleTl = useRef<gsap.core.Timeline | null>(null);
  const sheenTl = useRef<gsap.core.Tween | null>(null);
  const enterTl = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || !animate;

    const el = elRef.current as HTMLElement | null;
    const icon = iconRef.current as HTMLElement | null;
    const sheen = sheenRef.current as HTMLElement | null;
    if (!el) return;

    // entrance pop (runs once when element first appears in viewport)
    const entrance = () => {
      try {
        enterTl.current = gsap.timeline();
        enterTl.current.fromTo(
          el,
          { autoAlpha: 0, scale: 0.96, y: 8 },
          { autoAlpha: 1, scale: 1, y: 0, duration: 0.36, ease: 'back.out(1.02)' }
        );
        if (icon) {
          enterTl.current.fromTo(icon, { x: -6, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.36, ease: 'power2.out' }, 0.06);
        }
      } catch { }
    };

    // idle gentle breathing loop for primary variant
    if (!reduced && variant === 'primary') {
      try {
        const tl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });
        tl.to(el, { scale: 1.02, duration: 3.6 }, 0);
        tl.to(el, { scale: 1.0, duration: 3.8 }, '>');
        // desync
        tl.progress(Math.random());
        idleTl.current = tl;
      } catch { }
    }

    // sheen setup: animate internal .sheen span across the button on hover
    const createSheen = () => {
      if (!sheen || reduced) return;
      try {
        // reset any existing
        sheen.style.transform = 'translateX(-120%) skewX(-18deg)';
        sheen.style.opacity = '0';
        sheenTl.current = gsap.to(sheen, {
          xPercent: 250,
          duration: 0.78,
          ease: 'power2.out',
          paused: true,
          onStart: () => { sheen.style.opacity = '0.95'; },
          onComplete: () => { sheen.style.opacity = '0'; },
        });
      } catch { }
    };

    createSheen();

    // create ScrollTrigger entrance so button animates as section reveals
    try {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 92%',
        onEnter: () => entrance(),
        once: true,
      });
    } catch { }

    // hover interactions
    const onEnter = () => {
      try {
        if (idleTl.current) idleTl.current.timeScale(0.35);
        gsap.killTweensOf(el);
        gsap.to(el, { scale: 1.06, y: -6, boxShadow: '0 18px 40px rgba(31,111,230,0.14)', duration: 0.18, ease: 'power2.out' });
        if (icon) gsap.to(icon, { x: 6, duration: 0.24, ease: 'power2.out' });
        // sheen play
        if (sheenTl.current) {
          sheenTl.current.restart();
        }
      } catch { }
    };
    const onLeave = () => {
      try {
        if (idleTl.current) idleTl.current.timeScale(1);
        gsap.to(el, { scale: 1.0, y: 0, boxShadow: '0 8px 20px rgba(2,6,23,0.06)', duration: 0.42, ease: 'power3.out' });
        if (icon) gsap.to(icon, { x: 0, duration: 0.36, ease: 'power3.out' });
      } catch { }
    };

    el.addEventListener('pointerenter', onEnter, { passive: true });
    el.addEventListener('pointerleave', onLeave, { passive: true });
    el.addEventListener('focus', onEnter, { passive: true });
    el.addEventListener('blur', onLeave, { passive: true });

    return () => {
      try {
        el.removeEventListener('pointerenter', onEnter);
        el.removeEventListener('pointerleave', onLeave);
        el.removeEventListener('focus', onEnter);
        el.removeEventListener('blur', onLeave);
      } catch { }
      try { idleTl.current?.kill(); } catch { }
      try { sheenTl.current?.kill(); } catch { }
      try { enterTl.current?.kill(); } catch { }
    };
  }, [variant, animate]);

  const base =
    'inline-flex items-center gap-3 font-semibold rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 transition-shadow relative overflow-hidden';

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm min-h-[38px]',
    md: 'px-4 py-2 text-sm min-h-[44px]',
    lg: 'px-5 py-3 text-base min-h-[50px]',
  };

  const primary = 'text-white shadow-lg bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6]';
  const ghost = 'text-slate-700 hover:text-slate-900 bg-transparent';

  const commonClass = `${base} ${sizes[size]} ${variant === 'primary' ? primary : ghost} ${className}`;

  const content = (
    <>
      <span className="relative z-10 flex items-center gap-2">
        <span>{children}</span>
      </span>

      {/* sheen element (absolute) */}
      {variant === 'primary' && (
        <span
          ref={sheenRef}
          aria-hidden
          className="sheen absolute inset-0 pointer-events-none transform -translate-x-[120%] skew-x-[-18deg] opacity-0"
          style={{ mixBlendMode: 'screen' }}
        />
      )}

      {/* arrow icon */}
      <span ref={iconRef} aria-hidden className="ml-1 relative z-10 transform transition-transform">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14" stroke={variant === 'primary' ? 'white' : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M12 5l7 7-7 7" stroke={variant === 'primary' ? 'white' : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </>
  );

  const sharedProps = {
    ref: elRef as any,
    className: commonClass,
    'aria-label': ariaLabel,
  } as any;

  if (href) {
    return (
      <a {...sharedProps} href={href} role="link">
        {content}
      </a>
    );
  }

  return (
    <button {...sharedProps} type="button">
      {content}
    </button>
  );
};

/* ---------- Services component (uses CommonButton and adds sheen to view-all) ---------- */

type ServiceData = {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  long_description: string;
  icon_key: 'code' | 'ux' | 'mobile' | 'video' | 'marketing' | 'seo';
  color?: string;
  icon?: string; // fallback if backend returns mapped icon
};

const TEMPO = 0.6;

export default function Services() {
  const wrapRef = useRef<HTMLElement | null>(null);
  const blobRef = useRef<SVGPathElement | null>(null);

  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);

  // store loops and handlers so we can pause/resume/kill reliably
  const cardLoops = useRef<Map<HTMLElement, gsap.core.Timeline>>(new Map());
  const iconLoops = useRef<Map<HTMLElement, gsap.core.Timeline>>(new Map());
  const handlers = useRef<Map<HTMLElement, { enter: () => void; leave: () => void }>>(new Map());

  // Fetch services from backend
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        const res = await fetch(`${apiBase}/api/services/`);
        if (!res.ok) throw new Error('Failed to fetch services');
        const data = await res.json();
        setServices(data);
      } catch (err) {
        console.error('Error loading services:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  useEffect(() => {
    // Only run animation setup if we have data and not loading
    if (loading || services.length === 0 || typeof window === 'undefined') return;

    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduce) {
      wrapRef.current?.querySelectorAll<HTMLElement>('.svc-reveal').forEach((el) => (el.style.opacity = '1'));
      wrapRef.current?.querySelectorAll<HTMLElement>('.svc-viewall').forEach((el) => (el.style.opacity = '1'));
      return;
    }

    // Wait a tick for DOM update
    let ctx: any;
    const timer = setTimeout(() => {
      ctx = gsap.context(() => {
        gsap.fromTo(
          '.svc-hero',
          { autoAlpha: 0, y: 22 },
          { autoAlpha: 1, y: 0, duration: 0.56 * TEMPO, ease: 'power3.out', scrollTrigger: { trigger: '.svc-hero', start: 'top 92%' } }
        );

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

        if (cards.length > 0) {
          ScrollTrigger.batch(cards, {
            start: 'top 88%',
            onEnter: (batch) => {
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
                    batch.forEach((c, idx) => {
                      const card = c as HTMLElement;
                      if (!cardLoops.current.has(card)) {
                        const pulseScale = gsap.utils.random(1.02, 1.06);
                        const settleScale = gsap.utils.random(1.003, 1.016);
                        const upY = gsap.utils.random(-10, -4);
                        const rotZ = gsap.utils.random(-3.2, 3.2);

                        const tl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });
                        tl.to(card, { scale: pulseScale, y: upY, rotationZ: rotZ, duration: 1.0 * TEMPO }, 0);
                        tl.to(card, { scale: settleScale, y: upY * 0.38, rotationZ: -rotZ * 0.35, duration: 3.0 * TEMPO }, `>-${0.06 * TEMPO}`);
                        tl.to(card, { scale: 1.02, duration: 4.2 * TEMPO }, '>');
                        tl.progress(Math.random());
                        cardLoops.current.set(card, tl);

                        const icon = card.querySelector<HTMLElement>('.svc-icon');
                        if (icon && !iconLoops.current.has(icon)) {
                          const iconTl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });
                          iconTl.to(icon, { scale: 0.985, y: -upY * 0.22, rotationZ: -rotZ * 0.9, duration: 0.9 * TEMPO }, 0);
                          iconTl.to(icon, { scale: 1.01, y: -upY * 0.08, rotationZ: rotZ * 0.45, duration: 1.8 * TEMPO }, `>-${0.04 * TEMPO}`);
                          gsap.fromTo(icon, { autoAlpha: 0, scale: 0.78, rotation: 6 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.36 * TEMPO, ease: 'back.out(1.02)', delay: idx * 0.02 });

                          iconTl.progress(Math.random());
                          iconLoops.current.set(icon, iconTl);
                        }

                        const onEnter = () => {
                          try {
                            const cTl = cardLoops.current.get(card);
                            if (cTl) cTl.timeScale(0.35);
                            if (icon) {
                              const iTl = iconLoops.current.get(icon as HTMLElement);
                              if (iTl) iTl.timeScale(0.35);
                            }
                            gsap.to(card, { scale: 1.06, y: -8, duration: 0.18 * TEMPO, ease: 'power2.out' });
                            if (icon) gsap.to(icon, { scale: 1.06, duration: 0.18 * TEMPO, ease: 'power2.out' });
                          } catch { }
                        };
                        const onLeave = () => {
                          try {
                            const cTl = cardLoops.current.get(card);
                            if (cTl) cTl.timeScale(1);
                            if (icon) {
                              const iTl = iconLoops.current.get(icon as HTMLElement);
                              if (iTl) iTl.timeScale(1);
                            }
                            gsap.to(card, { scale: 1.0, y: 0, duration: 0.5 * TEMPO, ease: 'power3.out' });
                            if (icon) gsap.to(icon, { scale: 1.0, duration: 0.5 * TEMPO, ease: 'power3.out' });
                          } catch { }
                        };

                        card.addEventListener('pointerenter', onEnter, { passive: true });
                        card.addEventListener('pointerleave', onLeave, { passive: true });
                        handlers.current.set(card, { enter: onEnter, leave: onLeave });
                      }
                    });
                  },
                }
              );
            },
            onEnterBack: (batch) => {
              gsap.fromTo(batch, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.56 * TEMPO, stagger: 0.05, ease: 'power3.out' });
            },
          });
        }

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
          } catch { }
        }

        // Animate the "View all services" button when it appears and add a subtle idle float
        try {
          const view = document.querySelector<HTMLElement>('.svc-viewall');
          if (view) {
            gsap.fromTo(
              view,
              { autoAlpha: 0, y: 16 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.56 * TEMPO,
                ease: 'power3.out',
                scrollTrigger: { trigger: view, start: 'top 92%' },
              }
            );

            // small idle float to make it feel alive (slow subtle)
            const idle = gsap.timeline({ repeat: -1, yoyo: true });
            idle.to(view, { y: -4, duration: 6.8, ease: 'sine.inOut' }, 0);
            idle.to(view, { scale: 1.005, duration: 6.8, ease: 'sine.inOut' }, 0);
            idle.progress(Math.random());
          }
        } catch { }
      }, wrapRef);
    }, 100);

    return () => {
      try {
        handlers.current.forEach((h, card) => {
          try { card.removeEventListener('pointerenter', h.enter); } catch { }
          try { card.removeEventListener('pointerleave', h.leave); } catch { }
        });
        handlers.current.clear();
      } catch { }

      try { cardLoops.current.forEach((tl) => tl.kill()); } catch { }
      try { iconLoops.current.forEach((tl) => tl.kill()); } catch { }
      try { ctx?.revert(); } catch { }
      try { ScrollTrigger.getAll().forEach(t => t.kill()); } catch { }
      cardLoops.current.clear();
      iconLoops.current.clear();
      clearTimeout(timer);
    };
  }, [loading, services]);

  const getIcon = (key: string) => {
    switch (key) {
      case 'code': return <CodeIcon />;
      case 'ux': return <UXIcon />;
      case 'mobile': return <MobileIcon />;
      case 'video': return <VideoIcon />;
      case 'marketing': return <MarketingIcon />;
      case 'seo': return <SEOIcon />;
      default: return <CodeIcon />;
    }
  };

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
          <p className="text-xl font-semibold tracking-wider text-slate-700 mb-2">OUR SERVICES</p>
        </div>

        {/* connector */}
        <div className="absolute left-1/2 top-[220px] -translate-x-1/2 w-[4px] h-[calc(100%-300px)] pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 10 800" preserveAspectRatio="none" aria-hidden>
            <path className="svc-connector-path" d="M5 0 L5 800" stroke="#1f6fe6" strokeWidth="2" strokeLinecap="round" opacity="0.18" />
          </svg>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64 text-slate-500">
            Loading services...
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 relative z-10">
            {services.map((s) => (
              <article
                key={s.id}
                className="svc-card rounded-3xl overflow-hidden p-6 bg-[#fffdfb] border border-slate-100 shadow-xl transition-transform duration-300"
              >
                <div className="flex items-start gap-6">
                  <div
                    className="svc-icon w-16 h-16 md:w-20 md:h-20 flex-shrink-0 rounded-xl bg-gradient-to-br from-[#0b2a5f] to-[#1f6fe6] flex items-center justify-center text-white shadow-lg"
                    aria-hidden
                  >
                    {getIcon(s.icon_key)}
                  </div>

                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-slate-900">{s.title}</h4>
                    <p className="text-sm text-slate-600 mt-2 line-clamp-3">{s.long_description || s.short_description}</p>



                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Centered "View all services" button */}
        {!loading && (
          <div className="mt-12 text-center z-10 relative">
            <a
              href="/services"
              className="svc-viewall inline-flex items-center gap-3 rounded-full text-white px-6 py-3 text-lg font-semibold shadow-xl transition-transform relative overflow-hidden"
              aria-label="View all services"
              style={{ background: 'linear-gradient(90deg, #0b2a5f 0%, #1f6fe6 100%)' }}
            >
              <span className="relative z-10">View all services</span>

              {/* sheen span for viewall button */}
              <span className="sheen absolute inset-0 pointer-events-none transform -translate-x-[120%] skew-x-[-18deg] opacity-0" style={{ mixBlendMode: 'screen' }} />

              <svg className="relative z-10" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 12h14" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M12 5l7 7-7 7" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        )}
      </div>

      <style jsx>{`
        .svc-card { transform-origin: center center; will-change: transform, opacity; cursor: default; }
        .svc-icon { will-change: transform, opacity; }
        .svc-hero a { text-decoration: none; }

        /* sheen visuals: a soft white diagonal band with low opacity to give premium sheen */
        .sheen {
          background: linear-gradient(90deg, rgba(255,255,255,0.0) 0%, rgba(255,255,255,0.85) 45%, rgba(255,255,255,0.0) 100%);
          width: 40%;
          pointer-events: none;
        }

        /* For the small primary CTAs inside cards we ensure the sheen is clipped nicely */
        .svc-cta { position: relative; overflow: hidden; }
        .svc-cta .sheen { width: 60%; }

        .svc-viewall { transform: translateZ(0); will-change: transform, opacity; }

        /* keyboard focus polish */
        .svc-viewall:focus-visible, .svc-cta:focus-visible { box-shadow: 0 10px 30px rgba(2,6,23,0.12), 0 0 0 4px rgba(31,111,230,0.12); }

        @media (prefers-reduced-motion: reduce) {
          .svc-card, .svc-icon, .svc-viewall, .svc-cta .sheen { transition: none !important; animation: none !important; transform: none !important; }
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
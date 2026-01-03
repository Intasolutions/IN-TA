// frontend/components/TestimonialSlider.fullwidth.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type Testimonial = {
  id: string;
  name: string;
  role?: string;
  quote: string;
  avatar?: string;
  company?: string;
};

// Static data removed as per user request


const TEMPO = 0.60;

export default function TestimonialSlider() {
  const [data, setData] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  // Use either props or fetched data, but default to props if provided
  // If no props provided, we fetch.
  // Actually the component prop default is DEFAULT_TESTIMONIALS so it always has data.
  // We want to override if we can fetch from API? 
  // The user request is to "make backend for that".
  // So we should fetch from backend.

  useEffect(() => {
    async function fetchData() {
      try {
        // Construct backend URL dynamically based on current hostname
        // This assumes backend is always on port 8000 of the same host
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const backendUrl = `${protocol}//${hostname}:8000`;

        const res = await fetch(`${backendUrl}/api/home/testimonials/`);
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          // Map backend fields to frontend fields
          const mapped: Testimonial[] = json.map((item: any) => ({
            id: item.id.toString(),
            name: item.name,
            role: item.role || '',
            quote: item.quote,
            avatar: item.avatar ? (item.avatar.startsWith('http') ? item.avatar : `${backendUrl}${item.avatar}`) : undefined,
            company: item.company || '',
          }));
          setData(mapped);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Use fetched data if available, otherwise fall back to props (which defaults to static)
  // But strictly speaking we should probably just use the fetched data if we want backend integration.
  // Let's use fetched data if we have it, else defaults.
  // Use fetched data only
  const activeTestimonials = data;

  const wrapRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const floatTweens = useRef<gsap.core.Tween[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const prefersReduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const rimRef = useRef<HTMLDivElement | null>(null);
  const sparkleLayerRef = useRef<HTMLDivElement | null>(null);
  const sparkleTweens = useRef<gsap.core.Tween[]>([]);
  const sparkleEls = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!wrapRef.current || !trackRef.current) return;
    // Removed loading check to allow animation to start immediately with default data
    // If data loads later, the effect will re-run correctly.

    try { tlRef.current?.kill(); } catch { }
    floatTweens.current.forEach(t => t.kill());
    floatTweens.current = [];

    if (prefersReduce) {
      gsap.set(trackRef.current, { x: 0 });
      if (rimRef.current) gsap.set(rimRef.current, { x: 0, opacity: 0 });
      return;
    }

    const track = trackRef.current!;
    // Important: querySelectorAll might not find elements if they are not rendered yet.
    // We need to make sure we depend on activeTestimonials.

    // We need to wait for render.
    const runAnimation = () => {
      const originals = Array.from(track.querySelectorAll<HTMLElement>('.ts-card-original'));
      if (!originals.length) return;

      let totalW = 0;
      originals.slice(0, activeTestimonials.length).forEach(el => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const mr = parseFloat(style.marginRight || '0');
        totalW += r.width + mr;
      });

      gsap.set(track, { x: 0 });

      const base = Math.max(6 * TEMPO, (totalW / 90) * TEMPO);
      const duration = Math.max(6 * TEMPO, base);

      const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'linear' } });
      tl.to(track, { x: -totalW, duration, ease: 'linear' });
      tl.set(track, { x: 0 });
      tlRef.current = tl;

      const cards = Array.from(track.querySelectorAll<HTMLElement>('.ts-card'));
      cards.forEach((card, i) => {
        const t = gsap.to(card, {
          y: gsap.utils.random(-6, -2),
          rotation: gsap.utils.random(-0.6, 0.6),
          duration: gsap.utils.random(2.2 * TEMPO, 3.8 * TEMPO),
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
          delay: i * 0.04,
        });
        floatTweens.current.push(t);
      });

      if (rimRef.current && wrapRef.current) {
        try {
          const wrapEl = wrapRef.current;
          const rim = rimRef.current;
          gsap.set(rim, { x: -120, opacity: 0 });
          gsap.to(rim, {
            x: () => wrapEl.getBoundingClientRect().width + 160,
            opacity: 1,
            duration: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: wrapEl,
              start: 'top 95%',
              end: 'bottom 15%',
              scrub: 0.9,
              invalidateOnRefresh: true,
            },
          });
        } catch { }
      }

      if (!isPlaying) tl.pause();
    };

    // Small delay to ensure DOM is ready? logic was fine before.
    runAnimation();

    const wrap = wrapRef.current!;
    let slowTO: number | null = null;
    const onEnter = () => {
      try { tlRef.current?.pause(); } catch { }
      floatTweens.current.forEach(t => t.pause());
      setIsPlaying(false);
    };
    const onLeave = () => {
      try { tlRef.current?.resume(); } catch { }
      floatTweens.current.forEach(t => t.resume());
      setIsPlaying(true);
    };
    const onMove = () => {
      if (!tlRef.current) return;
      gsap.to(tlRef.current, { timeScale: 0.18, duration: 0.25, ease: 'power3.out' });
      if (slowTO) window.clearTimeout(slowTO);
      slowTO = window.setTimeout(() => gsap.to(tlRef.current!, { timeScale: 1, duration: 0.9, ease: 'power3.out' }), 420);
    };

    wrap.addEventListener('pointerenter', onEnter, { passive: true });
    wrap.addEventListener('pointerleave', onLeave, { passive: true });
    wrap.addEventListener('pointermove', onMove, { passive: true });
    wrap.addEventListener('focusin', onEnter);
    wrap.addEventListener('focusout', onLeave);

    const onKey = (e: KeyboardEvent) => {
      if (!(document.activeElement && wrap.contains(document.activeElement))) return;
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      try { wrap.removeEventListener('pointerenter', onEnter); } catch { }
      try { wrap.removeEventListener('pointerleave', onLeave); } catch { }
      try { wrap.removeEventListener('pointermove', onMove); } catch { }
      try { wrap.removeEventListener('focusin', onEnter); } catch { }
      try { wrap.removeEventListener('focusout', onLeave); } catch { }
      try { window.removeEventListener('keydown', onKey); } catch { }
      if (slowTO) window.clearTimeout(slowTO);
      try { tlRef.current?.kill(); } catch { }
      floatTweens.current.forEach(t => t.kill());
    };
  }, [activeTestimonials.length, isPlaying, prefersReduce]); // Depend on activeTestimonials

  // Sparkles (same as before)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (prefersReduce) return;
    const layer = sparkleLayerRef.current;
    const track = trackRef.current;
    if (!layer || !track) return;

    sparkleTweens.current.forEach(t => t.kill());
    sparkleTweens.current = [];
    sparkleEls.current.forEach(e => e.remove());
    sparkleEls.current = [];

    const originals = Array.from(track.querySelectorAll<HTMLElement>('.ts-card-original'));
    if (!originals.length) return;

    let totalW = 0;
    originals.slice(0, activeTestimonials.length).forEach(el => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const mr = parseFloat(style.marginRight || '0');
      totalW += r.width + mr;
    });

    const containerWidth = track.getBoundingClientRect().width || window.innerWidth;
    const travelWidth = Math.max(totalW, containerWidth * 0.8);

    const base = Math.max(6 * TEMPO, (totalW / 90) * TEMPO);
    const marqueeDuration = Math.max(6 * TEMPO, base);

    const count = 28;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'sparkle';
      layer.appendChild(el);
      sparkleEls.current.push(el);

      const y = gsap.utils.random(12, 120);
      const startX = gsap.utils.random(0, travelWidth);
      const scale = gsap.utils.random(0.28, 0.98);
      const opacity = gsap.utils.random(0.08, 0.5);

      gsap.set(el, {
        x: startX,
        y,
        scale,
        opacity,
        transformOrigin: 'center center',
      });

      const speedFactor = gsap.utils.random(0.6, 1.6);
      const dur = Math.max(2.4, marqueeDuration * speedFactor * gsap.utils.random(0.55, 1.18));

      const t1 = gsap.to(el, {
        x: `-=${travelWidth + 140}`,
        duration: dur,
        ease: 'linear',
        repeat: -1,
        delay: gsap.utils.random(0, 1.4),
      });

      const t2 = gsap.to(el, {
        y: `+=${gsap.utils.random(-8, 8)}`,
        opacity: gsap.utils.random(opacity * 0.6, opacity * 1.0),
        duration: gsap.utils.random(1.6, 3.6),
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });

      sparkleTweens.current.push(t1, t2);
    }

    return () => {
      try { sparkleTweens.current.forEach(t => t.kill()); } catch { }
      sparkleTweens.current = [];
      try { sparkleEls.current.forEach(e => e.remove()); } catch { }
      sparkleEls.current = [];
    };
  }, [activeTestimonials.length, prefersReduce]);

  const togglePlay = () => {
    if (prefersReduce) return;
    const tl = tlRef.current;
    if (!tl) return;
    if (tl.paused()) {
      tl.play();
      floatTweens.current.forEach(t => t.resume());
      sparkleTweens.current.forEach(t => t.resume());
      setIsPlaying(true);
    } else {
      tl.pause();
      floatTweens.current.forEach(t => t.pause());
      sparkleTweens.current.forEach(t => t.pause());
      setIsPlaying(false);
    }
  };

  return (
    <section ref={wrapRef} className="w-full relative py-16 bg-[#f9f8f6] overflow-hidden" aria-label="Client testimonials">
      <div className="pointer-events-none absolute inset-0 -z-20">
        <div ref={sparkleLayerRef} id="sparkle-layer" className="absolute inset-0 opacity-70" style={{ overflow: 'hidden', pointerEvents: 'none' }} />
      </div>

      <div className="relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="mb-6 text-center">
            <p className="text-lg font-semibold tracking-wide text-slate-600">WHAT CLIENTS SAY</p>

          </div>
        </div>

        {/* marquee wrapper with pseudo-element shades */}
        <div className="relative mt-6">
          <div className="marquee-wrap mx-auto w-full">
            <div className="relative overflow-visible rounded-2xl p-6 bg-gradient-to-tl max-w-full">
              <div ref={rimRef} aria-hidden="true" className="absolute top-4 left-1/2 -translate-x-1/2 h-[6px] w-72 rounded-full pointer-events-none -z-10" />
              <div ref={trackRef} className="flex gap-6 items-stretch will-change-transform px-6" style={{ touchAction: 'pan-y' }}>


                {/* Original set for measurement and first part of loop */}
                {activeTestimonials.map((t) => (
                  <article key={`a-${t.id}`} className="ts-card ts-card-original w-[320px] min-w-[260px] md:w-[360px] md:min-w-[320px] rounded-2xl bg-white p-5 flex flex-col gap-3 border border-slate-100 shadow-md" role="group" tabIndex={0} aria-label={`${t.name}, ${t.role}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                        {t.avatar ? <Image src={t.avatar} alt={t.name} width={48} height={48} className="object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-[#eef4ff] to-[#fff]" />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                        <div className="text-xs text-slate-500">{t.role} {t.company ? `— ${t.company}` : ''}</div>
                      </div>
                    </div>
                    <blockquote className="text-sm text-slate-600 mt-3 flex-1">“{t.quote}”</blockquote>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 bg-[#1f6fe6]/10 rounded-full flex-1" />
                      <div className="text-xs text-slate-400">Verified</div>
                    </div>
                  </article>
                ))}

                {activeTestimonials.map((t) => (
                  <article key={`b-${t.id}`} aria-hidden className="ts-card w-[320px] min-w-[260px] md:w-[360px] md:min-w-[320px] rounded-2xl bg-white p-5 flex flex-col gap-3 border border-slate-100 shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                        {t.avatar ? <Image src={t.avatar} alt={t.name} width={48} height={48} className="object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-[#eef4ff] to-[#fff]" />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                        <div className="text-xs text-slate-500">{t.role} {t.company ? `— ${t.company}` : ''}</div>
                      </div>
                    </div>
                    <blockquote className="text-sm text-slate-600 mt-3 flex-1">“{t.quote}”</blockquote>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 bg-[#1f6fe6]/10 rounded-full flex-1" />
                      <div className="text-xs text-slate-400">Verified</div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 pointer-events-none -z-10 flex justify-between px-6">
            <div aria-hidden="true" style={{ width: 160, height: 48, boxShadow: 'inset 20px 0 40px -24px rgba(11,42,95,0.06)' }} />
            <div aria-hidden="true" style={{ width: 160, height: 48, boxShadow: 'inset -20px 0 40px -24px rgba(11,42,95,0.06)' }} />
          </div>
        </div>

      </div>

      <style jsx>{`
        .ts-card { min-height: 150px; transition: transform 300ms cubic-bezier(.2,.9,.2,1), box-shadow 300ms ease; }
        .ts-card:focus { box-shadow: 0 18px 40px rgba(11,42,95,0.08); transform: translateY(-6px) scale(1.01); outline: none; }

        #sparkle-layer .sparkle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0) 80%);
          filter: blur(2px) saturate(1.1);
          pointer-events: none;
          mix-blend-mode: screen;
          transform: translate3d(0,0,0);
          will-change: transform, opacity;
        }

        #sparkle-layer .sparkle:nth-child(5n) {
          width: 10px;
          height: 10px;
          background: radial-gradient(circle, rgba(230,240,255,1) 0%, rgba(230,240,255,0.55) 35%, rgba(230,240,255,0) 70%);
          filter: blur(6px) saturate(1.1);
          opacity: 0.28;
        }

        /* marquee wrapper with professional end shades */
        .marquee-wrap {
          --shade-width: 20rem; /* adjust how wide the shade is */
          position: relative;
        }

        /* left and right grainy shades using pseudo elements */
        .marquee-wrap::before,
        .marquee-wrap::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          width: var(--shade-width);
          pointer-events: none;
          z-index: 1;
          opacity: 1; /* your requested ~60% */
          mix-blend-mode: normal;
          background-repeat: repeat;
          background-size: auto 120px;
          /* subtle edge gradient + soft grain */
          background-image:
  linear-gradient(90deg, rgba(255,253,251,0.98) 0%, rgba(255,253,251,0.0) 70%),
  url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='noise'><feTurbulence baseFrequency='0.75' numOctaves='1' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23noise)' opacity='0.06' fill='%23fffdfb'/></svg>");
      }

        .marquee-wrap::before { left: 0; transform: translateZ(0); }
        .marquee-wrap::after { right: 0; transform: translateZ(0) rotateY(180deg); }

        /* keep the overlay visually behind cards but above container background */
        .marquee-wrap > .relative { position: relative; z-index: 0; }

        @media (prefers-reduced-motion: reduce) {
          .ts-card, .ts-card * { transition: none !important; animation: none !important; transform: none !important; }
          #sparkle-layer .sparkle { display: none !important; }
        }
      `}</style>
    </section>
  );
}

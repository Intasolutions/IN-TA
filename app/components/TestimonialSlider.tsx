// frontend/components/TestimonialSlider.tsx
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

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  { id: 't1', name: 'Priya Sharma', role: 'Head of Product — LuxHomes', quote: 'They redesigned our product experience and the conversion lift was obvious. Motion, detail and performance — all top tier.', avatar: '/portfolio/qma.png', company: 'LuxHomes' },
  { id: 't2', name: 'Rahul Mehta', role: 'CTO — BlueCart', quote: 'Engineering quality and design sensibility in one team. We shipped faster with fewer regressions — highly recommended.', avatar: '/avatars/p2.jpg', company: 'BlueCart' },
  { id: 't3', name: 'Sara Lee', role: 'Marketing Lead — Nova', quote: 'The campaigns and motion work lifted engagement and brand recall. The videos simply performed across channels.', avatar: '/avatars/p3.jpg', company: 'Nova' },
  { id: 't4', name: 'Anders Holm', role: 'Founder — Craftly', quote: 'From concept to launch, the process was smooth. Their attention to micro-interaction made our product feel premium.', avatar: '/avatars/p4.jpg', company: 'Craftly' },
];

const TEMPO = 0.60; // medium-fast buttery feel (smaller -> faster)

export default function TestimonialSlider({ testimonials = DEFAULT_TESTIMONIALS }: { testimonials?: Testimonial[] }) {
  const wrapRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const floatTweens = useRef<gsap.core.Tween[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const prefersReduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // rim-light + sparkle container refs
  const rimRef = useRef<HTMLDivElement | null>(null);
  const sparkleLayerRef = useRef<HTMLDivElement | null>(null);
  // store sparkle tweens for cleanup
  const sparkleTweens = useRef<gsap.core.Tween[]>([]);
  const sparkleEls = useRef<HTMLDivElement[]>([]);

  // Main marquee + card float effect
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!wrapRef.current || !trackRef.current) return;

    // cleanup previous
    try { tlRef.current?.kill(); } catch {}
    floatTweens.current.forEach(t => t.kill());
    floatTweens.current = [];

    if (prefersReduce) {
      gsap.set(trackRef.current, { x: 0 });
      if (rimRef.current) gsap.set(rimRef.current, { x: 0, opacity: 0 });
      return;
    }

    const track = trackRef.current!;
    // build width of one set (original items)
    const originals = Array.from(track.querySelectorAll<HTMLElement>('.ts-card-original'));
    if (!originals.length) return;

    let totalW = 0;
    originals.slice(0, testimonials.length).forEach(el => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const mr = parseFloat(style.marginRight || '0');
      totalW += r.width + mr;
    });

    // ensure track at start
    gsap.set(track, { x: 0 });

    // duration scaled by width and TEMPO
    const base = Math.max(6 * TEMPO, (totalW / 90) * TEMPO);
    const duration = Math.max(6 * TEMPO, base);

    // marquee timeline: move set left by totalW, then jump back -> seamless
    const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'linear' } });
    tl.to(track, { x: -totalW, duration, ease: 'linear' });
    tl.set(track, { x: 0 });
    tlRef.current = tl;

    // floating micro motion per card
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

    // rim-light: animate along track as user scrolls through section
    if (rimRef.current && wrapRef.current) {
      try {
        const wrapEl = wrapRef.current;
        const rim = rimRef.current;
        // set initial style
        gsap.set(rim, { x: -120, opacity: 0 });
        // scroll-triggered scrub: travel from left to right slightly as section scrolls
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
      } catch {}
    }

    // Respect initial playing state
    if (!isPlaying) tl.pause();

    // pointer interactions: pause on hover, slow on move
    const wrap = wrapRef.current!;
    let slowTO: number | null = null;
    const onEnter = () => {
      try { tlRef.current?.pause(); } catch {}
      floatTweens.current.forEach(t => t.pause());
      setIsPlaying(false);
    };
    const onLeave = () => {
      try { tlRef.current?.resume(); } catch {}
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

    // keyboard toggle: Space to pause/resume when focused inside
    const onKey = (e: KeyboardEvent) => {
      if (!(document.activeElement && wrap.contains(document.activeElement))) return;
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      try { wrap.removeEventListener('pointerenter', onEnter); } catch {}
      try { wrap.removeEventListener('pointerleave', onLeave); } catch {}
      try { wrap.removeEventListener('pointermove', onMove); } catch {}
      try { wrap.removeEventListener('focusin', onEnter); } catch {}
      try { wrap.removeEventListener('focusout', onLeave); } catch {}
      try { window.removeEventListener('keydown', onKey); } catch {}
      if (slowTO) window.clearTimeout(slowTO);
      try { tlRef.current?.kill(); } catch {}
      floatTweens.current.forEach(t => t.kill());
    };
  }, [testimonials.length, isPlaying, prefersReduce]);

  // Sparkles now synchronized to marquee: particles move across same distance & similar duration
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (prefersReduce) return;
    const layer = sparkleLayerRef.current;
    const track = trackRef.current;
    if (!layer || !track) return;

    // cleanup previous
    sparkleTweens.current.forEach(t => t.kill());
    sparkleTweens.current = [];
    sparkleEls.current.forEach(e => e.remove());
    sparkleEls.current = [];

    // measure marquee width & duration like marquee effect
    const originals = Array.from(track.querySelectorAll<HTMLElement>('.ts-card-original'));
    if (!originals.length) return;

    let totalW = 0;
    originals.slice(0, testimonials.length).forEach(el => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const mr = parseFloat(style.marginRight || '0');
      totalW += r.width + mr;
    });

    // fallback to container width if something odd
    const containerWidth = track.getBoundingClientRect().width || window.innerWidth;
    const travelWidth = Math.max(totalW, containerWidth * 0.8);

    const base = Math.max(6 * TEMPO, (totalW / 90) * TEMPO);
    const marqueeDuration = Math.max(6 * TEMPO, base);

    // create layered sparkles
    const count = 28;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'sparkle';
      // place inside layer
      layer.appendChild(el);
      sparkleEls.current.push(el);

      // random vertical band inside the visible area (so sparks appear near cards)
      const y = gsap.utils.random(12, 120);
      // random initial x between 0..travelWidth
      const startX = gsap.utils.random(0, travelWidth);
      // scale & opacity
      const scale = gsap.utils.random(0.28, 0.98);
      const opacity = gsap.utils.random(0.08, 0.5);

      gsap.set(el, {
        x: startX,
        y,
        scale,
        opacity,
        transformOrigin: 'center center',
      });

      // Each sparkle travels left roughly same distance as marquee but with random speed offset to create parallax
      const speedFactor = gsap.utils.random(0.6, 1.6);
      const dur = Math.max(2.4, marqueeDuration * speedFactor * gsap.utils.random(0.55, 1.18));

      // horizontal travel (looping)
      const t1 = gsap.to(el, {
        x: `-=${travelWidth + 140}`, // move left across area and a bit extra
        duration: dur,
        ease: 'linear',
        repeat: -1,
        delay: gsap.utils.random(0, 1.4),
      });

      // subtle vertical float + opacity shimmer
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

    // cleanup
    return () => {
      try { sparkleTweens.current.forEach(t => t.kill()); } catch {}
      sparkleTweens.current = [];
      try { sparkleEls.current.forEach(e => e.remove()); } catch {}
      sparkleEls.current = [];
    };
  }, [testimonials.length, prefersReduce]);

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
    <section ref={wrapRef} className="relative py-14 px-6 md:px-20 bg-[#fffdfb] overflow-hidden" aria-label="Client testimonials">
      {/* sparkle background layer (container only) */}
      <div className="pointer-events-none absolute inset-0 -z-20">
        <div
          ref={sparkleLayerRef}
          id="sparkle-layer"
          className="absolute inset-0 opacity-70"
          style={{ overflow: 'hidden', pointerEvents: 'none' }}
        />

        {/* soft vignette to add depth */}
        <div aria-hidden className="absolute inset-0 -z-10">
          <div style={{ mixBlendMode: 'multiply' }} className="absolute inset-0 bg-gradient-to-b from-transparent to-[#fffaf8] opacity-80" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-6">
          <p className="text-sm font-semibold tracking-wide text-slate-600">WHAT CLIENTS SAY</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#0b2a5f] mt-2">Trusted by teams around the world</h2>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-tl from-white to-[#f8f7f5] border border-slate-100 shadow-xl">
          {/* left / right premium edge fades */}
          <div
            aria-hidden
            className="absolute left-0 top-0 bottom-0 w-40 md:w-52 pointer-events-none -z-10"
            style={{
              background: 'linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.88) 30%, rgba(255,255,255,0) 100%)',
              backdropFilter: 'blur(14px)',
            }}
          />
          <div
            aria-hidden
            className="absolute right-0 top-0 bottom-0 w-40 md:w-52 pointer-events-none -z-10"
            style={{
              background: 'linear-gradient(270deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.88) 30%, rgba(255,255,255,0) 100%)',
              backdropFilter: 'blur(14px)',
            }}
          />

          {/* rim light element (thin gradient line that travels across while scrolling) */}
          <div
            ref={rimRef}
            aria-hidden
            className="absolute top-4 left-0 h-[6px] w-40 rounded-full pointer-events-none -z-5"
            style={{
              background: 'linear-gradient(90deg, rgba(230,240,255,0) 0%, rgba(230,240,255,0.95) 35%, rgba(230,240,255,0) 100%)',
              filter: 'blur(12px)',
              opacity: 0.2,
            }}
          />

          <div
            ref={trackRef}
            className="flex gap-6 items-stretch will-change-transform"
            style={{ touchAction: 'pan-y' }}
          >

            {/* First set (original) */}
            {testimonials.map((t) => (
              <article
                key={`a-${t.id}`}
                className="ts-card ts-card-original w-[320px] min-w-[260px] md:w-[360px] md:min-w-[320px] rounded-2xl bg-white p-5 flex flex-col gap-3 border border-slate-100 shadow-md"
                role="group"
                tabIndex={0}
                aria-label={`${t.name}, ${t.role}`}
              >
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

            {/* Duplicate set to create seamless loop */}
            {testimonials.map((t) => (
              <article
                key={`b-${t.id}`}
                aria-hidden
                className="ts-card w-[320px] min-w-[260px] md:w-[360px] md:min-w-[320px] rounded-2xl bg-white p-5 flex flex-col gap-3 border border-slate-100 shadow-md"
              >
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

        <div className="mt-4 text-sm text-slate-500">Hover to pause • Space to toggle when focused</div>
      </div>

      <style jsx>{`
        section { -webkit-font-smoothing: antialiased; }
        .ts-card { min-height: 150px; transition: transform 300ms cubic-bezier(.2,.9,.2,1), box-shadow 300ms ease; }
        .ts-card:focus { box-shadow: 0 18px 40px rgba(11,42,95,0.08); transform: translateY(-6px) scale(1.01); outline: none; }

        /* sparkle elements (created dynamically) */
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

        /* add a slightly larger subtle glow for some sparks via nth-child when inserted */
        #sparkle-layer .sparkle:nth-child(5n) {
          width: 10px;
          height: 10px;
          background: radial-gradient(circle, rgba(230,240,255,1) 0%, rgba(230,240,255,0.55) 35%, rgba(230,240,255,0) 70%);
          filter: blur(6px) saturate(1.1);
          opacity: 0.28;
        }

        /* rim-light class (visual fallback) */
        .rim-fade { pointer-events: none; }

        @media (prefers-reduced-motion: reduce) {
          .ts-card, .ts-card * { transition: none !important; animation: none !important; transform: none !important; }
          #sparkle-layer .sparkle { display: none !important; }
        }
      `}</style>
    </section>
  );
}

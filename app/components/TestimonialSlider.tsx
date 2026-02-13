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

const TEMPO = 0.60;

export default function TestimonialSlider() {
  const [data, setData] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        const res = await fetch(`${apiBase}/api/home/testimonials/`);
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        
        if (Array.isArray(json) && json.length > 0) {
          const mapped: Testimonial[] = json.map((item: any) => ({
            id: item.id.toString(),
            name: item.name,
            role: item.role || '',
            quote: item.quote,
            avatar: (() => {
              const a = item.avatar;
              if (!a) return undefined;
              if (a.startsWith('/')) return `${apiBase}${a}`;
              if (a.includes('localhost') || a.includes('127.0.0.1')) {
                 try {
                   const url = new URL(a);
                   return `${apiBase}${url.pathname}${url.search}`;
                 } catch { return a; }
              }
              return a;
            })(),
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

  const activeTestimonials = data;
  const wrapRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const floatTweens = useRef<gsap.core.Tween[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const prefersReduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sparkleLayerRef = useRef<HTMLDivElement | null>(null);
  const sparkleTweens = useRef<gsap.core.Tween[]>([]);
  const sparkleEls = useRef<HTMLDivElement[]>([]);

  // Main Marquee & Floating Animation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!wrapRef.current || !trackRef.current) return;

    try { tlRef.current?.kill(); } catch { }
    floatTweens.current.forEach(t => t.kill());
    floatTweens.current = [];

    if (prefersReduce) {
      gsap.set(trackRef.current, { x: 0 });
      return;
    }

    const track = trackRef.current!;

    const runAnimation = () => {
      const originals = Array.from(track.querySelectorAll<HTMLElement>('.ts-card-original'));
      if (!originals.length) return;

      let totalW = 0;
      originals.slice(0, activeTestimonials.length).forEach(el => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const mr = parseFloat(style.marginRight || '0');
        const ml = parseFloat(style.marginLeft || '0');
        totalW += r.width + mr + ml;
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
          y: gsap.utils.random(-8, -3),
          rotation: gsap.utils.random(-0.4, 0.4),
          duration: gsap.utils.random(2.2 * TEMPO, 3.8 * TEMPO),
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
          delay: i * 0.04,
        });
        floatTweens.current.push(t);
      });

      if (!isPlaying) tl.pause();
    };

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

    return () => {
      try { wrap.removeEventListener('pointerenter', onEnter); } catch { }
      try { wrap.removeEventListener('pointerleave', onLeave); } catch { }
      try { wrap.removeEventListener('pointermove', onMove); } catch { }
      try { wrap.removeEventListener('focusin', onEnter); } catch { }
      try { wrap.removeEventListener('focusout', onLeave); } catch { }
      if (slowTO) window.clearTimeout(slowTO);
      try { tlRef.current?.kill(); } catch { }
      floatTweens.current.forEach(t => t.kill());
    };
  }, [activeTestimonials.length, isPlaying, prefersReduce]);

  // Render Star SVG
  const renderStars = () => (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <svg key={i} className="w-6 h-6 text-[#FFC107]" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );

  const CardContent = ({ t, isOriginal }: { t: Testimonial; isOriginal?: boolean }) => (
    <article 
      className={`ts-card ${isOriginal ? 'ts-card-original' : ''} relative w-[340px] md:w-[480px] rounded-[2rem] bg-white p-8 md:p-10 flex flex-col mt-12 mb-16 shadow-2xl shrink-0`}
    >
      {/* Top Left Quote Icon */}
      <div className="absolute -top-4 left-4 md:left-8 text-[#5B75F0] text-[6rem] font-serif leading-none select-none drop-shadow-sm z-20">“</div>

      {/* Floating Profile Badge */}
      <div className="absolute -top-7 right-4 md:right-10 bg-[#0B44C9] rounded-[2rem] flex items-center p-1.5 pr-6 shadow-xl z-20 transition-transform hover:scale-105">
        <div className="w-12 h-12 rounded-full bg-[#051A4D] flex items-center justify-center shrink-0 border-2 border-transparent overflow-hidden">
          {t.avatar ? (
            <Image src={t.avatar} alt={t.name} width={48} height={48} className="object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-blue-600" />
          )}
        </div>
        <div className="ml-3 flex flex-col justify-center">
          <span className="text-white font-bold text-[15px] leading-tight tracking-wide">{t.company || t.name}</span>
          <span className="text-blue-200 text-sm leading-tight mt-0.5">{t.company ? t.name : t.role}</span>
        </div>
      </div>

      {/* Quote Body */}
      <blockquote className="text-[15px] md:text-[17px] text-slate-600 leading-relaxed z-10 relative mt-6 font-medium">
        {t.quote}
      </blockquote>

      {/* Bottom Section (Stars) */}
      <div className="mt-8 pt-5 border-t border-slate-200 w-full max-w-[160px]">
        {renderStars()}
      </div>

      {/* Bottom Right Quote Icon */}
      <div className="absolute -bottom-14 right-10 text-[#5B75F0] text-[6rem] font-serif leading-none select-none drop-shadow-sm z-20">”</div>
    </article>
  );

  return (
    <section ref={wrapRef} className="w-full relative py-20 bg-[#08183A] overflow-hidden" aria-label="Client testimonials">
      
      {/* Abstract Background Faint Circular Patterns */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full border-[1px] border-blue-400/20" />
        <div className="absolute top-[10%] left-[-20%] w-[600px] h-[600px] rounded-full border-[1px] border-blue-400/20" />
        <div className="absolute bottom-[-30%] right-[20%] w-[1000px] h-[1000px] rounded-full border-[1px] border-blue-400/20" />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        
        {/* Marquee Wrapper */}
        <div className="relative mt-4 w-full">
          <div className="marquee-wrap mx-auto w-full">
            <div className="relative overflow-visible max-w-full">
              <div ref={trackRef} className="flex gap-10 items-stretch will-change-transform px-10" style={{ touchAction: 'pan-y' }}>
                
                {/* Original set */}
                {activeTestimonials.map((t) => (
                  <CardContent key={`a-${t.id}`} t={t} isOriginal={true} />
                ))}

                {/* Cloned set for infinite loop */}
                {activeTestimonials.map((t) => (
                  <CardContent key={`b-${t.id}`} t={t} />
                ))}
                
              </div>
            </div>
          </div>
        </div>

        {/* Footer Area (Website & Phone matching Screenshot) */}
        <div className="w-full max-w-6xl mx-auto px-8 mt-4 flex justify-between items-center text-blue-300 text-sm md:text-base font-medium">
           <div className="flex items-center gap-2">
             <span>🌐</span> www.in-tasolutions.com
           </div>
           <div className="flex items-center gap-2">
             +91 9447595381 <span>📞</span>
           </div>
        </div>

      </div>

      <style jsx>{`
        .ts-card { 
          transition: transform 300ms cubic-bezier(.2,.9,.2,1), box-shadow 300ms ease; 
        }
        .ts-card:focus-within { 
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); 
          transform: translateY(-8px) scale(1.02); 
          outline: none; 
        }

        /* Marquee wrapper with dark mode shades */
        .marquee-wrap {
          --shade-width: 15vw; 
          position: relative;
        }

        /* Left and right gradient masks adapted for the dark #08183A background */
        .marquee-wrap::before,
        .marquee-wrap::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          width: var(--shade-width);
          pointer-events: none;
          z-index: 30;
          background-image: linear-gradient(90deg, #08183A 0%, transparent 100%);
        }

        .marquee-wrap::before { left: 0; transform: translateZ(0); }
        .marquee-wrap::after { right: 0; transform: translateZ(0) rotateY(180deg); }

        .marquee-wrap > .relative { position: relative; z-index: 0; }

        @media (prefers-reduced-motion: reduce) {
          .ts-card, .ts-card * { transition: none !important; animation: none !important; transform: none !important; }
        }
      `}</style>
    </section>
  );
}
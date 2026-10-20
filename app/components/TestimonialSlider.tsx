'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReveal } from '../context/RevealContext';

gsap.registerPlugin(ScrollTrigger);

type Testimonial = {
  id: string;
  name: string;
  role?: string;
  quote: string;
  avatar?: string;
  company?: string;
};

const TEMPO = 1.0;

const renderStars = () => (
  <div className="flex gap-1">
    {[...Array(5)].map((_, i) => (
      <svg key={i} className="w-4 h-4 text-[#FFC107]" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

const CardContent = ({ t, isOriginal }: { t: Testimonial; isOriginal?: boolean }) => (
  <article 
    className={`ts-card ${isOriginal ? 'ts-card-original' : ''} relative w-[280px] md:w-[380px] rounded-[1.5rem] bg-white p-6 md:p-8 flex flex-col mt-8 mb-10 shadow-xl shrink-0`}
  >
    <div className="absolute -top-3 left-4 md:left-6 text-[#5B75F0] text-[4rem] font-serif leading-none select-none drop-shadow-sm z-20">“</div>

    <div className="absolute -top-5 right-3 md:right-6 bg-[#0B44C9] rounded-full flex items-center p-1 pr-5 shadow-lg z-20 transition-transform hover:scale-105">
      <div className="w-10 h-10 rounded-full bg-[#051A4D] flex items-center justify-center shrink-0 border-2 border-transparent overflow-hidden">
        {t.avatar ? (
          <img src={t.avatar} alt={t.name} width={40} height={40} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-blue-600" />
        )}
      </div>
      <div className="ml-2.5 flex flex-col justify-center">
        <span className="text-white font-bold text-[13px] leading-tight tracking-wide">{t.company || t.name}</span>
        <span className="text-blue-200 text-[11px] leading-tight mt-0.5">{t.company ? t.name : t.role}</span>
      </div>
    </div>

    <blockquote className="text-[14px] md:text-[15px] text-slate-600 leading-relaxed z-10 relative mt-5 font-medium">
      {t.quote}
    </blockquote>

    <div className="mt-6 pt-4 border-t border-slate-100 w-full max-w-[120px]">
      {renderStars()}
    </div>

    <div className="absolute -bottom-9 right-6 text-[#5B75F0] text-[4rem] font-serif leading-none select-none drop-shadow-sm z-20">”</div>
  </article>
);

export default function TestimonialSlider() {
  const [data, setData] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const { isRevealed } = useReveal();

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        const res = await fetch(`${apiBase}/api/home/testimonials/`);
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        
        if (Array.isArray(json) && json.length > 0 && mounted) {
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
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    return () => { mounted = false; };
  }, []);

  const wrapRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const floatTweens = useRef<gsap.core.Tween[]>([]);
  const isPlayingRef = useRef(true);

  // Main Marquee & Floating Animation
  useEffect(() => {
    if (typeof window === 'undefined' || !isRevealed || loading || data.length === 0) return;
    if (!wrapRef.current || !trackRef.current) return;

    const prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    try { tlRef.current?.kill(); } catch { }
    floatTweens.current.forEach(t => t.kill());
    floatTweens.current = [];

    const track = trackRef.current;

    if (prefersReduce) {
      gsap.set(track, { x: 0 });
      return;
    }

    const runAnimation = () => {
      const originals = Array.from(track.querySelectorAll<HTMLElement>('.ts-card-original'));
      if (!originals.length) return;

      let totalW = 0;
      originals.forEach(el => {
        const r = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const mr = parseFloat(style.marginRight || '0');
        const ml = parseFloat(style.marginLeft || '0');
        totalW += r.width + mr + ml;
      });

      gsap.set(track, { x: 0 });

      const base = Math.max(6 * TEMPO, (totalW / 90) * TEMPO);
      const duration = Math.max(6 * TEMPO, base);

      const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'linear' } });
      tl.to(track, { x: -totalW, duration, ease: 'linear' });
      tlRef.current = tl;

      const cards = Array.from(track.querySelectorAll<HTMLElement>('.ts-card'));
      cards.forEach((card, i) => {
        const t = gsap.to(card, {
          y: gsap.utils.random(-6, -2),
          rotation: gsap.utils.random(-0.3, 0.3),
          duration: gsap.utils.random(2.2 * TEMPO, 3.8 * TEMPO),
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
          delay: i * 0.04,
        });
        floatTweens.current.push(t);
      });

      if (!isPlayingRef.current) {
        tl.pause();
        floatTweens.current.forEach(t => t.pause());
      }
    };

    // Delay initialization slightly to ensure fonts/images have rendered their layout width
    const initTO = setTimeout(runAnimation, 100);

    const wrap = wrapRef.current;
    
    const onEnter = () => {
      isPlayingRef.current = false;
      tlRef.current?.pause();
      floatTweens.current.forEach(t => t.pause());
    };
    
    const onLeave = () => {
      isPlayingRef.current = true;
      tlRef.current?.resume();
      floatTweens.current.forEach(t => t.resume());
    };
    
    wrap.addEventListener('pointerenter', onEnter, { passive: true });
    wrap.addEventListener('pointerleave', onLeave, { passive: true });
    wrap.addEventListener('focusin', onEnter);
    wrap.addEventListener('focusout', onLeave);

    // Perf: the marquee + float tweens rewrite ~a hundred card styles every frame; pause them off screen
    const visibility = new IntersectionObserver(([e]) => {
      const run = e.isIntersecting && isPlayingRef.current;
      if (run) { tlRef.current?.resume(); floatTweens.current.forEach(t => t.resume()); }
      else { tlRef.current?.pause(); floatTweens.current.forEach(t => t.pause()); }
    });
    visibility.observe(wrap);

    return () => {
      visibility.disconnect();
      clearTimeout(initTO);
      try { wrap.removeEventListener('pointerenter', onEnter); } catch { }
      try { wrap.removeEventListener('pointerleave', onLeave); } catch { }
      try { wrap.removeEventListener('focusin', onEnter); } catch { }
      try { wrap.removeEventListener('focusout', onLeave); } catch { }
      
      try { tlRef.current?.kill(); } catch { }
      floatTweens.current.forEach(t => t.kill());
    };
  }, [data.length, isRevealed, loading]);

  // Ensure enough clones so the marquee never runs out of content on large screens
  const DUPLICATIONS = 8;
  const clonesArray = Array.from({ length: DUPLICATIONS });

  return (
    <section ref={wrapRef} className="w-full relative py-12 bg-[#F8F9FA] overflow-hidden" aria-label="Client testimonials">
      <div className="relative z-10 w-full flex flex-col items-center">
        
        <div className="relative w-full">
          <div className="marquee-wrap mx-auto w-full">
            <div className="relative overflow-visible max-w-full">
              <div ref={trackRef} className="flex gap-8 items-stretch will-change-transform px-8" style={{ touchAction: 'pan-y' }}>
                
                {data.map((t) => (
                  <CardContent key={`orig-${t.id}`} t={t} isOriginal={true} />
                ))}

                {clonesArray.map((_, i) => (
                  <div key={`clone-group-${i}`} className="flex gap-8 items-stretch">
                    {data.map((t) => (
                      <CardContent key={`clone-${i}-${t.id}`} t={t} />
                    ))}
                  </div>
                ))}
                
              </div>
            </div>
          </div>
        </div>

      </div>

      <style jsx>{`
        .ts-card { 
          /* Removed 'transform' from transition because GSAP is animating it. 
             Having both causes severe jitter and text blinking. */
          transition: box-shadow 300ms ease; 
          will-change: transform;
          backface-visibility: hidden;
          -webkit-font-smoothing: subpixel-antialiased;
        }
        .ts-card:focus-within { 
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.15); 
          /* Removed transform scale because GSAP handles card transform continuously */
          outline: none; 
        }

        .marquee-wrap {
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }

        @media (prefers-reduced-motion: reduce) {
          .ts-card, .ts-card * { transition: none !important; animation: none !important; transform: none !important; }
        }
      `}</style>
    </section>
  );
}
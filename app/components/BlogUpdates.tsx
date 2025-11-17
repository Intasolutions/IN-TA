// frontend/components/BlogUpdates.tsx
'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* --- tuning --- */
const AUTOPLAY_SECONDS = 4.2;
const TEMPO = 0.88;

type Blog = {
  id: string;
  title: string;
  date: string;
  tag?: string;
  image?: string;
};

const BLOGS: Blog[] = [
  { id: 'b1', title: 'Designing Scalable Design Systems', date: 'Oct 06, 2025', tag: 'Design', image: '/portfolio/qma.png' },
  { id: 'b2', title: 'Performance-first Next.js Patterns', date: 'Sep 21, 2025', tag: 'Engineering', image: '/images/blog2.jpg' },
  { id: 'b3', title: 'Creative Direction for Product Videos', date: 'Aug 30, 2025', tag: 'Motion', image: '/images/blog3.jpg' },
  { id: 'b4', title: 'Growth Loops: From Acquisition to Retention', date: 'Jul 18, 2025', tag: 'Growth', image: '/images/blog4.jpg' },
  { id: 'b5', title: 'Observability for Modern Frontends', date: 'Jun 02, 2025', tag: 'Infra', image: '/images/blog5.jpg' },
];

export default function BlogUpdates(): JSX.Element {
  const prefersReduce =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [active, setActive] = useState(0);
  const itemsRef = useRef<HTMLDivElement[]>([]);
  const wrapRef = useRef<HTMLElement | null>(null);
  const autoplayRef = useRef<gsap.core.Tween | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const rimRef = useRef<HTMLDivElement | null>(null);
  const innerParallaxRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const animLock = useRef(false);

  useEffect(() => {
    itemsRef.current = itemsRef.current.slice(0, BLOGS.length);
  }, []);

  // autoplay timeline + progress bar + floating micro motion for images
  useEffect(() => {
    if (typeof window === 'undefined' || !wrapRef.current) return;

    // cleanup
    try { autoplayRef.current?.kill(); } catch {}
    try { tlRef.current?.kill(); } catch {}

    if (prefersReduce) {
      // ensure visible and no motion
      itemsRef.current.forEach((el, i) => {
        if (!el) return;
        gsap.set(el, { autoAlpha: i === active ? 1 : 0, y: 0, scale: 1 });
      });
      if (progressRef.current) gsap.set(progressRef.current, { width: 0 });
      return;
    }

    // marquee-like autoplay: using a simple repeating tween (we restart on manual interactions)
    const autoplay = gsap.to({}, {
      duration: AUTOPLAY_SECONDS,
      repeat: -1,
      onRepeat: () => advance(1, { animateRim: true, resetProgressAfter: true }),
    });
    autoplayRef.current = autoplay;

    // progress bar tween: continuously fill each AUTOPLAY_SECONDS, restarts when autoplay restarts
    const progressTween = gsap.fromTo(
      progressRef.current,
      { width: '0%' },
      { width: '100%', duration: AUTOPLAY_SECONDS, ease: 'linear', repeat: -1, paused: false }
    );

    // subtle image float for each visible item's media block
    const floatTweens: gsap.core.Tween[] = [];
    itemsRef.current.forEach((el, idx) => {
      const media = innerParallaxRefs.current[idx];
      if (!media) return;
      const t = gsap.to(media, {
        y: gsap.utils.random(-8, -2),
        rotation: gsap.utils.random(-0.6, 0.6),
        duration: gsap.utils.random(2.8 * TEMPO, 4.2 * TEMPO),
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        delay: idx * 0.06,
      });
      floatTweens.push(t);
    });

    // store timeline so we can pause/resume elsewhere
    tlRef.current = autoplay;

    return () => {
      try { autoplay.kill(); } catch {}
      try { progressTween.kill(); } catch {}
      try { floatTweens.forEach(t => t.kill()); } catch {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, prefersReduce]);

  // Non-overlapping advance with rim sweep and parallax-in animation for incoming card
  const advance = (delta: number, opts?: { animateRim?: boolean; resetProgressAfter?: boolean }) => {
    if (animLock.current) return;
    animLock.current = true;

    const next = (active + delta + BLOGS.length) % BLOGS.length;
    const currentEl = itemsRef.current[active];
    const nextEl = itemsRef.current[next];

    if (!currentEl || !nextEl || prefersReduce) {
      setActive(next);
      animLock.current = false;
      return;
    }

    // Prepare z order and initial states
    gsap.set(nextEl, { zIndex: 6, pointerEvents: 'auto' });
    gsap.set(currentEl, { zIndex: 5 });

    // small rim sweep for premium feel
    if (opts?.animateRim && rimRef.current) {
      const rim = rimRef.current;
      gsap.killTweensOf(rim);
      gsap.set(rim, { x: -120, opacity: 0 });
      gsap.to(rim, { x:  (wrapRef.current?.getBoundingClientRect().width ?? 900) + 120, opacity: 1, duration: 0.9 * TEMPO, ease: 'power2.out' });
      gsap.to(rim, { opacity: 0, duration: 0.6 * TEMPO, delay: 0.36 * TEMPO });
    }

    // timeline where OUT completes before IN starts (small gap)
    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: () => {
        // cleanup outgoing
        gsap.set(currentEl, { autoAlpha: 0, y: 0, scale: 1, zIndex: 1, pointerEvents: 'none', clearProps: 'transform' });
        // normalize incoming
        gsap.set(nextEl, { autoAlpha: 1, y: 0, scale: 1, zIndex: 2, clearProps: 'transform' });
        setActive(next);
        // reset progress tween so progress bar restarts cleanly
        if (opts?.resetProgressAfter && progressRef.current) {
          try {
            gsap.killTweensOf(progressRef.current);
            gsap.set(progressRef.current, { width: '0%' });
            gsap.to(progressRef.current, { width: '100%', duration: AUTOPLAY_SECONDS, ease: 'linear', repeat: -1 });
          } catch {}
        }
        animLock.current = false;
      },
    });

    // OUT: quick upward exit
    tl.to(currentEl, { y: -32, autoAlpha: 0, scale: 0.994, duration: 0.26 * TEMPO, ease: 'power2.in' }, 0);

    // small gap before the incoming starts
    const gap = 0.06 * TEMPO;
    tl.set(nextEl, { y: -70, autoAlpha: 0, scale: 0.996 }, `> ${gap}`);

    // IN: drop in with slight horizontal parallax and tiny overshoot then settle
    tl.fromTo(nextEl, { x: -8 }, { x: 0, duration: 0.58 * TEMPO, ease: 'cubic.out' }, `> ${gap}`);
    tl.to(nextEl, { y: 0, autoAlpha: 1, scale: 1.02, duration: 0.62 * TEMPO, ease: 'cubic.out' }, `> ${gap}`);
    tl.to(nextEl, { scale: 1, duration: 0.36 * TEMPO, ease: 'power2.out' }, '>-0.06');
  };

  // hover/focus pause & resume
  useEffect(() => {
    if (!wrapRef.current) return;
    const wrap = wrapRef.current;
    if (prefersReduce) return;

    let slowTO: number | null = null;
    const onEnter = () => {
      try { autoplayRef.current?.pause(); } catch {}
      try { gsap.killTweensOf(progressRef.current); } catch {}
    };
    const onLeave = () => {
      try { autoplayRef.current?.resume(); } catch {}
      // restart progress tween
      try {
        gsap.killTweensOf(progressRef.current);
        gsap.set(progressRef.current, { width: '0%' });
        gsap.to(progressRef.current, { width: '100%', duration: AUTOPLAY_SECONDS, ease: 'linear', repeat: -1 });
      } catch {}
    };
    const onMove = () => {
      if (!autoplayRef.current) return;
      // slow motion feeling on pointer move
      try { gsap.to(autoplayRef.current, { timeScale: 0.18, duration: 0.18, ease: 'power3.out' }); } catch {}
      if (slowTO) window.clearTimeout(slowTO);
      slowTO = window.setTimeout(() => {
        try { gsap.to(autoplayRef.current!, { timeScale: 1, duration: 0.6, ease: 'power3.out' }); } catch {}
      }, 420);
    };

    wrap.addEventListener('pointerenter', onEnter, { passive: true });
    wrap.addEventListener('pointerleave', onLeave, { passive: true });
    wrap.addEventListener('pointermove', onMove, { passive: true });
    wrap.addEventListener('focusin', onEnter);
    wrap.addEventListener('focusout', onLeave);

    return () => {
      try { wrap.removeEventListener('pointerenter', onEnter); } catch {}
      try { wrap.removeEventListener('pointerleave', onLeave); } catch {}
      try { wrap.removeEventListener('pointermove', onMove); } catch {}
      try { wrap.removeEventListener('focusin', onEnter); } catch {}
      try { wrap.removeEventListener('focusout', onLeave); } catch {}
      if (slowTO) window.clearTimeout(slowTO);
    };
  }, [prefersReduce]);

  // pointer micro-parallax for the active card image
  useEffect(() => {
    if (!wrapRef.current || prefersReduce) return;
    const wrap = wrapRef.current;
    let raf = 0;
    const onMove = (ev: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = wrap.getBoundingClientRect();
        const nx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((ev.clientY - rect.top) / rect.height) * 2 - 1;
        const activeMedia = innerParallaxRefs.current[active];
        if (!activeMedia) return;
        gsap.to(activeMedia, { x: nx * 8, y: ny * 6, rotation: nx * -0.6, duration: 0.9 * TEMPO, ease: 'power3.out', overwrite: true });
      });
    };
    const onLeave = () => {
      const activeMedia = innerParallaxRefs.current[active];
      if (!activeMedia) return;
      gsap.to(activeMedia, { x: 0, y: 0, rotation: 0, duration: 0.9 * TEMPO, ease: 'power3.out', overwrite: true });
      cancelAnimationFrame(raf);
    };

    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerleave', onLeave);
    wrap.addEventListener('pointercancel', onLeave);

    return () => {
      try { wrap.removeEventListener('pointermove', onMove); } catch {}
      try { wrap.removeEventListener('pointerleave', onLeave); } catch {}
      try { wrap.removeEventListener('pointercancel', onLeave); } catch {}
      cancelAnimationFrame(raf);
    };
  }, [active, prefersReduce]);

  // initial visibility
  useEffect(() => {
    itemsRef.current.forEach((el, i) => {
      if (!el) return;
      gsap.set(el, { autoAlpha: i === active ? 1 : 0, y: 0, scale: 1, pointerEvents: i === active ? 'auto' : 'none' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // controls
  const onPrev = () => {
    try { autoplayRef.current?.restart(true); } catch {}
    advance(-1, { animateRim: true, resetProgressAfter: true });
  };
  const onNext = () => {
    try { autoplayRef.current?.restart(true); } catch {}
    advance(1, { animateRim: true, resetProgressAfter: true });
  };

  const onDot = (i: number) => {
    if (i === active) return;
    try { autoplayRef.current?.restart(true); } catch {}
    advance((i - active + BLOGS.length) % BLOGS.length, { animateRim: true, resetProgressAfter: true });
  };

  return (
    <section ref={wrapRef} className="relative py-20 px-6 md:px-20 bg-[#fbfaf8]">
      {/* soft layered glows behind cards */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-20">
        <div className="absolute left-[-6%] top-[-8%] w-[44%] h-[88%]">
          <div style={{ mixBlendMode: 'screen' }} className="w-full h-full rounded-full bg-gradient-to-br from-[#e8f3ff]/80 to-transparent blur-[64px]" />
        </div>
        <div className="absolute right-[-6%] bottom-[-6%] w-[36%] h-[72%]">
          <div style={{ mixBlendMode: 'screen' }} className="w-full h-full rounded-full bg-gradient-to-tl from-[#f7fbff]/70 to-transparent blur-[48px]" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7">
          <div className="mb-6">
            <p className="text-sm font-semibold tracking-wide text-slate-600">BLOG UPDATES</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#0b2a5f] mt-2">Latest insights & stories</h2>
            <p className="text-slate-600 mt-2 max-w-2xl">We publish practical case studies and deep-dive articles. Read the latest.</p>
          </div>

          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden border border-slate-100 bg-white shadow-2xl p-6 md:p-8">
              {/* rim light (thin traveling glow) */}
              <div
                ref={rimRef}
                aria-hidden
                className="absolute top-6 left-0 h-[6px] w-40 rounded-full pointer-events-none -z-10"
                style={{
                  background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(230,240,255,0.95) 40%, rgba(230,240,255,0) 100%)',
                  filter: 'blur(12px)',
                  opacity: 0.12,
                }}
              />

              {/* autoplay progress bar (thin at bottom-left) */}
              <div className="absolute left-6 bottom-6 w-[38%] md:w-[28%] h-2 rounded-full bg-[#eef5ff]/60 -z-5">
                <div ref={progressRef} className="h-full rounded-full bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6]" style={{ width: '0%' }} />
              </div>

              <div className="relative h-72 md:h-80 overflow-hidden">
                {BLOGS.slice(0, 5).map((b, i) => (
                  <div
                    key={b.id}
                    ref={(el) => { if (el) itemsRef.current[i] = el; }}
                    className={`absolute inset-0 p-4 md:p-6 rounded-2xl flex gap-6 items-stretch will-change-transform`}
                    aria-hidden={i !== active}
                    role="group"
                    tabIndex={i === active ? 0 : -1}
                    style={{ pointerEvents: i === active ? 'auto' : 'none' }}
                  >
                    <div className="w-1/3 hidden md:block relative rounded-xl overflow-hidden">
                      {b.image ? (
                        <div
                          ref={(el) => { if (el) innerParallaxRefs.current[i] = el; }}
                          className="absolute inset-0"
                        >
                          <Image src={b.image} alt={b.title} fill className="object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-transparent to-[#0b2a5f]/36" />
                        </div>
                      ) : (
                        <div className="bg-slate-100 w-full h-full" />
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-xs font-semibold text-[#0b2a5f] px-3 py-1 rounded-full bg-[#eaf4ff]">{b.tag}</span>
                          <time className="text-xs text-slate-400">{b.date}</time>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">{b.title}</h3>
                      </div>

                      <div className="flex items-center gap-4 mt-6">
                        <a href="#" className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6] text-white shadow hover:brightness-105 transition">
                          Read article
                        </a>

                        <div className="ml-auto flex items-center gap-3 text-sm text-slate-500">
                          <button onClick={() => { onPrev(); }} aria-label="Previous" className="p-2 rounded-md bg-white border shadow-sm hover:scale-[0.98] transition" title="Previous">‹</button>
                          <button onClick={() => { onNext(); }} aria-label="Next" className="p-2 rounded-md bg-white border shadow-sm hover:scale-[0.98] transition" title="Next">›</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3 justify-center md:justify-start">
                {BLOGS.slice(0, 5).map((b, i) => (
                  <button
                    key={`dot-${b.id}`}
                    onClick={() => onDot(i)}
                    aria-label={`Show ${b.title}`}
                    className={`w-2.5 h-2.5 rounded-full ${i === active ? 'bg-[#0b2a5f]' : 'bg-slate-300/60'} transition`}
                  />
                ))}
                <div className="ml-auto text-xs text-slate-400 hidden md:block">Auto-rotates • Hover to pause</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column (form) */}
        <aside className="lg:col-span-5">
          <div className="lg:sticky top-28">
            <div className="rounded-3xl p-6 md:p-8 bg-white border border-slate-100 shadow-xl">
              <h4 className="text-lg font-extrabold text-[#0b2a5f] mb-2">Request latest guide</h4>
              <p className="text-sm text-slate-600 mb-4">Tell us who you are and which product you’re interested in. We’ll send the latest blog pack & resources.</p>
              <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
                <input className="mt-2 block w-full rounded-xl border px-4 py-3 border-slate-200" placeholder="Your full name" />
                <input className="mt-2 block w-full rounded-xl border px-4 py-3 border-slate-200" placeholder="+91 90000 00000" />
                <select className="mt-2 block w-full rounded-xl border px-4 py-3 border-slate-200">
                  <option>Web Development</option>
                  <option>UI/UX Design</option>
                  <option>App Development</option>
                  <option>Video Production</option>
                </select>
                <button className="w-full inline-flex items-center justify-center gap-3 rounded-full px-5 py-3 text-sm font-semibold text-white shadow bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6]">Send me resources</button>
              </form>
            </div>

            <div className="mt-6 rounded-2xl overflow-hidden bg-gradient-to-r from-[#eef6ff] to-white border border-slate-100 p-4 shadow">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-white/60 flex items-center justify-center border">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3v18" stroke="#0b2a5f" strokeWidth="1.2" strokeLinecap="round"/></svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">Weekly round-up</div>
                  <div className="text-xs text-slate-500">Short summaries from our team — delivered each Monday.</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <style jsx>{`
        section { -webkit-font-smoothing: antialiased; }
        .shadow-2xl { box-shadow: 0 30px 60px rgba(11,42,95,0.06), 0 6px 16px rgba(11,42,95,0.04); }
        button:focus { outline: none; box-shadow: 0 6px 20px rgba(11,42,95,0.06); }
        @media (max-width: 1024px) {
          .lg\\:col-span-7 { grid-column: 1 / -1; }
          .lg\\:col-span-5 { grid-column: 1 / -1; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; animation: none !important; }
        }
      `}</style>
    </section>
  );
}

// frontend/components/PortfolioStudioSplit.tsx
'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const projects = [
  { id: 'p1', title: 'Celtic shades', image: '/portfolio/cel.png' },
  { id: 'p2', title: 'QMA Canada', image: '/portfolio/qma.png' },
  { id: 'p3', title: 'Fashion Editorial Video', image: '/portfolio/cel.png' },
  { id: 'p4', title: 'E-Commerce Experience', image: '/portfolio/qma.png' },
  { id: 'p5', title: 'Creative Brand Campaign', image: '/portfolio/cel.png' },
];

const TEMPO = 0.8; // adjust global speed (0.6 fast, 1.0 default)

export default function PortfolioStudioSplit() {
  const wrapRef = useRef<HTMLElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const previewImageRef = useRef<HTMLDivElement | null>(null);
  const previewBgRef = useRef<HTMLDivElement | null>(null);
  const previewTitleRef = useRef<HTMLDivElement | null>(null);
  const previewGlowRef = useRef<HTMLDivElement | null>(null);
  const rimRef = useRef<SVGRectElement | null>(null);
  const thumbRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const bgLayerRef = useRef<HTMLDivElement | null>(null);

  const [activeId, setActiveId] = useState(projects[0].id);

  // Keep references to any created GSAP timelines for cleanup
  const createdTimelines = useRef<gsap.core.Tween[]>([]);
  const pointerRaf = useRef<number | null>(null);

  // INITIAL SCROLL + PREVIEW ANIMATIONS (keep existing behavior + enhance)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      // thumbnails reveal - batch for perf
      const items = gsap.utils.toArray<HTMLElement>('.pf-item');
      if (!prefersReduce) {
        gsap.set(items, { autoAlpha: 0, y: 36, willChange: 'opacity, transform' });
        ScrollTrigger.batch(items, {
          start: 'top 88%',
          onEnter: (batch) => {
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              duration: 0.95 * TEMPO,
              ease: 'expo.out',
              stagger: 0.08,
            });
          },
        });
      } else {
        items.forEach((i) => (i.style.opacity = '1'));
      }

      // preview parallax movement (scroll-driven subtle)
      if (!prefersReduce && previewRef.current && wrapRef.current) {
        const t = gsap.to(previewRef.current, {
          y: -18,
          ease: 'none',
          scrollTrigger: {
            trigger: wrapRef.current!,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.9,
            invalidateOnRefresh: true,
          },
        });
        createdTimelines.current.push(t);
      }

      // preview background layer scroll parallax
      if (!prefersReduce && previewBgRef.current && wrapRef.current) {
        const t = gsap.to(previewBgRef.current, {
          y: 12,
          scale: 1.06,
          ease: 'none',
          scrollTrigger: {
            trigger: wrapRef.current!,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.9,
            invalidateOnRefresh: true,
          },
        });
        createdTimelines.current.push(t);
      }

      // preview glow initial styling
      if (!prefersReduce && previewGlowRef.current) {
        gsap.set(previewGlowRef.current, { opacity: 0.08, scale: 1, filter: 'blur(18px)' });
      }

      // rim draw animation (strokeDashoffset)
      if (!prefersReduce && rimRef.current && wrapRef.current) {
        try {
          const rim = rimRef.current;
          const len = rim.getTotalLength();
          rim.style.strokeDasharray = `${len}`;
          rim.style.strokeDashoffset = `${len}`;
          const t = gsap.to(rim, {
            strokeDashoffset: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: wrapRef.current!,
              start: 'top 90%',
              end: 'bottom 10%',
              scrub: 0.95,
              invalidateOnRefresh: true,
            },
          });
          createdTimelines.current.push(t);
        } catch (e) {
          // ignore
        }
      }

      // Add a subtle ambient movement to the background layer (slow)
      if (!prefersReduce && bgLayerRef.current) {
        const bg = bgLayerRef.current;
        const t = gsap.to(bg, {
          xPercent: 6,
          yPercent: -4,
          scale: 1.02,
          duration: 22 * TEMPO,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
        createdTimelines.current.push(t);
      }
    }, wrapRef);

    return () => {
      try { ctx.revert(); } catch {}
      try { ScrollTrigger.getAll().forEach(t => t.kill()); } catch {}
      // kill timlines
      try { createdTimelines.current.forEach(t => t.kill()); } catch {}
      createdTimelines.current = [];
    };
  }, []);

  // PREVIEW SWAP + HIGHLIGHT (on activeId)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const imgWrap = previewImageRef.current;
    const titleEl = previewTitleRef.current;
    const glowEl = previewGlowRef.current;
    const rimEl = rimRef.current;

    if (!imgWrap || !titleEl) return;

    if (prefersReduce) {
      titleEl.textContent = projects.find((p) => p.id === activeId)?.title ?? '';
      return;
    }

    // crossfade main image wrapper
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.to(imgWrap, { autoAlpha: 0, scale: 1.03, duration: 0.28 });
    // React will update the image node via key in JSX; small delay is fine
    tl.to(imgWrap, { autoAlpha: 1, scale: 1, duration: 0.62 });

    // title glow/pop
    gsap.killTweensOf(titleEl);
    gsap.fromTo(titleEl, { textShadow: '0 0 0px rgba(31,111,230,0)' }, { textShadow: '0 10px 40px rgba(31,111,230,0.16)', duration: 0.55, ease: 'sine.out' });

    // thumbnails highlight and glow pulse
    Object.keys(thumbRefs.current).forEach((id) => {
      const el = thumbRefs.current[id];
      if (!el) return;
      const ttext = el.querySelector<HTMLElement>('.thumb-title');
      if (id === activeId) {
        gsap.to(el, { boxShadow: '0 32px 80px rgba(31,111,230,0.12)', scale: 1.035, duration: 0.36 * TEMPO, ease: 'power2.out' });
        if (ttext) gsap.to(ttext, { color: '#e6f0ff', textShadow: '0 6px 24px rgba(31,111,230,0.18)', duration: 0.5 * TEMPO, ease: 'power2.out' });
      } else {
        gsap.to(el, { boxShadow: '0 10px 30px rgba(11,42,95,0.06)', scale: 1, duration: 0.36 * TEMPO, ease: 'power2.out' });
        if (ttext) gsap.to(ttext, { color: '#ffffff', textShadow: 'none', duration: 0.36 * TEMPO, ease: 'power2.out' });
      }
    });

    // pulse glow when active changes
    if (glowEl && !prefersReduce) {
      gsap.killTweensOf(glowEl);
      const gtl = gsap.timeline();
      gtl.to(glowEl, { opacity: 0.9, scale: 1.18, filter: 'blur(66px)', duration: 0.28 * TEMPO, ease: 'power2.out' });
      gtl.to(glowEl, { opacity: 0.48, scale: 1.06, filter: 'blur(44px)', duration: 0.8 * TEMPO, ease: 'power3.out' });
    }

    // rim pulse micro-sweep
    if (rimEl && !prefersReduce) {
      gsap.killTweensOf(rimEl);
      const len = (() => { try { return rimEl.getTotalLength(); } catch { return 1; } })();
      const sweep = gsap.timeline();
      sweep.to(rimEl, { strokeOpacity: 1, duration: 0.12 * TEMPO, ease: 'power2.out' });
      sweep.to(rimEl, { strokeDashoffset: Math.max(0, (len || 1) * 0.12) * -1, duration: 0.36 * TEMPO, ease: 'sine.out' }, '-=0.02');
      sweep.to(rimEl, { strokeOpacity: 0.55, duration: 0.9 * TEMPO, ease: 'power3.out' });
    }

    return () => {
      tl.kill();
    };
  }, [activeId]);

  // keyboard nav (unchanged)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const idx = projects.findIndex((p) => p.id === activeId);
      if (e.key === 'ArrowDown') {
        const next = projects[Math.min(projects.length - 1, idx + 1)];
        if (next) setActiveId(next.id);
      } else if (e.key === 'ArrowUp') {
        const prev = projects[Math.max(0, idx - 1)];
        if (prev) setActiveId(prev.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId]);

  // SOFT POINTER-DRIVEN PARALLAX for preview title + micro-parallax for bg
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduce) return;
    if (!previewRef.current || !previewTitleRef.current) return;
    if ('ontouchstart' in window) return;

    const titleEl = previewTitleRef.current;
    const previewEl = previewRef.current;
    let raf = 0;

    const onMove = (ev: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = previewEl.getBoundingClientRect();
        const nx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((ev.clientY - rect.top) / rect.height) * 2 - 1;
        const moveX = -nx * 12;
        const moveY = -ny * 8;
        gsap.to(titleEl, { x: moveX, y: moveY, duration: 0.45 * TEMPO, ease: 'power3.out', overwrite: true });
        gsap.to(titleEl, { rotation: nx * -1.2, duration: 0.45 * TEMPO, ease: 'power3.out', overwrite: true });
      });
    };

    const onLeave = () => {
      cancelAnimationFrame(raf);
      gsap.to(titleEl, { x: 0, y: 0, rotation: 0, duration: 0.7 * TEMPO, ease: 'power3.out', overwrite: true });
    };

    previewEl.addEventListener('pointermove', onMove);
    previewEl.addEventListener('pointerleave', onLeave);
    previewEl.addEventListener('pointercancel', onLeave);

    return () => {
      previewEl.removeEventListener('pointermove', onMove);
      previewEl.removeEventListener('pointerleave', onLeave);
      previewEl.removeEventListener('pointercancel', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  // MICRO-PARALLAX for background responding to pointer (adds depth)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduce) return;
    if (!previewBgRef.current || !previewRef.current) return;
    if ('ontouchstart' in window) return;

    const bgEl = previewBgRef.current;
    const previewEl = previewRef.current;
    let rafId: number | null = null;

    const onMove = (ev: PointerEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = previewEl.getBoundingClientRect();
        const nx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((ev.clientY - rect.top) / rect.height) * 2 - 1;
        const moveX = -nx * 10;
        const moveY = -ny * 6;
        gsap.to(bgEl, { x: moveX, y: moveY, duration: 0.6 * TEMPO, ease: 'power3.out', overwrite: true });
      });
    };

    const onLeave = () => {
      if (rafId) cancelAnimationFrame(rafId);
      gsap.to(bgEl, { x: 0, y: 0, duration: 0.9 * TEMPO, ease: 'power3.out', overwrite: true });
    };

    previewEl.addEventListener('pointermove', onMove);
    previewEl.addEventListener('pointerleave', onLeave);
    previewEl.addEventListener('pointercancel', onLeave);

    return () => {
      previewEl.removeEventListener('pointermove', onMove);
      previewEl.removeEventListener('pointerleave', onLeave);
      previewEl.removeEventListener('pointercancel', onLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // PREMIUM BACKGROUND LAYER: mouse-driven parallax + subtle cursor-reactive particles
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!bgLayerRef.current) return;
    if ('ontouchstart' in window) return;
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduce) return;

    const bg = bgLayerRef.current;
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    let rafId: number | null = null;

    // small faux-particles: create few blurred discs via CSS inside bg layer
    // ensure we only create once
    if (!bg.dataset.inited) {
      bg.dataset.inited = '1';
      const particleCount = 6;
      for (let i = 0; i < particleCount; i++) {
        const d = document.createElement('div');
        d.className = 'pp-glow';
        // randomize position and size
        const left = Math.round(Math.random() * 90) + '%';
        const top = Math.round(Math.random() * 90) + '%';
        const sz = Math.round(80 + Math.random() * 220) + 'px';
        d.style.left = left;
        d.style.top = top;
        d.style.width = sz;
        d.style.height = sz;
        d.style.opacity = `${0.04 + Math.random() * 0.08}`;
        bg.appendChild(d);
      }
    }

    const onPointer = (ev: PointerEvent) => {
      const rect = bg.getBoundingClientRect();
      mouseX = (ev.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
      mouseY = (ev.clientY - rect.top) / rect.height - 0.5;
      if (!rafId) {
        rafId = requestAnimationFrame(loop);
      }
    };

    const loop = () => {
      rafId = null;
      // smooth interpolation
      targetX += (mouseX - targetX) * 0.12;
      targetY += (mouseY - targetY) * 0.12;

      // apply transformations to layer and to each particle (slight parallax)
      const moveX = targetX * 20; // px
      const moveY = targetY * 14;
      gsap.to(bg, { x: moveX, y: moveY, duration: 0.8 * TEMPO, ease: 'power3.out', overwrite: true });

      // move individual glows slightly in opposite/varied directions for depth
      const glows = Array.from(bg.querySelectorAll<HTMLDivElement>('.pp-glow'));
      glows.forEach((g, i) => {
        const mx = (targetX * (6 + (i % 3))) * (i % 2 ? -1 : 1);
        const my = (targetY * (4 + (i % 4))) * (i % 2 ? -1 : 1);
        gsap.to(g, { x: mx, y: my, duration: 1.2 * TEMPO, ease: 'sine.out', overwrite: true });
      });
    };

    window.addEventListener('pointermove', onPointer, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointer);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const active = projects.find((p) => p.id === activeId)!;

  return (
    <section ref={wrapRef} id="portfolio-studio" className="relative bg-[#f9f8f6] py-24 px-6 md:px-20">
      {/* Heading */}
      <div className="max-w-6xl mx-auto mb-10">
        <p className="text-sm font-semibold tracking-wide text-slate-600">PORTFOLIO</p>
        <h2 className="text-4xl md:text-5xl font-extrabold text-[#0b2a5f] mt-2">Curated Works — Studio Preview</h2>
        <p className="text-slate-600 mt-3 max-w-2xl">Hover thumbnails to preview. Titles glow when active — minimal by design.</p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start relative">
        {/* Premium animated background layer (behind preview) */}
        <div ref={bgLayerRef} className="absolute inset-0 pointer-events-none -z-20 overflow-hidden" />

        {/* Left: Sticky Preview */}
     <div className="lg:col-span-6 lg:sticky lg:top-28">
  <div className="w-full h-[68vh] rounded-3xl overflow-hidden shadow-2xl relative bg-neutral-50">
    {/* ambient glow element */}
    <div
      ref={previewGlowRef}
      aria-hidden
      style={{ pointerEvents: 'none' }}
      className="absolute left-6 top-6 w-36 h-24 rounded-full bg-gradient-to-br from-[#1f6fe6] to-[#0b2a5f] opacity-10 mix-blend-screen blur-2xl transform-gpu"
    />

    {/* rim SVG overlay */}
    <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 1200 800" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="rimGrad" x1="0" x2="1">
          <stop offset="0%" stopColor="#e6f0ff" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#bcdcff" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#1f6fe6" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <rect
        ref={rimRef}
        x="12"
        y="12"
        width="calc(100% - 24)"
        height="calc(100% - 24)"
        rx="18"
        ry="18"
        fill="none"
        stroke="url(#rimGrad)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.45"
      />
    </svg>

    {/* Background micro-parallax (keep this as cover for ambient backdrop) */}
    <div ref={previewBgRef} className="absolute inset-0 pointer-events-none transform-gpu">
      <Image
        src={active.image}
        alt={`${active.title} bg`}
        fill
        className="object-cover scale-105 blur-sm opacity-40"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b2a5f]/24 to-transparent" />
    </div>

    {/* Foreground/main image wrapper — show the entire image without cropping */}
    <div
      ref={previewImageRef}
      key={active.id}
      className="absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.2,1,0.22,1)] flex items-center justify-center"
    >
      {/* Use a centered container so object-contain works predictably */}
      <div className="w-full h-full flex items-center justify-center p-6">
        <Image
          src={active.image}
          alt={active.title}
          fill
          className="object-contain object-center"
          priority
        />
      </div>

      {/* optional tint on top of the image */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b2a5f]/56 via-transparent to-transparent pointer-events-none" />
    </div>

    {/* title area at bottom */}
    <div ref={previewRef} className="absolute inset-0 flex items-end p-6">
      <h3 ref={previewTitleRef} className="text-white text-2xl md:text-3xl font-bold tracking-tight drop-shadow-lg">
        {active.title}
      </h3>
    </div>
  </div>
</div>


        {/* Right: Thumbnails */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          {projects.map((p) => (
            <div
              key={p.id}
              ref={(el) => (thumbRefs.current[p.id] = el)}
              className={`pf-item group relative rounded-2xl overflow-hidden cursor-pointer transition-transform duration-500 ${activeId === p.id ? 'scale-[1.03] shadow-2xl' : 'hover:scale-[1.02] shadow-md'}`}
              onMouseEnter={() => setActiveId(p.id)}
              onFocus={() => setActiveId(p.id)}
              tabIndex={0}
            >
              <div className="relative h-56 md:h-64">
                <Image src={p.image} alt={p.title} fill className="object-cover group-hover:scale-105 transition-transform duration-900 ease-[cubic-bezier(0.2,1,0.22,1)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b2a5f]/60 via-[#0b2a5f]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-450" />
              </div>

              <div className="absolute bottom-4 left-4">
                <span className="thumb-title text-white text-lg font-semibold transition-all duration-450">{p.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* decorative glows (background) */}
      <div className="absolute -top-20 left-0 w-[420px] h-[420px] bg-gradient-to-br from-[#1f6fe6]/10 to-[#0b2a5f]/05 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[320px] h-[320px] bg-gradient-to-tl from-[#0b2a5f]/06 to-[#1f6fe6]/04 blur-[100px] rounded-full pointer-events-none -z-10" />

      <style jsx>{`
        .pf-item { will-change: transform, opacity; }
        .thumb-title { will-change: color, text-shadow; }
        .pp-glow {
          position: absolute;
          border-radius: 999px;
          filter: blur(36px);
          pointer-events: none;
          transform: translate3d(0,0,0);
          mix-blend-mode: screen;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0.2) 25%, transparent 50%);
        }
        @media (max-width: 1024px) {
          .lg\\:sticky { position: static; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pf-item, .thumb-title, .pf-item img, .pp-glow, svg rect { transition: none !important; animation: none !important; }
        }
        /* ensure SVG overlay covers the preview properly */
        section svg { width: 100%; height: 100%; left: 0; top: 0; position: absolute; pointer-events: none; }
      `}</style>
    </section>
  );
}

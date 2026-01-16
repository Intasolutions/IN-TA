// frontend/components/PortfolioCinematicPanels.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReveal } from '../context/RevealContext';

if (typeof window !== 'undefined') {
  try {
    gsap.registerPlugin(ScrollTrigger);
  } catch (e) {
    // ignore HMR double-register
  }
}

// --- ROBUST UTILITY COMPONENTS ---

// Splits text into words for stagger animation
function SplitWords({ text }: { text: string }) {
  if (!text) return null;
  return (
    <span aria-label={text} className="inline-block leading-tight">
      {text.split(' ').map((w, i) => (
        <span
          key={i}
          className="split-word inline-block mr-2 md:mr-3 will-change-transform will-change-opacity"
          style={{ opacity: 0 }} // Initially hidden to prevent FOUC
        >
          {w}
        </span>
      ))}
    </span>
  );
}

// Splits text into chars for typing/focus animation
function SplitChars({ text }: { text: string }) {
  if (!text) return null;
  return (
    <>
      {Array.from(text).map((ch, i) => {
        const disp = ch === ' ' ? '\u00A0' : ch;
        return (
          <span
            key={i}
            className="split-char inline-block will-change-transform will-change-opacity"
            style={{ opacity: 0 }} // Initially hidden
          >
            {disp}
          </span>
        );
      })}
    </>
  );
}

export default function PortfolioCinematicPanels(): React.JSX.Element {
  const { isRevealed } = useReveal();

  type Project = {
    id: number;
    title: string;
    slug: string;
    summary: string;
    hero: string | null;
    tags: { name: string; slug: string }[];
    external_url?: string;
    featured: boolean;
    order: number;
    is_active: boolean;
  };

  const [projects, setProjects] = useState<Project[]>([]);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const panelsWrapRef = useRef<HTMLDivElement | null>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  // We do NOT clear refs here. Instead we rely on index-based assignment.
  const [activeIndex, setActiveIndex] = useState(0);

  // 1. DATA FETCHING
  useEffect(() => {
    async function fetchProjects() {
      try {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const backend = `${protocol}//${hostname}:8000`;

        const res = await fetch(`${backend}/api/portfolio/projects/`);
        if (!res.ok) throw new Error('Failed to fetch projects');

        const data: Project[] = await res.json();
        const cleaned = data
          .filter(p => p.is_active)
          .sort((a, b) => a.order - b.order)
          .map(p => ({
            ...p,
            hero: p.hero
              ? p.hero.startsWith('http') ? p.hero : `${backend}${p.hero}`
              : '/placeholders/g1.png',
          }));
        setProjects(cleaned);
      } catch (err) {
        console.error('Portfolio fetch failed', err);
      }
    }
    fetchProjects();
  }, []);

  // 2. ANIMATION LOGIC
  useEffect(() => {
    if (!projects.length) return;
    if (typeof window === 'undefined') return;
    if (!wrapRef.current) return;

    let ctx: gsap.Context | null = null;

    try {
      ctx = gsap.context(() => {

        // --- A. HERO ANIMATION ---
        const heroLogo = heroRef.current?.querySelector('.hero-logo-wrap');
        const heroTitleParts = heroRef.current?.querySelectorAll('.hero-anim-text');
        const scrollHint = heroRef.current?.querySelector('.scroll-hint');

        const entranceTL = gsap.timeline({ delay: 0.1 });

        if (heroLogo) {
          entranceTL.fromTo(heroLogo,
            { autoAlpha: 0, y: 20 },
            { autoAlpha: 1, y: 0, duration: 1.0, ease: 'power3.out' }
          );
        }

        if (heroTitleParts && heroTitleParts.length > 0) {
          entranceTL.fromTo(heroTitleParts,
            { y: '50%', autoAlpha: 0, filter: 'blur(10px)' },
            { y: '0%', autoAlpha: 1, filter: 'blur(0px)', duration: 1.2, stagger: 0.15, ease: 'power3.out' },
            '-=0.8'
          );
        }

        if (scrollHint) {
          entranceTL.fromTo(scrollHint,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 1, delay: 0.2 },
            '-=0.5'
          );
        }

        // --- B. SCROLL ZOOM EXIT ---
        const heroEl = heroRef.current;
        const panelsEl = panelsWrapRef.current;
        if (heroEl && panelsEl) {
          const t = gsap.timeline({
            scrollTrigger: {
              trigger: wrapRef.current!,
              start: 'top top',
              end: '+=100%',
              scrub: 0.5,
              pin: true,
              anticipatePin: 1,
            },
          });
          // Fade out hero
          t.to(heroEl, { scale: 1.1, filter: 'blur(10px)', autoAlpha: 0, ease: 'power2.in', duration: 1 }, 0);
          // Fade in panels
          gsap.set(panelsEl, { autoAlpha: 0 });
          t.to(panelsEl, { autoAlpha: 1, duration: 0.6, ease: 'power1.inOut' }, 0.3);
        }

        // --- C. PANEL & CARD ANIMATIONS ---
        panelRefs.current.forEach((panelEl, i) => {
          if (!panelEl) return;

          const centerImg = panelEl.querySelector<HTMLImageElement>('.panel-centered-img');
          const contentCard = panelEl.querySelector<HTMLElement>('.panel-card');

          // C1. Basic Panel Appearance
          if (i !== 0) {
            gsap.fromTo(panelEl,
              { autoAlpha: 0 },
              {
                autoAlpha: 1,
                ease: 'none',
                scrollTrigger: {
                  trigger: panelEl,
                  start: 'top 85%', // Triggers earlier to ensure visibility
                  end: 'top 20%',
                  scrub: true,
                  onEnter: () => setActiveIndex(i),
                  onEnterBack: () => setActiveIndex(i),
                },
              }
            );
          }

          // C2. Image Parallax (Simple & Robust)
          if (centerImg) {
            gsap.fromTo(centerImg,
              { scale: 1.0, y: 0 },
              {
                scale: 1.05, y: -20,
                ease: 'none',
                scrollTrigger: { trigger: panelEl, start: 'top bottom', end: 'bottom top', scrub: 0.5 }
              }
            );
          }

          // --- C3. TEXT REVEAL ANIMATION (FIXED) ---
          if (contentCard) {
            const titleWords = contentCard.querySelectorAll('.split-word');
            const subtitleChars = contentCard.querySelectorAll('.split-char');
            const chips = contentCard.querySelectorAll('.panel-chip');
            const ctas = contentCard.querySelectorAll('.panel-cta');

            // 1. Reset everything to hidden state immediately
            gsap.set(contentCard, { autoAlpha: 0, y: 40 });
            if (titleWords.length) gsap.set(titleWords, { autoAlpha: 0, y: 20, filter: 'blur(8px)' });
            if (subtitleChars.length) gsap.set(subtitleChars, { autoAlpha: 0, filter: 'blur(5px)' });
            if (chips.length) gsap.set(chips, { autoAlpha: 0, scale: 0.9 });
            if (ctas.length) gsap.set(ctas, { autoAlpha: 0, y: 10 });

            // 2. Create Timeline
            const tl = gsap.timeline({
              scrollTrigger: {
                trigger: contentCard, // Trigger on the card itself!
                start: 'top 85%',     // Start when card top is near bottom of screen
                end: 'bottom top',
                toggleActions: 'play none none reverse', // Play on enter, reverse on leave up
              }
            });

            // Card Reveal
            tl.to(contentCard, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0);

            // Title Reveal (Blurry Fly In)
            if (titleWords.length) {
              tl.to(titleWords, {
                autoAlpha: 1,
                y: 0,
                filter: 'blur(0px)',
                duration: 0.8,
                stagger: 0.05,
                ease: 'power4.out'
              }, 0.1);
            }

            // Subtitle Focus In
            if (subtitleChars.length) {
              tl.to(subtitleChars, {
                autoAlpha: 1,
                filter: 'blur(0px)',
                duration: 0.6,
                stagger: 0.01,
                ease: 'power2.out'
              }, 0.3);
            }

            // Chips Pop
            if (chips.length) {
              tl.to(chips, {
                autoAlpha: 1,
                scale: 1,
                duration: 0.5,
                stagger: 0.05,
                ease: 'back.out(1.5)'
              }, 0.5);
            }

            // CTA Slide
            if (ctas.length) {
              tl.to(ctas, {
                autoAlpha: 1,
                y: 0,
                duration: 0.5,
                ease: 'power2.out'
              }, 0.6);
            }
          }
        });

      }, wrapRef);
    } catch (err) {
      console.error('[Portfolio] init error', err);
    }

    // Delayed refresh to handle transition/reveal timing
    const t = setTimeout(() => ScrollTrigger.refresh(), 800);
    return () => {
      clearTimeout(t);
      if (ctx) ctx.revert();
    };
  }, [projects.length, isRevealed]);

  return (
    <section
      ref={wrapRef}
      id="portfolio-cinematic"
      className="relative w-full overflow-hidden bg-[#020617]"
      aria-label="Cinematic portfolio panels"
    >

      {/* HERO SECTION */}
      <div
        ref={heroRef}
        className="relative h-screen w-full flex flex-col items-center justify-center text-center overflow-hidden"
        style={{ zIndex: 40, willChange: 'transform, opacity' }}
      >
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[#020617]" />
          <div className="hero-glow absolute top-[-20%] left-[50%] -translate-x-1/2 w-[80vw] h-[80vw] bg-[#1f6fe6] opacity-20 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow" />
          <div className="hero-glow absolute bottom-[-10%] left-[20%] w-[40vw] h-[40vw] bg-[#6366f1] opacity-10 blur-[100px] rounded-full mix-blend-screen" />
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
            }}
          />
          <div className="absolute inset-0 bg-radial-vignette" />
        </div>

        <div className="relative z-10 px-6 max-w-[1400px] w-full flex flex-col items-center">
          <div className="hero-logo-wrap mb-8 md:mb-12 inline-flex items-center justify-center overflow-hidden">
            <div className="glass-pill px-5 py-2 md:px-6 md:py-3 rounded-full flex items-center gap-3 border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl cursor-default">
              <img src="/logo/logo-inta.png" alt="logo" className="w-6 h-6 md:w-8 md:h-8 object-contain drop-shadow-lg" />
              <span className="text-xs md:text-sm font-semibold tracking-widest text-blue-100 uppercase">Inta Solutions</span>
            </div>
          </div>

          <h1 className="hero-title font-black leading-[0.9] tracking-tight text-white select-none text-center">
            <div className="overflow-hidden">
              <div className="hero-anim-text block bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/60 pb-2 md:pb-4">
                Solutions
              </div>
            </div>
            <div className="overflow-hidden">
              <div className="hero-anim-text block text-transparent bg-clip-text bg-gradient-to-br from-[#94b3ff] to-white/70">
                We’ve Built
              </div>
            </div>
          </h1>

          <div className="overflow-hidden mt-8 md:mt-10 max-w-lg mx-auto">
            <p className="hero-anim-text text-lg md:text-xl text-blue-200/60 font-light leading-relaxed">
              Crafting digital ecosystems with precision, depth, and cinematic fidelity.
            </p>
          </div>
        </div>

        <div className="scroll-hint absolute bottom-8 md:bottom-12 flex flex-col items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Scroll to Explore</span>
          <div className="w-[1px] h-12 md:h-16 bg-gradient-to-b from-blue-500/0 via-blue-400/50 to-blue-500/0 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white/80 blur-[1px] animate-scroll-drop" />
          </div>
        </div>
      </div>

      {/* PANELS WRAPPER */}
      <div ref={panelsWrapRef} className="relative -mt-[100vh] z-10 opacity-0">
        <div className="w-full">
          {projects.map((p, idx) => (
            <div
              key={p.id}
              ref={(el) => { panelRefs.current[idx] = el; }}
              className="sticky top-0 h-screen flex items-center justify-center overflow-hidden"
              role="region"
              aria-labelledby={`${p.id}-title`}
            >
              <div className="absolute inset-0 panel-bg will-change-transform" aria-hidden>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${p.hero})`, backgroundSize: 'cover', backgroundPosition: 'center center', filter: 'blur(32px) brightness(0.55) saturate(1.1)', transform: 'scale(1.1)', zIndex: 0 }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 6, pointerEvents: 'none', padding: '3vh 4vw' }}>
                  <img className="panel-centered-img" src={p.hero || ''} alt={`${p.title} screenshot`} style={{ width: 'auto', height: '80vh', maxWidth: '100%', objectFit: 'contain', display: 'block', borderRadius: 16, boxShadow: '0 24px 80px rgba(2,6,23,0.55)', transformOrigin: 'center center', zIndex: 6 }} />
                </div>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(0,0,0,0) 30%, rgba(0,0,0,0.4) 100%)', zIndex: 8, pointerEvents: 'none' }} />
              </div>

              {/* Card Container */}
              <div className="relative z-20 text-center w-full max-w-4xl px-4 md:px-6 pointer-events-none flex justify-center">
                <div
                  className="panel-card pointer-events-auto relative w-full max-w-2xl rounded-3xl px-6 py-8 md:px-10 md:py-10 transform-gpu"
                  style={{
                    background: 'rgba(8, 12, 24, 0.75)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 40px 100px -10px rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                  }}
                >
                  <div className="flex flex-col md:flex-row items-start gap-6">
                    <div className="hidden md:block w-1.5 h-20 rounded-full bg-gradient-to-b from-[#1f6fe6] to-[#0b2a5f] flex-shrink-0 mt-2" />

                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-3 mb-4 opacity-80">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center p-1.5">
                          <img src="/logo/logo-inta.png" alt="logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-xs font-bold tracking-wider text-blue-200 uppercase">IN-TA Solutions</span>
                      </div>

                      <h3 id={`${p.id}-title`} className="text-3xl md:text-5xl font-extrabold tracking-tight leading-none text-white mb-3">
                        <SplitWords text={p.title} />
                      </h3>

                      <p className="text-base md:text-lg text-white/70 max-w-xl font-light leading-relaxed">
                        <SplitChars text={p.summary} />
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {p.tags.map((tag) => (
                          <span key={tag.slug} className="panel-chip inline-block px-3 py-1 rounded-full text-[11px] uppercase tracking-wide font-semibold"
                            style={{ background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {tag.name}
                          </span>
                        ))}
                      </div>

                      <div className="mt-8">
                        <a
                          href={p.external_url || `/portfolio/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="panel-cta inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-medium text-sm text-white bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6] hover:brightness-110 transition-all shadow-lg shadow-blue-900/40 group"
                        >
                          View Case Study
                          <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </a>
                      </div>

                    </div>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .hero-title { font-size: clamp(48px, 10vw, 120px); }
        .bg-radial-vignette { background: radial-gradient(circle at center, transparent 30%, rgba(2,6,23,0.95) 100%); }
        @keyframes pulse-slow {
            0%, 100% { opacity: 0.15; transform: translate(-50%, 0) scale(1); }
            50% { opacity: 0.25; transform: translate(-50%, 0) scale(1.15); }
        }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        @keyframes scroll-drop {
            0% { top: -100%; opacity: 0; }
            50% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
        .animate-scroll-drop { animation: scroll-drop 2.5s cubic-bezier(0.77, 0, 0.175, 1) infinite; }
        .glass-pill { transition: transform 0.3s ease, box-shadow 0.3s ease, background 0.3s; }
        .glass-pill:hover { transform: translateY(-2px); box-shadow: 0 10px 30px -5px rgba(31, 111, 230, 0.4); background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.25); }
        .panel-bg, .panel-mid, .panel-fg { will-change: transform, opacity; transform: translate3d(0,0,0); }
        @media (max-width: 768px) {
            .panel-centered-img { height: 50vh !important; }
        }
      `}</style>
    </section>
  );
}
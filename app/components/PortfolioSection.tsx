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

/**
 * Full component:
 * - Initial full-screen "Our Craft" hero (brand gradient background)
 * - On scroll: hero zooms & fades -> panels revealed
 * - Panels keep the cinematic visuals & text animations we've built previously
 *
 * NOTE: This file references your uploaded logo at `/mnt/data/logo.jpg`
 * (developer-provided local path).
 */

const PANEL_IMAGES: string[] = [
  '/portfolio/cel.png',
  '/portfolio/qma.png',
  '/portfolio/bg3.jpg',
];

const PANELS = [
  { id: 'panel-1', title: 'Spatial Experiences', subtitle: 'Immersive product storytelling' },
  { id: 'panel-2', title: 'Design in Motion', subtitle: 'Cinematic visuals & depth' },
  { id: 'panel-3', title: 'Studio Quality', subtitle: 'Premium visual identity delivered' },
];

function SplitWords({ text }: { text: string }) {
  return (
    <>
      {text.split(' ').map((w, i) => (
        <span key={i} className="split-word inline-block mr-2" aria-hidden>
          {w}
        </span>
      ))}
    </>
  );
}

function SplitChars({ text }: { text: string }) {
  return (
    <>
      {Array.from(text).map((ch, i) => {
        const disp = ch === ' ' ? '\u00A0' : ch;
        return (
          <span key={i} className="split-char inline-block" aria-hidden>
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
  const [loading, setLoading] = useState(true);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const panelsWrapRef = useRef<HTMLDivElement | null>(null);
  const panelRefs = useRef<HTMLDivElement[]>([]);
  panelRefs.current = [];
  const [activeIndex, setActiveIndex] = useState(0);

  const addPanelRef = (el: HTMLDivElement | null) => {
    if (el && !panelRefs.current.includes(el)) panelRefs.current.push(el);
  };

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
              ? p.hero.startsWith('http')
                ? p.hero
                : `${backend}${p.hero}`
              : '/placeholders/g1.png',
          }));

        setProjects(cleaned);
      } catch (err) {
        console.error('Portfolio fetch failed', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);




  useEffect(() => {
    if (!projects.length) return;
    if (typeof window === 'undefined') return;
    if (!isRevealed) return;
    if (!wrapRef.current) return;

    let ctx: gsap.Context | null = null;

    try {
      ctx = gsap.context(() => {
        // 1) HERO: pin + zoom/fade timeline that reveals panels below
        try {
          const heroEl = heroRef.current;
          const panelsEl = panelsWrapRef.current;

          if (heroEl && panelsEl) {
            // timeline: pin the whole section while hero animation runs
            const t = gsap.timeline({
              scrollTrigger: {
                trigger: wrapRef.current!,
                start: 'top top',
                end: '+=120%', // length of pin — adjust for slower/faster reveal
                scrub: 0.7,
                pin: true,
                anticipatePin: 1,
                // markers: true,
              },
            });

            // hero zoom and gentle upward shift + fade out as we scroll
            t.to(heroEl, { scale: 1.06, ease: 'sine.out', duration: 1 }, 0);
            t.to(heroEl, { y: -36, ease: 'power1.out', duration: 1 }, 0);
            t.to(heroEl, { autoAlpha: 0, ease: 'power1.out', duration: 0.9 }, 0.45);

            // reveal panels container by translating from below into view
            gsap.set(panelsEl, { y: 120, autoAlpha: 0 });
            t.to(panelsEl, { y: 0, autoAlpha: 1, duration: 0.9, ease: 'power3.out' }, 0.28);
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[PortfolioCinematicPanels] hero animation failed', err);
        }

        // 2) Panels: existing per-panel animations (parallax, micro zoom, text emphasis)
        panelRefs.current.forEach((panelEl, i) => {
          if (!panelEl) return;
          const bg = panelEl.querySelector<HTMLElement>('.panel-bg');
          const mid = panelEl.querySelector<HTMLElement>('.panel-mid');
          const fg = panelEl.querySelector<HTMLElement>('.panel-fg');
          const centerImg = panelEl.querySelector<HTMLImageElement>('.panel-centered-img');
          const contentCard = panelEl.querySelector<HTMLElement>('.panel-card');

          // MAIN reveal (scrubbed subtle lift)
          gsap.fromTo(
            panelEl,
            { autoAlpha: 0, y: 40 },
            {
              autoAlpha: 1,
              y: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: panelEl,
                start: 'top 72%',
                end: 'top 28%',
                scrub: true,
                onEnter: () => setActiveIndex(i),
                onEnterBack: () => setActiveIndex(i),
              },
            }
          );

          // parallax layers
          if (bg) {
            gsap.to(bg, {
              scale: 1.04,
              y: -22,
              ease: 'none',
              scrollTrigger: {
                trigger: panelEl,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.9,
              },
            });
          }
          if (mid) {
            gsap.to(mid, {
              y: -38,
              x: -6,
              ease: 'none',
              scrollTrigger: {
                trigger: panelEl,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1.0,
              },
            });
          }
          if (fg) {
            gsap.to(fg, {
              y: -64,
              x: -10,
              ease: 'none',
              scrollTrigger: {
                trigger: panelEl,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1.2,
              },
            });
          }

          // center image micro-zoom
          if (centerImg) {
            try {
              gsap.fromTo(
                centerImg,
                { scale: 1.0 },
                {
                  scale: 1.035,
                  ease: 'sine.out',
                  scrollTrigger: {
                    trigger: panelEl,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 0.85,
                  },
                }
              );
              gsap.to(centerImg, {
                y: -10,
                ease: 'none',
                scrollTrigger: {
                  trigger: panelEl,
                  start: 'top bottom',
                  end: 'bottom top',
                  scrub: 0.85,
                },
              });
            } catch (e) {
              // ignore
            }
          }

          // content card entrance (polished)
          if (contentCard) {
            gsap.set(contentCard, { autoAlpha: 1, y: 6, scale: 0.995 });
            const cardTL = gsap.timeline({
              scrollTrigger: {
                trigger: panelEl,
                start: 'top 70%',
                end: 'top 36%',
                toggleActions: 'play reverse play reverse',
              },
            });

            // subtle lift / reveal
            cardTL.to(contentCard, { y: 0, scale: 1, duration: 0.48, ease: 'power3.out' }, 0);

            // title: word-by-word slide/punch (ensure split-word spans present)
            const titleWords = contentCard.querySelectorAll<HTMLElement>('.split-word');
            if (titleWords.length) {
              gsap.set(titleWords, { autoAlpha: 1, y: 18, scale: 0.985, transformOrigin: 'center' });
              cardTL.to(
                titleWords,
                {
                  y: 0,
                  autoAlpha: 1,
                  scale: 1,
                  duration: 0.5,
                  ease: 'power3.out',
                  stagger: { each: 0.06, from: 'start' },
                },
                0.06
              );

              // title sweep accent
              const titleSweep = contentCard.querySelector<HTMLElement>('.title-sweep');
              if (titleSweep) {
                gsap.set(titleSweep, { scaleX: 0, autoAlpha: 0.9, transformOrigin: 'left center' });
                cardTL.to(titleSweep, { scaleX: 1.12, duration: 0.52, ease: 'power2.out' }, 0.12);
                cardTL.to(titleSweep, { autoAlpha: 0, duration: 0.4, ease: 'power2.out' }, '>-0.08');
              }
            }

            // subtitle typing emphasis
            const subtitleChars = contentCard.querySelectorAll<HTMLElement>('.split-char');
            const cursor = contentCard.querySelector<HTMLElement>('.type-cursor');
            if (subtitleChars.length) {
              gsap.set(subtitleChars, { autoAlpha: 1, y: 4, color: 'rgba(245,247,250,0.92)' });
              if (cursor) gsap.set(cursor, { autoAlpha: 1 });

              const typingTL = gsap.timeline({ defaults: { ease: 'none' } });
              typingTL.to(subtitleChars, {
                color: '#ffffff',
                textShadow: '0 8px 20px rgba(255,255,255,0.06)',
                duration: 0.06,
                stagger: { each: 0.03, from: 'start' },
              }, 0.12);
              typingTL.to(subtitleChars, {
                color: 'rgba(245,247,250,0.9)',
                textShadow: 'none',
                duration: 0.8,
                delay: 0.06,
              }, '+=0.02');
              if (cursor) typingTL.to(cursor, { autoAlpha: 0.85, duration: 0.18 }, '-=0.12');

              cardTL.add(typingTL, '>-0.02');
            } else {
              const subtitleEl = contentCard.querySelector<HTMLElement>('.panel-subtitle');
              if (subtitleEl) {
                gsap.set(subtitleEl, { autoAlpha: 1, y: 8 });
                cardTL.to(subtitleEl, { y: 0, duration: 0.45, ease: 'power3.out' }, '-=0.18');
              }
            }

            // chips / ctas micro pop
            const chips = contentCard.querySelectorAll<HTMLElement>('.panel-chip');
            if (chips.length) {
              gsap.set(chips, { autoAlpha: 1, y: 6, scale: 0.985 });
              cardTL.to(chips, { autoAlpha: 1, y: 0, scale: 1, duration: 0.36, stagger: 0.06, ease: 'power3.out' }, '-=0.22');
            }

            const ctas = contentCard.querySelectorAll<HTMLElement>('.panel-cta');
            if (ctas.length) {
              gsap.set(ctas, { autoAlpha: 1, y: 8, scale: 0.986 });
              cardTL.to(ctas, { autoAlpha: 1, y: 0, scale: 1, duration: 0.44, stagger: 0.06, ease: 'power3.out' }, '-=0.18');
            }
          }
        });

        // breathing fog subtle movement
        const fogs = gsap.utils.toArray<HTMLElement>('.panel-fog');
        fogs.forEach((f, idx) => {
          gsap.to(f, {
            xPercent: idx % 2 === 0 ? -5 : 5,
            yPercent: idx % 2 === 0 ? -3 : 3,
            duration: 28,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: idx * 0.6,
          });
        });
      }, wrapRef);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[PortfolioCinematicPanels] init error', err);
    }

    try {
      ScrollTrigger.refresh();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[PortfolioCinematicPanels] ScrollTrigger.refresh() failed', e);
    }

    return () => {
      try {
        if (ctx) ctx.revert();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[PortfolioCinematicPanels] ctx.revert() failed', e);
      }
    };
  }, [projects.length, isRevealed]);

  // pointer tilt (desktop)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handle = (ev: PointerEvent) => {
      if (window.innerWidth < 960) return;
      const activePanel = panelRefs.current[activeIndex];
      if (!activePanel) return;
      const card = activePanel.querySelector<HTMLElement>('.panel-card');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = (ev.clientX - rect.left) / rect.width - 0.5;
      const y = (ev.clientY - rect.top) / rect.height - 0.5;
      const rotY = x * 6;
      const rotX = -y * 6;
      gsap.to(card, { rotationY: rotY, rotationX: rotX, transformPerspective: 900, transformOrigin: 'center', duration: 0.45, ease: 'power3.out' });
    };

    const reset = () => {
      const activePanel = panelRefs.current[activeIndex];
      if (!activePanel) return;
      const card = activePanel.querySelector<HTMLElement>('.panel-card');
      if (!card) return;
      gsap.to(card, { rotationY: 0, rotationX: 0, duration: 0.6, ease: 'power3.out' });
    };

    window.addEventListener('pointermove', handle, { passive: true });
    window.addEventListener('pointerleave', reset);
    window.addEventListener('scroll', reset, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handle);
      window.removeEventListener('pointerleave', reset);
      window.removeEventListener('scroll', reset);
    };
  }, [activeIndex]);

  return (
    <section ref={wrapRef} id="portfolio-cinematic" className="relative w-full overflow-hidden" aria-label="Cinematic portfolio panels">
      {/* HERO (full-bleed brand gradient) */}
      <div
        ref={heroRef}
        className="relative h-screen w-full flex items-center justify-center text-center"
        style={{
          background: 'linear-gradient(180deg, #1f6fe6 0%, #0b2a5f 60%, #07172a 100%)', // brand gradient
          color: 'white',
          zIndex: 40,
          willChange: 'transform, opacity',
        }}
      >
        <div style={{ maxWidth: 1200, padding: '0 28px' }}>
          <img src="/logo/logo-inta.png" alt="logo" style={{ width: 222, height: 222, objectFit: 'contain', margin: '0 auto 18px' }} />
          <h1
            className="hero-title"
            style={{
              fontSize: 'clamp(48px, 10vw, 140px)',
              lineHeight: 0.88,
              margin: 0,
              fontWeight: 900,
              letterSpacing: '-0.02em',
              transformOrigin: 'center',
              textShadow: '0 18px 60px rgba(2,6,23,0.6)',
            }}
          >
            Our Craft
          </h1>

        </div>
      </div>

      {/* PANELS WRAPPER (initially hidden under hero, revealed by hero timeline) */}
      <div ref={panelsWrapRef} className="relative -mt-0 z-10">
        <div className="w-full">
          {projects.map((p, idx) => (

            <div
              key={p.id}
              ref={addPanelRef}
              className="relative h-screen flex items-center justify-center overflow-hidden"
              role="region"
              aria-labelledby={`${p.id}-title`}
            >
              {/* Background image blurred cover */}
              <div className="absolute inset-0 panel-bg will-change-transform" aria-hidden>
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${p.hero})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center center',
                    filter: 'blur(28px) brightness(0.62) saturate(1.05)',
                    transform: 'scale(1.06)',
                    zIndex: 0,
                  }}
                />
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 6,
                    pointerEvents: 'none',
                    padding: '3vh 4vw',
                  }}
                >
                  <img
                    className="panel-centered-img"
                    src={p.hero || ''}
                    alt={`${p.title} screenshot`}
                    style={{
                      width: 'auto',
                      height: '84vh',
                      maxWidth: '100%',
                      objectFit: 'contain',
                      display: 'block',
                      borderRadius: 12,
                      boxShadow: '0 24px 80px rgba(2,6,23,0.45)',
                      transformOrigin: 'center center',
                      zIndex: 6,
                    }}
                  />
                </div>
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.28) 100%)',
                    zIndex: 8,
                    pointerEvents: 'none',
                  }}
                />
              </div>

              {/* Mid accents */}
              <div className="absolute inset-0 panel-mid pointer-events-none" aria-hidden>
                <div style={{ position: 'absolute', left: '-10%', top: '10%', width: '70%', height: '70%', background: 'radial-gradient(closest-side at 20% 30%, rgba(255,255,255,0.02), transparent 30%)', filter: 'blur(46px)' }} />
                <div style={{ position: 'absolute', right: '-8%', bottom: '-6%', width: '60%', height: '60%', background: 'radial-gradient(closest-side at 30% 30%, rgba(0,0,0,0.04), transparent 30%)', filter: 'blur(72px)' }} />
              </div>

              {/* Fog/bloom */}
              <div className="absolute inset-0 panel-fg pointer-events-none" aria-hidden>
                <div className="panel-fog absolute left-1/4 top-1/4 w-[60%] h-[60%] rounded-full opacity-40 mix-blend-screen" style={{ background: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.06), rgba(31,111,230,0.02) 25%, transparent 60%)', filter: 'blur(68px)' }} />
                <div className="panel-fog absolute right-0 bottom-0 w-[40%] h-[40%] rounded-full opacity-30 mix-blend-screen" style={{ background: 'radial-gradient(circle at 60% 60%, rgba(15,91,255,0.06), rgba(0,0,0,0.02) 30%, transparent 80%)', filter: 'blur(84px)' }} />
              </div>

              {/* Main content card (upgraded visuals) */}
              <div className="relative z-20 text-center max-w-4xl px-6">
                <div
                  className="panel-card mx-auto max-w-3xl rounded-3xl px-6 py-8 transform-gpu"
                  style={{
                    background: 'linear-gradient(135deg, rgba(8,12,24,0.66), rgba(11,42,95,0.50))',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 30px 60px rgba(2,6,23,0.6)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div style={{ width: 6, height: 72, borderRadius: 12, background: 'linear-gradient(180deg,#1f6fe6,#0b2a5f)' }} />
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/6 flex items-center justify-center">
                            <img src="/logo/logo-inta.png" alt="logo" className="w-full h-full object-contain" />
                          </div>
                          <div className="text-xs text-white/70">
                            <div className="font-semibold">IN-TA Solutions</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 relative overflow-visible">
                        <h3 id={`${p.id}-title`} className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-white">
                          <span className="title-wrap inline-block">
                            <SplitWords text={p.title} />
                          </span>
                        </h3>

                        <span
                          className="title-sweep"
                          aria-hidden
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: '18%',
                            height: '64%',
                            width: '100%',
                            background:
                              'linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.18), rgba(255,255,255,0.06))',
                            transformOrigin: 'left center',
                            pointerEvents: 'none',
                            borderRadius: 6,
                            mixBlendMode: 'screen',
                          }}
                        />
                      </div>

                      <p className="panel-subtitle mt-3 text-base md:text-lg text-white/80 max-w-2xl" aria-hidden>
                        <span style={{ display: 'inline-block' }}>
                          <SplitChars text={p.summary} />
                          <span className="type-cursor inline-block ml-1 text-white/90" aria-hidden>|</span>
                        </span>
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">

                        {p.tags.map((tag) => (
                          <span key={tag.slug} className="panel-chip inline-block px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.92)' }}>
                            {tag.name}
                          </span>
                        ))}
                      </div>

                      <div className="mt-6 flex items-center gap-4">
                        <a
                          href={p.external_url || `/portfolio/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="panel-cta px-5 py-2 rounded-full font-medium"
                        >
                          View project
                        </a>


                        <a
                          className="panel-cta inline-flex items-center px-4 py-2 rounded-full text-sm font-medium"
                          style={{
                            border: '1px solid rgba(31,111,230,0.26)',
                            color: 'rgba(255,255,255,0.9)',
                            background: 'transparent',
                          }}
                          href="#"
                          aria-label="More details"
                        >
                          Details
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-center">
                  <div className="w-24 h-0.5 bg-white/12 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        /* visual helpers */
        .panel-bg, .panel-mid, .panel-fg { will-change: transform, opacity; transform: translate3d(0,0,0); }
        .panel-card { transition: box-shadow .25s ease, transform .25s ease; }
        .panel-card:hover { transform: translateY(-6px) scale(1.002); box-shadow: 0 48px 120px rgba(2,6,23,0.7); }
        .split-word { display: inline-block; white-space: pre; }
        .split-char { display: inline-block; white-space: pre; transform: translateY(6px); opacity: 0; }
        .type-cursor { display: inline-block; opacity: 1; animation: blink 0.9s steps(2, start) infinite; color: rgba(255,255,255,0.9); }
        .panel-chip { transition: transform .22s ease, box-shadow .22s ease; }
        .panel-chip:hover { transform: translateY(-4px); box-shadow: 0 10px 30px rgba(2,6,23,0.28); }
        .panel-cta { transition: transform .18s ease, box-shadow .18s ease; }
        .panel-cta:hover { transform: translateY(-3px); }
        @keyframes blink { 0%,49%{opacity:1}50%,100%{opacity:0} }
        @media (max-width: 1024px) {
          .panel-fg, .panel-mid { display: none; }
          .panel-centered-img { height: 56vh !important; }
          .hero-title { font-size: 48px !important; }
        }
      `}</style>
    </section>
  );
}

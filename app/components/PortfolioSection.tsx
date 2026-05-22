// frontend/components/PortfolioCinematicPanels.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';
import { useReveal } from '../context/RevealContext';

if (typeof window !== 'undefined') {
  try {
    gsap.registerPlugin(ScrollTrigger);
  } catch (e) {
    // ignore HMR double-register
  }
}

// Retained SplitWords for titles (low node count, high impact)
function SplitWords({ text }: { text: string }) {
  if (!text) return null;
  return (
    <span aria-label={text} className="inline-block leading-tight">
      {text.split(' ').map((w, i) => (
        <span
          key={i}
          className="split-word inline-block max-w-full break-all md:break-words mr-2 md:mr-3 will-change-transform will-change-opacity"
          style={{ opacity: 0 }}
        >
          {w}
        </span>
      ))}
    </span>
  );
}

export default function PortfolioCinematicPanels(): React.JSX.Element {
  const { isRevealed } = useReveal();
  const [projects, setProjects] = useState<any[]>([]);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 1. DATA FETCHING (Kept identical to your logic)
  useEffect(() => {
    async function fetchProjects() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        const res = await fetch(`${apiBase}/api/portfolio/projects/`);
        if (!res.ok) throw new Error('Failed to fetch projects');

        const data = await res.json();
        const cleaned = data
          .filter((p: any) => p.is_active)
          .sort((a: any, b: any) => a.order - b.order)
          .map((p: any) => ({
            ...p,
            hero: (() => {
              const h = p.hero;
              if (!h) return '/placeholders/g1.png';
              if (h.startsWith('/')) return `${apiBase}${h}`;
              if (h.includes('localhost') || h.includes('127.0.0.1')) {
                try {
                  const url = new URL(h);
                  return `${apiBase}${url.pathname}${url.search}`;
                } catch { return h; }
              }
              return h;
            })(),
          }));
        setProjects(cleaned);
      } catch (err) {
        console.error('Portfolio fetch failed', err);
      }
    }
    fetchProjects();
  }, []);

  // 2. HIGH-PERFORMANCE SCROLL LOGIC
  useEffect(() => {
    if (!projects.length || !isRevealed || typeof window === 'undefined') return;

    let ctx = gsap.context(() => {

      // A. Hero Entrance Animation
      gsap.fromTo('.hero-anim-text',
        { y: 40, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 1, stagger: 0.15, ease: 'power3.out', delay: 0.2 }
      );

      // Fade out Hero when first card comes up to prevent ghosting
      if (panelRefs.current[0]) {
        gsap.to('.hero-section', {
          opacity: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: panelRefs.current[0],
            start: 'top 80%',
            end: 'top 30%',
            scrub: true,
          }
        });
      }

      // B. Card Stack Effect & Text Reveals
      panelRefs.current.forEach((panel, i) => {
        if (!panel) return;

        const cardInner = panel.querySelector('.card-inner');
        const titleWords = panel.querySelectorAll('.split-word');
        const textContent = panel.querySelectorAll('.fade-up-element');
        const imgScale = panel.querySelector('.img-scale');

        // Text reveal when card enters viewport
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: panel,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          }
        });

        if (titleWords.length) {
          tl.to(titleWords, {
            autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.04, ease: 'power3.out'
          }, 0);
        }

        if (textContent.length) {
          tl.fromTo(textContent,
            { autoAlpha: 0, y: 20 },
            { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' },
            0.2
          );
        }

        // Image Parallax (Simple zoom on scroll)
        if (imgScale) {
          gsap.fromTo(imgScale,
            { scale: 1.2 },
            {
              scale: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: panel,
                start: 'top bottom',
                end: 'top 20%',
                scrub: true
              }
            }
          );
        }

        // The "Deck of Cards" push-back effect
        // As the NEXT panel comes up, scale this one down slightly
        if (i < projects.length - 1) {
          gsap.to(cardInner, {
            scale: 0.92,
            opacity: 0.4,
            ease: 'none',
            scrollTrigger: {
              trigger: panelRefs.current[i + 1],
              start: 'top 90%',
              end: 'top 10%',
              scrub: true,
            }
          });
        }
      });

    }, wrapRef);

    return () => ctx.revert();
  }, [projects.length, isRevealed]);

  return (
    <section ref={wrapRef} className="relative w-full bg-[#020617] text-white">

      {/* 
        HERO SECTION
        Using CSS sticky instead of GSAP pinning for a buttery smooth scroll transition
      */}
      <div className="hero-section sticky top-0 h-screen w-full flex flex-col items-center justify-center text-center overflow-hidden z-0">
        <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />
        <div className="hero-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-[#1f6fe6] opacity-10 blur-[100px] rounded-full" />

        <div className="relative z-10 px-6 max-w-4xl w-full flex flex-col items-center">
          <div className="hero-anim-text glass-pill px-6 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8">
            <span className="text-sm font-semibold tracking-widest text-blue-200 uppercase">Inta Solutions</span>
          </div>

          <h2 className="text-5xl sm:text-6xl md:text-8xl font-black leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 mb-4 md:mb-6">
            <span className="hero-anim-text block">Solutions</span>
            <span className="hero-anim-text block text-[#94b3ff]">We’ve Built</span>
          </h2>

          <p className="hero-anim-text text-lg md:text-xl text-blue-200/60 font-light max-w-lg px-4 md:px-0">
            Crafting powerful digital ecosystems with precision and purpose.
          </p>
        </div>
      </div>

      {/* PANELS WRAPPER */}
      <div className="relative z-10 w-full pb-[10vh]">
        {projects.map((p, idx) => (
          <div
            key={p.id}
            ref={(el) => { panelRefs.current[idx] = el; }}
            // CSS Sticky creates the stacking effect naturally
            className="sticky top-0 h-screen flex items-center justify-center w-full px-4 md:px-8 py-12"
            style={{ paddingTop: `calc(5vh + ${idx * 10}px)` }} // Slight offset for stacking
          >
            {/* The actual Card */}
            <div className="card-inner w-full max-w-7xl h-[85vh] bg-[#0a1020] rounded-3xl md:rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col md:flex-row transform-gpu will-change-transform">

              {/* Left Content Half */}
              <div className="w-full md:w-1/2 min-w-0 h-[55%] sm:h-[60%] md:h-full relative z-10 overflow-y-auto custom-scrollbar overflow-x-hidden">
                <div className="p-6 sm:p-8 md:p-12 lg:p-16 min-h-full flex flex-col justify-center">
                  <div className="fade-up-element flex items-center gap-2 md:gap-3 mb-3 md:mb-6 flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#1f6fe6]" />
                    <span className="text-xs md:text-sm font-bold tracking-widest text-blue-300 uppercase">Case Study</span>
                  </div>

                  <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-3 md:mb-6 flex-shrink-0 break-words">
                    <SplitWords text={p.title} />
                  </h3>

                  {/* Removed SplitChars here for performance. Simple fade up instead. */}
                  <div className="fade-up-element text-sm sm:text-base md:text-[1.125rem] text-white/70 font-light leading-relaxed mb-5 md:mb-8 max-w-xl">
                    <p className="hidden md:block">
                      {p.summary?.length > 165 ? p.summary.substring(0, 165).replace(/\s+\S*$/, '') + '...' : p.summary}
                    </p>
                    <p className="block md:hidden">
                      {p.summary?.length > 80 ? p.summary.substring(0, 80).replace(/\s+\S*$/, '') + '...' : p.summary}
                    </p>
                  </div>

                  <div className="fade-up-element flex flex-wrap gap-1.5 md:gap-2 mb-6 md:mb-10 flex-shrink-0">
                    {p.tags.map((tag: any) => (
                      <span key={tag.slug} className="px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-[0.65rem] md:text-xs uppercase tracking-wide font-medium bg-white/5 border border-white/10 text-white/80">
                        {tag.name}
                      </span>
                    ))}
                  </div>

                  <div className="fade-up-element mt-auto md:mt-0 flex-shrink-0">
                    <a
                      href={p.external_url || `/portfolio#project-${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 md:gap-3 px-6 py-3 md:px-8 md:py-4 rounded-full font-medium text-xs md:text-sm text-white bg-[#1f6fe6] hover:bg-blue-500 transition-colors group"
                    >
                      View Project
                      <svg className="w-3 h-3 md:w-4 md:h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              {/* Right Image Half */}
              <div className="w-full md:w-1/2 min-w-0 h-[45%] sm:h-[40%] md:h-full relative overflow-hidden bg-black flex items-center justify-center p-4 sm:p-8">
                {/* Subtle gradient overlay to blend image into the card */}
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#0a1020] via-transparent to-transparent z-10 opacity-80" />

                {p.hero && (
                  <div className="relative w-full h-full transform-gpu overflow-hidden rounded-xl shadow-2xl z-0">
                    <Image
                      src={p.hero}
                      alt={p.title}
                      fill
                      className="img-scale object-cover md:object-contain object-center"
                    />
                  </div>
                )}
              </div>

            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .bg-radial-vignette { background: radial-gradient(circle at center, #020617 0%, #000000 100%); }
        .glass-pill { box-shadow: 0 10px 30px -5px rgba(31, 111, 230, 0.2); }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </section>
  );
}
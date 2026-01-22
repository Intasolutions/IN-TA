'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';
// Make sure these paths match your project structure
import CTA from '../../components/CTA';
import { useReveal } from '../../context/RevealContext';

gsap.registerPlugin(ScrollTrigger);

/* -------------------- VisitButton Component -------------------- */
function VisitButton({ href, label = 'Visit' }: { href: string; label?: string }) {
  return (
    <a
      href={href ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="visit-btn-component inline-flex items-center gap-3 px-4 py-2 rounded-full text-sm font-semibold transform-gpu pointer-events-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0b2b57]/30"
      aria-label={label}
    >
      <span aria-hidden className="absolute inset-0 rounded-full pointer-events-none" />
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="visit-icon" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M14 3h7v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 14L21 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 21H3V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="visit-text">{label}</span>

      <style jsx>{`
        .visit-btn-component {
          position: relative;
          z-index: 10;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 12px 30px rgba(11, 42, 95, 0.08);
          color: #07203f;
        }
        .visit-icon {
          color: #0b2b57;
          opacity: 0.95;
        }
        .visit-btn-component::after {
          content: '';
          position: absolute;
          left: -60%;
          top: 0;
          width: 40%;
          height: 100%;
          background: linear-gradient(
            120deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.55) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: skewX(-18deg) translateX(-10%);
          opacity: 0;
          transition: transform 0.9s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.45s ease;
          pointer-events: none;
          border-radius: 999px;
        }
        .visit-btn-component:hover::after,
        .visit-btn-component:focus::after,
        .visit-btn-component.show-shimmer::after {
          transform: translateX(220%) skewX(-18deg);
          opacity: 0.9;
        }
      `}</style>
    </a>
  );
}

/* -------------------- Fallback data -------------------- */
const FALLBACK_FEATURED = [
  {
    id: 'saas-01',
    title: 'Nimbus — Enterprise SaaS',
    role: 'Product + Engineering',
    summary: 'A multi-tenant B2B ecosystem featuring real-time analytics and granular RBAC. Engineered for high-load scalability and secure microservices.',
    hero: '/placeholders/saas-hero.png',
    tags: ['React', 'Node.js', 'Postgres', 'AWS'],
    href: 'https://example.com/nimbus',
  },
  {
    id: 'web-01',
    title: 'Intalite — Digital DXP',
    role: 'UX + Frontend',
    summary: 'A high-conversion digital presence optimized for lead generation. Features enterprise CMS integration and performance-driven product storytelling.',
    hero: '/placeholders/web-hero.png',
    tags: ['Next.js', 'Tailwind', 'Performance'],
    href: 'https://example.com/intalite',
  },
  {
    id: 'infra-01',
    title: 'Atlas — DevOps System',
    role: 'Backend & Infrastructure',
    summary: 'Mission-critical event-driven architecture and automated data pipelines designed for 99.99% uptime and industrial-grade reliability.',
    hero: '/placeholders/infra-hero.png',
    tags: ['Kubernetes', 'Cloud', 'Automation'],
    href: 'https://example.com/atlas',
  },
];

const FALLBACK_GALLERY = [
  { id: 'g1', title: 'Mobile App', image: '/placeholders/g1.png', href: 'https://example.com/mobile' },
  { id: 'g2', title: 'E-commerce', image: '/placeholders/g2.png', href: 'https://example.com/ecommerce' },
  { id: 'g3', title: 'Internal CRM', image: '/placeholders/g3.png', href: 'https://example.com/crm' },
  { id: 'g4', title: 'Analytics', image: '/placeholders/g4.png', href: 'https://example.com/analytics' },
  { id: 'g5', title: 'Design System', image: '/placeholders/g5.png', href: 'https://example.com/design' },
  { id: 'g6', title: 'Automation', image: '/placeholders/g6.png', href: 'https://example.com/automation' },
];

/* -------------------- Resilient client Image helper -------------------- */
function ResilientImage({
  src,
  alt,
  className,
  width,
  height,
  sizes,
}: {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
}) {
  const [errored, setErrored] = useState(false);
  const isAbsolute = /^https?:\/\//i.test(src);
  const isLocalHost = isAbsolute && /^https?:\/\/(?:127\.0\.0\.1|localhost|0\.0\.0\.0)(:\d+)?/i.test(src);
  const useNextImage = (!isAbsolute && src.startsWith('/')) || (isAbsolute && !isLocalHost);

  if (errored) {
    return <img src={'/placeholders/g1.png'} alt={alt ?? ''} className={className ?? 'object-cover w-full h-full'} width={width} height={height} />;
  }

  if (useNextImage) {
    if (width && height) {
      return (
        <Image
          src={src}
          alt={alt ?? ''}
          width={width}
          height={height}
          className={className ?? 'object-cover w-full h-full'}
          sizes={sizes}
          loading="lazy"
          onError={() => setErrored(true)}
        />
      );
    }
    return (
      <Image
        src={src}
        alt={alt ?? ''}
        fill
        className={className ?? 'object-cover w-full h-full'}
        sizes={sizes}
        loading="lazy"
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt ?? ''}
      className={className ?? 'object-cover w-full h-full'}
      width={width}
      height={height}
      onError={(e) => {
        try {
          const el = e.currentTarget as HTMLImageElement;
          el.onerror = null;
          el.src = '/placeholders/g1.png';
        } catch { }
      }}
    />
  );
}

/* ==================== PAGE ==================== */
export default function PortfolioPage() {
  const [projects, setProjects] = useState(FALLBACK_FEATURED);
  const [galleryItems, setGalleryItems] = useState(FALLBACK_GALLERY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    setLoading(true);
    const aborter = new AbortController();

    Promise.all([
      fetch(`${apiBase}/api/portfolio/projects/?ordering=-featured,order`, { signal: aborter.signal }).then((r) => {
        if (!r.ok) throw new Error('Projects fetch failed');
        return r.json();
      }),
      fetch(`${apiBase}/api/portfolio/gallery/`, { signal: aborter.signal }).then((r) => {
        if (!r.ok) throw new Error('Gallery fetch failed');
        return r.json();
      }),
    ])
      .then(([projData, galleryData]) => {
        const resolveUrl = (p: string | null) => {
          if (!p) return null;
          if (p.startsWith('http://') || p.startsWith('https://')) return p;
          if (p.startsWith('/')) {
            if (p.startsWith('/media/')) return `${apiBase}${p}`;
            return p;
          }
          return `${apiBase}${p}`;
        };

        const mapped = (projData || []).map((p: any) => ({
          id: p.slug ?? p.id,
          title: p.title,
          role: p.role,
          summary: p.summary,
          hero: resolveUrl(p.hero) ?? '/placeholders/saas-hero.png',
          tags: (p.tags || []).map((t: any) => t.name),
          href: p.external_url || '#',
        }));
        setProjects(mapped.length ? mapped : FALLBACK_FEATURED);

        const mappedGallery = (galleryData || []).map((g: any) => ({
          id: g.id,
          title: g.title,
          image: resolveUrl(g.image) ?? '/placeholders/g1.png',
          href: g.href || '#',
        }));
        setGalleryItems(mappedGallery.length ? mappedGallery : FALLBACK_GALLERY);

        setError(null);

        requestAnimationFrame(() => {
          try {
            ScrollTrigger.refresh();
          } catch { }
        });
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error('Portfolio fetch error:', err);
        setError('Unable to load portfolio — showing local examples.');
        requestAnimationFrame(() => {
          try {
            ScrollTrigger.refresh();
          } catch { }
        });
      })
      .finally(() => setLoading(false));

    return () => aborter.abort();
  }, []);

  return (
    <main className="min-h-screen bg-[#fbf8f5] text-slate-900 overflow-x-hidden">
      <Hero />
      <section className="max-w-7xl mx-auto px-6 py-16 lg:py-28">
        {loading && <div className="text-sm text-slate-500 mb-4">Loading portfolio…</div>}
        {error && <div className="text-sm text-amber-600 mb-4">{error}</div>}
        <FeaturedList projects={projects} />
      </section>
      <section className="max-w-7xl mx-auto px-6 pb-16 lg:pb-24">
        <GalleryGrid items={galleryItems} />
      </section>
      <section className="max-w-7xl mx-auto px-6 pb-20 lg:pb-32">
        <CTA
          title="Partner with us for your next digital milestone"
          subtitle="We engineer high-performance web applications and cloud infrastructure designed for global scalability and absolute reliability."
          primaryLabel="Start a Consultation"
          primaryHref="/contact"
          secondaryLabel="Speak with an Expert"
          secondaryHref="/contact"
        />
      </section>
    </main>
  );
}

function Hero() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const floatRef = useRef<HTMLDivElement | null>(null);
  const lenisRef = useRef<any>(null);
  const { isRevealed } = useReveal();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const lenis = new Lenis({ duration: 1.05, easing: (t: number) => 1 - Math.pow(1 - t, 3) });
      lenisRef.current = lenis;
      let mounted = true;
      function raf(time: number) {
        if (!mounted) return;
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
      return () => {
        mounted = false;
        try {
          if (lenis && lenis.destroy) lenis.destroy();
        } catch { }
      };
    } catch { }
  }, []);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isRevealed) return;

    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (titleRef.current) {
        const lines = titleRef.current.querySelectorAll('.reveal-line > span');
        if (!prefersReduce) {
          tl.fromTo(lines,
            { y: 36, autoAlpha: 0, filter: 'blur(8px)', transformOrigin: 'center left' },
            { y: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 2.1, stagger: 0.34, ease: 'power3.out', clearProps: 'filter' },
            0.08
          );
          tl.fromTo(
            titleRef.current.querySelectorAll('.reveal-line:nth-child(2) > span'),
            { x: 8 },
            { x: 0, duration: 0.8, ease: 'power2.out' },
            0.08
          );
        } else {
          gsap.set(lines, { clearProps: 'all' });
        }
      }

      if (floatRef.current && wrapRef.current && !prefersReduce) {
        gsap.set(floatRef.current, { autoAlpha: 1 });

        const floatTL = gsap.timeline({ repeat: -1, yoyo: true });
        floatTL.to(floatRef.current, { y: -12, rotation: 0.6, duration: 3.6, ease: 'sine.inOut' });

        gsap.to(wrapRef.current, {
          scale: 0.9985,
          rotation: 0.2,
          transformOrigin: 'center center',
          scrollTrigger: {
            trigger: wrapRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.9,
          },
        });

        const deviceImg = wrapRef.current.querySelector('img');
        if (deviceImg) {
          gsap.fromTo(
            deviceImg,
            { y: -10 },
            {
              y: -56,
              ease: 'none',
              scrollTrigger: {
                trigger: wrapRef.current,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
              },
            }
          );
        }
      }

      tl.fromTo(
        '.hero-cta',
        { y: 12, autoAlpha: 0, scale: 0.98, filter: 'blur(4px)' },
        { y: 0, autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 1, stagger: 0.26, ease: 'power2.out', clearProps: 'filter' },
        '<0.14'
      );

      ScrollTrigger.refresh();
    }, wrapRef);

    return () => ctx.revert();
  }, [isRevealed]);

  return (
    <section className="relative overflow-hidden pt-12 pb-12 lg:pt-20">
      <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center lg:items-start gap-12 lg:gap-12 mt-6 lg:mt-10">
        <div className="w-full lg:w-1/2 relative z-10">
          <p className="text-sm text-slate-500 uppercase mb-4">Our Work</p>
          <h1 ref={titleRef} className="font-extrabold text-4xl md:text-5xl lg:text-[54px] leading-[1.1] lg:leading-[0.95] text-[#0b2b57] max-w-2xl">
            <span className="reveal-line block overflow-hidden">
              <span style={{ opacity: 0, visibility: 'hidden' }}>We craft websites & platforms</span>
            </span>
            <span className="reveal-line block overflow-hidden">
              <span style={{ opacity: 0, visibility: 'hidden' }}>that scale - engineered to perform.</span>
            </span>
          </h1>
          <p className="mt-6 text-slate-600 max-w-xl text-base lg:text-lg">
            Product-first engineering for web, mobile, and cloud infrastructure. From UX to backend, we ship resilient, maintainable systems.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a className="hero-cta inline-flex items-center gap-3 bg-[#0b2b57] text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow transform-gpu will-change-transform" style={{ opacity: 0, visibility: 'hidden' }}>
              Start a project →
            </a>
            <a className="hero-cta inline-flex items-center gap-3 border border-slate-200 px-5 py-3 rounded-full text-slate-700 transform-gpu will-change-transform" style={{ opacity: 0, visibility: 'hidden' }}>
              View case studies
            </a>
          </div>
        </div>

        <div ref={wrapRef} className="w-full lg:w-1/2 relative flex justify-center lg:block">
          <div ref={floatRef} className="relative w-full max-w-[500px] lg:max-w-none aspect-[16/10] lg:w-[520px] lg:h-[260px] lg:ml-auto" style={{ visibility: 'visible' }}>
            <div className="absolute inset-0 lg:right-0 lg:left-auto lg:top-0 lg:bottom-0 lg:w-[420px] lg:h-[260px] rounded-2xl overflow-hidden shadow-2xl">
              <Image src="/portfolio/portfoliohero.png" alt="hero device" width={1200} height={800} className="object-cover object-top w-full h-full" />
            </div>
          </div>
          <div className="pointer-events-none absolute -inset-6 rounded-3xl blur-3xl opacity-30 bg-gradient-to-tr from-[#f7f5f3] to-[#fff]" />
        </div>
      </div>
    </section>
  );
}

function FeaturedList({ projects }: { projects: any[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { isRevealed } = useReveal();

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (!containerRef.current || !projects.length || !isRevealed) return;

    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const raf = requestAnimationFrame(() => {
      const ctx = gsap.context(() => {
        const sections = gsap.utils.toArray<HTMLElement>('.project-section');

        sections.forEach((section) => {
          const mask = section.querySelector('.image-mask') as HTMLElement | null;
          const image = section.querySelector('.project-image') as HTMLElement | null;
          const shadow = section.querySelector('.image-shadow') as HTMLElement | null;
          const text = section.querySelector('.project-text') as HTMLElement | null;
          const visit = section.querySelector('.visit-btn-component') as HTMLElement | null;

          if (!mask || !image || !text) return;

          if (prefersReduce) {
            gsap.set([mask, image, shadow, text, visit].filter(Boolean), { clearProps: 'all' });
          }

          const tl = gsap.timeline({
            defaults: { ease: 'power3.out' },
            scrollTrigger: {
              trigger: section,
              start: 'top 85%',
              toggleActions: 'play none none reset',
              onLeaveBack: () => {
                if (prefersReduce) return;
                gsap.set(mask, { y: 80, clipPath: 'inset(100% 0% 0% 0%)' });
                gsap.set(image, { y: 40, scale: 1.08 });
                gsap.set(shadow, { opacity: 0, boxShadow: '0 0 0 rgba(11,42,95,0)' });
                gsap.set(text, { y: 36, autoAlpha: 0 });
                if (visit) gsap.set(visit, { autoAlpha: 0, scale: 0.85 });
              },
            },
          });

          if (!prefersReduce) {
            tl.fromTo(mask, { clipPath: 'inset(100% 0% 0% 0%)', y: 80 }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 1.1 });
            tl.fromTo(image, { y: 40, scale: 1.08 }, { y: 0, scale: 1, duration: 1.15 }, '-=0.8');
            tl.fromTo(shadow, { opacity: 0, boxShadow: '0 0 0 rgba(11,42,95,0)' }, { opacity: 1, boxShadow: '0 30px 80px rgba(11,42,95,0.14)', duration: 0.6 }, '-=0.7');
            tl.fromTo(text, { y: 36, autoAlpha: 0, filter: 'blur(8px)' }, { y: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 0.9, clearProps: 'filter' }, '-=0.65');
          }

          if (visit && !prefersReduce) {
            gsap.set(visit, { autoAlpha: 0, scale: 0.85 });
            const showBtn = () => {
              visit.classList.add('show-shimmer');
              gsap.to(visit, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(1.8)' });
            };
            const hideBtn = () => {
              visit.classList.remove('show-shimmer');
              gsap.to(visit, { autoAlpha: 0, scale: 0.85, duration: 0.3, ease: 'power2.inOut' });
            };
            section.addEventListener('pointerenter', showBtn);
            section.addEventListener('pointerleave', hideBtn);
            (section as any).__btnCleanup = () => {
              section.removeEventListener('pointerenter', showBtn);
              section.removeEventListener('pointerleave', hideBtn);
            };
          }
        });
        ScrollTrigger.refresh();
      }, containerRef);
      return () => ctx.revert();
    });

    return () => {
      cancelAnimationFrame(raf);
      const sections = containerRef.current?.querySelectorAll('.project-section') || [];
      sections.forEach((section: any) => section.__btnCleanup && section.__btnCleanup());
      ScrollTrigger.getAll().forEach((t) => {
        const trg = (t as any).trigger as Element | undefined;
        if (trg && containerRef.current?.contains(trg)) t.kill(true);
      });
    };
  }, [projects, isRevealed]);

  return (
    <div ref={containerRef} className="space-y-16 lg:space-y-28">
      {projects.map((p, idx) => (
        <article key={p.id} className="project-section grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          <div className={`col-span-1 lg:col-span-7 ${idx % 2 === 1 ? 'lg:order-last' : ''}`}>
            <div className="relative will-change-transform">
              <div className="image-mask rounded-3xl overflow-hidden relative">
                <ResilientImage
                  src={p.hero}
                  alt={p.title}
                  width={1300}
                  height={760}
                  className="project-image object-cover w-full h-[280px] sm:h-[350px] lg:h-[420px]"
                  sizes="(min-width:1024px) 60vw, 100vw"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="pointer-events-auto">
                    <VisitButton href={p.href} label={`Visit ${p.title}`} />
                  </div>
                </div>
              </div>
              <div className="image-shadow absolute inset-0 rounded-3xl pointer-events-none" />
            </div>
          </div>

          <div className="col-span-1 lg:col-span-5">
            <div className="project-text max-w-xl mx-auto lg:mx-0" style={{ opacity: 0 }}>
              <p className="text-sm text-slate-500 uppercase">Featured project</p>
              <h2 className="mt-2 lg:mt-4 text-2xl lg:text-3xl font-semibold text-[#0b2b57]">{p.title}</h2>
              <p className="mt-3 lg:mt-4 text-slate-600 text-sm lg:text-base">{p.summary}</p>
              <div className="mt-4 lg:mt-6 flex flex-wrap gap-2">
                {p.tags.map((t: string) => (
                  <span key={t} className="text-xs px-3 py-1 rounded-full bg-slate-100 border border-slate-200/50">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function GalleryGrid({ items }: { items: any[] }) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (!rootRef.current || !items.length) return;

    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 768;

    const raf = requestAnimationFrame(() => {
      const ctx = gsap.context(() => {
        const cards = gsap.utils.toArray<HTMLElement>('.card-3d');
        
        if (!prefersReduce) {
          gsap.set(cards, { autoAlpha: 0, y: 32, scale: 0.98 });
          
          cards.forEach((c) => {
            const inner = c.querySelector('.card-inner');
            if (inner) gsap.set(inner, { rotateX: 8, rotateY: 0, y: 0, scale: 1, transformStyle: 'preserve-3d' });
            
            const img = c.querySelector('img');
            if (img) gsap.set(img, { scale: 1.1 });
            
            const floating = c.querySelector('.card-floating');
            if (floating) gsap.set(floating, { y: 12, autoAlpha: 0 });
            
            const visit = c.querySelector('.visit-btn-component');
            if (visit) gsap.set(visit, { autoAlpha: 0, scale: 0.78, transformOrigin: 'center' });
          });
        } else {
          gsap.set(cards, { autoAlpha: 1, clearProps: 'all' });
        }

        const batchTriggers = ScrollTrigger.batch(cards, {
          start: 'top bottom', // Triggers as soon as top of card hits bottom of viewport
          batchMax: isMobile ? 2 : 8,
          
          onEnter: (batch) => {
            if (prefersReduce) return;
            const tl = gsap.timeline();
            
            tl.to(batch, {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.8,
              ease: 'power3.out',
              stagger: { each: isMobile ? 0.1 : 0.15, from: 'start' } 
            }, 0);

            tl.to(batch.map((b: any) => b.querySelector('.card-inner')), {
              rotateX: 0,
              duration: 0.8,
              ease: 'power2.out',
              stagger: { each: isMobile ? 0.1 : 0.15, from: 'start' }
            }, 0);

            tl.to(batch.map((b: any) => b.querySelector('img')), {
              scale: 1,
              duration: 0.8,
              ease: 'power3.out',
              stagger: { each: isMobile ? 0.1 : 0.15, from: 'start' }
            }, 0);

            tl.to(batch.map((b: any) => b.querySelector('.card-floating')), {
              y: 0,
              autoAlpha: 1,
              duration: 0.5,
              ease: 'back.out(1.5)',
              stagger: { each: isMobile ? 0.1 : 0.15, from: 'start' }
            }, 0.2);
          },
          onLeaveBack: (batch) => {
            if (prefersReduce) return;
            if (!isMobile) {
               gsap.to(batch, { autoAlpha: 0, y: 32, duration: 0.5, ease: 'power2.in' });
            }
          },
        });

        cards.forEach((card: any) => {
          if (prefersReduce || isMobile) return;

          const el = card.querySelector('.card-inner') as HTMLElement | null;
          const img = card.querySelector('img') as HTMLImageElement | null;
          const shine = card.querySelector('.card-shine') as HTMLElement | null;
          const visit = card.querySelector('.visit-btn-component') as HTMLElement | null;

          if (!el || !img) return;

          let rafId: number | null = null;
          let lastRX = 0;
          let lastRY = 0;

          const onMove = (ev: PointerEvent) => {
            if (!card) return;
            const r = card.getBoundingClientRect();
            const px = (ev.clientX - r.left) / r.width;
            const py = (ev.clientY - r.top) / r.height;
            const ry = (px - 0.5) * -12;
            const rx = (py - 0.5) * 8;
            
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
              lastRX += (rx - lastRX) * 0.15;
              lastRY += (ry - lastRY) * 0.15;
              gsap.set(el, { transform: `perspective(1000px) rotateX(${lastRX}deg) rotateY(${lastRY}deg)`, transformStyle: 'preserve-3d' });
              if (shine) gsap.to(shine, { x: (px - 0.5) * 80, y: (py - 0.5) * -80, duration: 0.2 });
            });
          };

          const onEnter = () => {
             if (rafId) cancelAnimationFrame(rafId);
             gsap.to(card, { scale: 1.02, duration: 0.4, ease: 'power3.out' });
             gsap.to(img, { scale: 1.05, duration: 0.4, ease: 'power3.out' });
             if (visit) {
               visit.classList.add('show-shimmer');
               gsap.to(visit, { autoAlpha: 1, scale: 1, duration: 0.3 });
             }
          };

          const onLeave = () => {
            if (rafId) cancelAnimationFrame(rafId);
            lastRX = lastRY = 0;
            gsap.to(el, { transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)', duration: 0.6, ease: 'power3.out' });
            gsap.to(card, { scale: 1, duration: 0.6, ease: 'power3.out' });
            gsap.to(img, { scale: 1, duration: 0.6, ease: 'power3.out' });
            if (visit) {
               visit.classList.remove('show-shimmer');
               gsap.to(visit, { autoAlpha: 0, scale: 0.78, duration: 0.3 });
             }
          };

          card.addEventListener('pointermove', onMove as any, { passive: true } as any);
          card.addEventListener('pointerenter', onEnter);
          card.addEventListener('pointerleave', onLeave);
          
          (card as any).__remReveal = () => {
            card.removeEventListener('pointermove', onMove as any);
            card.removeEventListener('pointerenter', onEnter);
            card.removeEventListener('pointerleave', onLeave);
            if (rafId) cancelAnimationFrame(rafId);
          };
        });

        ScrollTrigger.refresh();

        return () => {
          (batchTriggers as any)?.forEach?.((t: any) => t.kill?.());
          const cardsNow = rootRef.current?.querySelectorAll('.card-3d') || [];
          cardsNow.forEach((c: any) => c.__remReveal && c.__remReveal());
        };
      }, rootRef);
      return () => ctx.revert();
    });
    return () => cancelAnimationFrame(raf);
  }, [items]);

  return (
    <div ref={rootRef}>
      <div className="mb-8">
        <h3 className="text-2xl font-semibold text-[#0b2b57]">More work</h3>
        <p className="text-slate-600 mt-2">Selected projects across web & infra.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 gap-y-12">
        {items.map((it) => (
          <article
            key={it.id}
            className="card-3d relative will-change-transform"
            tabIndex={0}
            aria-labelledby={`gallery-${it.id}-title`}
          >
            <div className="card-inner relative rounded-3xl overflow-visible" style={{ perspective: 1000 }}>
              <div className="relative z-10 rounded-2xl bg-white shadow-sm border border-slate-100" style={{ transformStyle: 'preserve-3d' }}>
                <div className="relative rounded-2xl overflow-hidden" style={{ transform: 'translateZ(0px)' }}>
                  <div className="relative w-full h-[260px] md:h-64 lg:h-56">
                    <ResilientImage src={typeof it.image === 'string' && it.image ? it.image : '/placeholders/g1.png'} alt={it.title} />
                  </div>
                  
                  <div className="hidden lg:flex absolute inset-0 items-center justify-center pointer-events-none">
                    <div className="pointer-events-auto">
                      <VisitButton href={it.href ?? '#'} label={`Visit ${it.title}`} />
                    </div>
                  </div>

                  <div
                    className="card-shine pointer-events-none absolute -left-24 -top-24 w-56 h-56 rounded-full opacity-0 lg:opacity-14 mix-blend-screen filter blur-3xl"
                    style={{
                      background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0.12) 40%, rgba(255,255,255,0) 60%)',
                      zIndex: 20,
                    }}
                  />
                </div>

                <div className="card-floating absolute left-4 right-4 -bottom-10 bg-white/95 backdrop-blur-md border border-white/60 rounded-xl p-4 shadow-lg z-30">
                  <div className="flex items-center">
                    <div>
                      <h4 id={`gallery-${it.id}-title`} className="text-sm font-bold text-slate-800 line-clamp-1">
                        {it.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">Case study • UI/UX</p>
                    </div>
                    <div className="ml-auto">
                         <a href={it.href ?? '#'} className="lg:hidden flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-[#0b2b57]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
                         </a>
                    </div>
                  </div>
                </div>
              </div>
              
              <a className="absolute inset-0 z-40 rounded-3xl focus:outline-none" href={it.href ?? '#'} aria-label={`Open ${it.title}`} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
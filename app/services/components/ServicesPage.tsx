// app/services/page.animated.tsx
'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import CTA from '../../components/CTA';
import { useReveal } from '../../context/RevealContext';


gsap.registerPlugin(ScrollTrigger);

type Service = {
    id: string;
    title: string;
    slug: string;
    short: string;
    features: string[];
    color?: string;
    icon?: React.ReactNode;
    iconSvg?: string; // optional inline svg from backend
    iconKey?: string; // mapped from backend
    iconPath?: string; // optional path to an asset
};

/* ---------- ICONS ---------- */
const CodeIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M8 10l-4 4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 10l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
const UXIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M7 8h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M7 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
);
const MobileIcon = () => (
    <svg width="24" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="7" y="2" width="10" height="20" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 19h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
);
const VideoIcon = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M3 5h13v14H3z" stroke="currentColor" strokeWidth="1.4" />
        <path d="M16 8l5 4-5 4V8z" fill="currentColor" />
    </svg>
);
const MarketingIcon = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 12h16M12 4v16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
);
const SEOIcon = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2 12h20M12 2v20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
);

const getIcon = (key?: string) => {
    switch (key) {
        case 'code': return <CodeIcon />;
        case 'ux': return <UXIcon />;
        case 'mobile': return <MobileIcon />;
        case 'video': return <VideoIcon />;
        case 'marketing': return <MarketingIcon />;
        case 'seo': return <SEOIcon />;
        default: return null;
    }
};

export default function ServicesPage() {
    const [query, setQuery] = useState('');
    const [activeTag, setActiveTag] = useState<string | null>(null);

    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';
        const aborter = new AbortController();
        setLoading(true);

        fetch(`${apiBase}/api/services/`, { signal: aborter.signal })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch services');
                return res.json();
            })
            .then((data) => {
                const resolveUrl = (p: string | null) => {
                    if (!p) return null;
                    if (p.startsWith('http://') || p.startsWith('https://')) return p;
                    if (p.startsWith('/')) {
                        if (p.startsWith('/media/')) return `${apiBase}${p}`;
                        return p;
                    }
                    try {
                        return new URL(p, apiBase).toString();
                    } catch {
                        return null;
                    }
                };

                const mapped: Service[] = (data || []).map((s: any) => ({
                    id: s.slug ?? s.id ?? s.title,
                    title: s.title,
                    slug: s.slug,
                    short: s.short_description ?? s.short ?? '',
                    features: (s.features || []).map((f: any) => (typeof f === 'string' ? f : f.name ?? '')),
                    color: s.color ?? '',
                    iconSvg: s.icon_svg ?? '',
                    iconKey: s.icon_key,
                    iconPath: resolveUrl(s.icon_path ?? '') ?? '',
                }));
                setServices(mapped);
                setError(null);
            })
            .catch((err) => {
                if (err.name === 'AbortError') return;
                console.error('Error fetching services:', err);
                setError('Unable to load services — using local data.');
            })
            .finally(() => setLoading(false));

        return () => aborter.abort();
    }, []);

    const heroRef = useRef<HTMLElement | null>(null);
    const cardsRef = useRef<HTMLDivElement | null>(null);

    const chips = useMemo(() => Array.from(new Set(services.flatMap((s) => s.features))).slice(0, 8), [services]);
    const filtered = useMemo(
        () =>
            services.filter((s) => {
                const q = query.trim().toLowerCase();
                if (activeTag && !s.features.includes(activeTag)) return false;
                if (!q) return true;
                return (
                    s.title.toLowerCase().includes(q) ||
                    s.short.toLowerCase().includes(q) ||
                    s.features.join(' ').toLowerCase().includes(q)
                );
            }),
        [query, activeTag, services]
    );

    // ... inside ServicesPage component
    const TILT_CONFIG = {
        maxRotate: 20,
        maxTranslate: 10,
        perspective: 900,
        easing: 'power3.out',
        hoverScale: 1.035,
    };

    const { isRevealed } = useReveal();

    useEffect(() => {
        if (!isRevealed) return; // wait

        const prefersReduce =
            typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const removers: (() => void)[] = [];

        const ctx = gsap.context(() => {
            // Ensure we are selecting within the component to avoid conflicts
            // Use heroRef as scope if possible, or fall back to document but be careful
            // Actually, scoping to the main container is best.

            // Explicitly reveal the Hero container immediately once isRevealed is true
            // This prevents the "Blank Page" issue if ScrollTrigger doesn't fire immediately
            if (heroRef.current) {
                gsap.to(heroRef.current, { autoAlpha: 1, duration: 1, ease: 'power2.out' });
            }

            // HERO: clip-path wipe for .ab-hero-title lines
            gsap.fromTo(
                '.ab-hero-title',
                { autoAlpha: 0, y: 36, clipPath: 'inset(60% 0% 60% 0%)', filter: 'blur(10px)' },
                {
                    autoAlpha: 1,
                    y: 0,
                    clipPath: 'inset(0% 0% 0% 0%)',
                    filter: 'blur(0px)',
                    duration: 1.6,
                    ease: 'power4.out',
                    stagger: 0.08,
                    clearProps: 'filter'
                }
            );

            // Generic reveal - scope to current component refs
            // Exclude the hero if we handled it above, or let it be harmless
            const reveals = gsap.utils.toArray<HTMLElement>('.reveal:not(.svc-hero)');

            reveals.forEach((el) => {
                ScrollTrigger.create({
                    trigger: el,
                    start: 'top 90%', // Trigger slightly earlier
                    onEnter: () => {
                        if (prefersReduce) {
                            gsap.set(el, { autoAlpha: 1, y: 0 });
                            return;
                        }
                        gsap.fromTo(el,
                            { autoAlpha: 0, y: 40, filter: 'blur(10px)' },
                            { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.1, ease: 'power3.out', clearProps: 'filter' }
                        );
                    },
                });
            });

            // CARD REVEALS + HOVER TILT
            const container = cardsRef.current;
            if (container) {
                const cardEls = Array.from(container.querySelectorAll<HTMLElement>('.service-card'));
                // Use fromTo instead of set to handle initial state if it wasn't set by CSS (though we will set it)
                // But better to enforce it here as well for cards

                ScrollTrigger.batch(cardEls, {
                    start: 'top 92%',
                    onEnter: (batch) => {
                        gsap.fromTo(batch,
                            { y: 60, autoAlpha: 0, scale: 0.95, filter: 'blur(8px)' },
                            {
                                y: 0,
                                autoAlpha: 1,
                                scale: 1,
                                filter: 'blur(0px)',
                                duration: 1.1,
                                ease: 'expo.out',
                                stagger: 0.08,
                                clearProps: 'filter'
                            });
                    },
                });

                if (!prefersReduce) {
                    cardEls.forEach((card) => {
                        const isFinePointer = window.matchMedia('(pointer: fine)').matches;
                        if (!isFinePointer) return;
                        // ... (rest of hover code unchanged)
                        const iconWrap = card.querySelector<HTMLElement>('.card-icon-wrap');
                        let raf: number | null = null;
                        const onEnter = () => {
                            gsap.set(card, {
                                transformPerspective: TILT_CONFIG.perspective,
                                transformStyle: 'preserve-3d',
                            });
                            gsap.to(card, {
                                y: -8,
                                scale: TILT_CONFIG.hoverScale,
                                boxShadow: `0 10px 30px rgba(11,42,95,0.12), 0 32px 72px rgba(11,42,95,0.20)`,
                                duration: 0.4,
                                ease: TILT_CONFIG.easing,
                            });
                        };
                        // ...
                        const onLeave = () => {
                            if (raf) cancelAnimationFrame(raf);
                            gsap.to(card, {
                                rotateX: 0,
                                rotateY: 0,
                                x: 0,
                                y: 0,
                                scale: 1,
                                boxShadow: `0 1px 2px rgba(11,42,95,0.04), 0 8px 24px rgba(11,42,95,0.08)`,
                                duration: 0.7,
                                ease: 'power4.out',
                            });
                            if (iconWrap) {
                                gsap.to(iconWrap, {
                                    x: 0,
                                    y: 0,
                                    scale: 1,
                                    duration: 0.6,
                                    ease: 'power3.out',
                                });
                            }
                        };
                        // ...
                        const onMove = (ev: PointerEvent) => {
                            if (prefersReduce) return;
                            if (raf) cancelAnimationFrame(raf);
                            raf = requestAnimationFrame(() => {
                                const rect = card.getBoundingClientRect();
                                const x = (ev.clientX - rect.left) / rect.width - 0.5;
                                const y = (ev.clientY - rect.top) / rect.height - 0.5;
                                const rotateY = x * TILT_CONFIG.maxRotate;
                                const rotateX = -y * TILT_CONFIG.maxRotate;
                                const translateX = x * TILT_CONFIG.maxTranslate;
                                const translateY = y * TILT_CONFIG.maxTranslate;
                                gsap.to(card, {
                                    rotateX,
                                    rotateY,
                                    x: translateX * 0.15,
                                    y: -8 + translateY * 0.12,
                                    scale: TILT_CONFIG.hoverScale,
                                    transformPerspective: TILT_CONFIG.perspective,
                                    duration: 0.35,
                                    ease: TILT_CONFIG.easing,
                                    overwrite: true,
                                });
                                if (iconWrap) {
                                    gsap.to(iconWrap, {
                                        x: -translateX * 0.25,
                                        y: -translateY * 0.25,
                                        duration: 0.4,
                                        ease: TILT_CONFIG.easing,
                                        overwrite: true,
                                    });
                                }
                            });
                        };
                        const onFocus = () => onEnter();
                        const onBlur = () => onLeave();
                        card.addEventListener('pointermove', onMove, { passive: true });
                        card.addEventListener('pointerenter', onEnter);
                        card.addEventListener('pointerleave', onLeave);
                        card.addEventListener('focus', onFocus);
                        card.addEventListener('blur', onBlur);
                        removers.push(() => {
                            card.removeEventListener('pointermove', onMove as EventListener);
                            card.removeEventListener('pointerenter', onEnter);
                            card.removeEventListener('pointerleave', onLeave);
                            card.removeEventListener('focus', onFocus);
                            card.removeEventListener('blur', onBlur);
                            if (raf) cancelAnimationFrame(raf);
                        });
                    });
                }
            }

            // CTA micro interactions
            const rootDoc = document;
            const ctas = Array.from(rootDoc.querySelectorAll<HTMLElement>('.btn-cta'));
            if (!prefersReduce && ctas.length) {
                ctas.forEach((btn) => {
                    const icon = btn.querySelector<HTMLElement>('.cta-icon');
                    const enter = () => gsap.to(btn, { scale: 1.03, y: -3, boxShadow: '0 18px 40px rgba(11,42,95,0.14)', duration: 0.28, ease: 'power3.out' });
                    const leave = () => gsap.to(btn, { scale: 1, y: 0, boxShadow: '0 10px 30px rgba(11,42,95,0.06)', duration: 0.45, ease: 'power3.out' });
                    const down = () => gsap.to(btn, { scale: 0.98, y: 0, duration: 0.12, ease: 'power3.out' });
                    const up = () => {
                        gsap.to(btn, { scale: 1.02, y: -2, duration: 0.18, ease: 'power3.out' });
                        if (icon) gsap.fromTo(icon, { x: 0 }, { x: 6, duration: 0.26, yoyo: true, repeat: 1, ease: 'sine.inOut' });
                    };

                    btn.addEventListener('pointerenter', enter);
                    btn.addEventListener('pointerleave', leave);
                    btn.addEventListener('pointerdown', down);
                    btn.addEventListener('pointerup', up);
                    btn.addEventListener('focus', enter);
                    btn.addEventListener('blur', leave);

                    removers.push(() => {
                        btn.removeEventListener('pointerenter', enter);
                        btn.removeEventListener('pointerleave', leave);
                        btn.removeEventListener('pointerdown', down);
                        btn.removeEventListener('pointerup', up);
                        btn.removeEventListener('focus', enter);
                        btn.removeEventListener('blur', leave);
                    });
                });
            }
        }, heroRef);

        return () => {
            removers.forEach((r) => {
                try { r(); } catch (e) { }
            });
            ctx.revert();
        };
    }, [filtered, isRevealed]);

    return (
        <main className="bg-[#fbf9f5] min-h-screen pb-24 px-6 md:px-12" style={{ ['--logo' as any]: '#1f6fe6', ['--muted' as any]: '#94a3b8' }}>
            <style jsx>{`
        :root {
          --primary: var(--logo);
          --muted: var(--muted);
          --card-shadow: 0 16px 40px rgba(11, 42, 95, 0.08);
        }
        .svc-hero {
          max-width: 1120px;
          margin: 0 auto;
          padding-top: 48px;
          padding-bottom: 32px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
        }
        @media (min-width: 1024px) {
          .svc-hero {
            grid-template-columns: 1fr 420px;
          }
        }

        .reveal-line {
          display: block;
          overflow: hidden;
        }
        .reveal-line > span {
          display: inline-block;
          transform: translateY(0);
        }
        
        /* Ensure initial hidden state for cards to avoid flash */
        .service-card {
           opacity: 0;
           visibility: hidden;
        }

        .service-card {
  position: relative;
  border-radius: 18px;
  padding: 22px;
  background: linear-gradient(180deg, #ffffff 0%, #fcfdff 100%);
  border: 1px solid rgba(15, 23, 42, 0.05);

  box-shadow:
    0 1px 2px rgba(11, 42, 95, 0.04),
    0 8px 24px rgba(11, 42, 95, 0.08);

  transition:
    transform 420ms cubic-bezier(.16,1,.3,1),
    box-shadow 420ms cubic-bezier(.16,1,.3,1),
    border-color 320ms ease;

  will-change: transform, box-shadow;
    transform-style: preserve-3d;
}

.service-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    120% 120% at 50% 0%,
    var(--accent-faded, rgba(31,111,230,0.15)),
    transparent 60%
  );
  opacity: 0;
  transition: opacity 420ms ease;
  pointer-events: none;
}

.service-card:hover::after,
.service-card:focus::after {
  opacity: 1;
}


        .card-top {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .card-icon-wrap {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(250, 250, 255, 0.6));
          box-shadow: 0 6px 20px rgba(11, 42, 95, 0.06);
          transition: transform 260ms ease, box-shadow 260ms ease;
          flex: 0 0 56px;
        }
        .card-title {
          font-size: 1.04rem;
          font-weight: 700;
          color: #0b2a5f;
          letter-spacing: -0.02em;
        }
        .card-desc {
          margin-top: 8px;
          color: #475569;
          font-size: 0.95rem;
        }

        .chip {
          font-size: 0.72rem;
          padding: 6px 8px;
          border-radius: 999px;
          background: #fbfbfe;
          color: #475569;
          border: 1px solid rgba(15, 23, 42, 0.04);
        }

        .card-footer {
          margin-top: 14px;
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: flex-start;
        }

        .btn-cta {
          padding: 8px 12px;
          border-radius: 999px;
          font-weight: 600;
          background: white;
          border: 1px solid rgba(11, 42, 95, 0.06);
          transition: transform 160ms ease, box-shadow 240ms ease;
        }

        .learn-link {
          color: var(--navy, #0b2a5f);
          font-weight: 650;
        }

        .service-card:focus {
          outline: none;
          box-shadow: 0 24px 60px rgba(11, 42, 95, 0.12);
          transform: translateY(-6px) scale(1.02);
        }

        @media (prefers-reduced-motion: reduce) {
          .service-card,
          .card-icon-wrap,
          .btn-cta {
            transition: none !important;
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

            {/* HERO */}
            <section ref={heroRef as any} className="ab-hero svc-hero max-w-6xl mx-auto reveal" style={{ opacity: 0, visibility: 'hidden' }}>
                <div className='mt-10'>
                    <p className="text-sm font-semibold tracking-wider text-slate-600 mb-3">OUR SERVICES</p>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#0b2a5f] leading-tight">
                        <span className="reveal-line">
                            <span className="ab-hero-title" style={{ opacity: 0, visibility: 'hidden' }}>Product-focused services</span>
                        </span>
                        <span className="reveal-line">
                            <span className="ab-hero-title" style={{ opacity: 0, visibility: 'hidden' }}>that ship results.</span>
                        </span>
                    </h1>

                    <p className="mt-4 text-slate-600 max-w-2xl">
                        We combine strategy, modern design, and engineering craft to deliver product experiences that scale. Pick a
                        service to learn more or enquire directly.
                    </p>

                    <div className="mt-6 flex items-center gap-4">
                        <Link href="/contact" className="btn-primary primary-cta inline-flex items-center gap-3 rounded-full px-5 py-3 font-semibold text-white shadow-lg focus:ring-4 focus:ring-[#1f6fe6]/20">
                            <span>Enquire now</span>
                            <svg className="w-4 h-4 cta-icon" viewBox="0 0 24 24" fill="none">
                                <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </Link>
                        <Link href="/portfolio" className="inline-flex items-center gap-2 px-4 py-3 rounded-full border border-slate-100 bg-white text-slate-700">
                            View portfolio
                        </Link>
                    </div>

                    <div className="mt-8 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="relative flex-1">
                            <input
                                aria-label="Search services"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search services or features (e.g. 'Figma', 'APIs')"
                                className="w-full rounded-full border border-slate-100 bg-white px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1f6fe6]/10 text-black"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {chips.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setActiveTag(activeTag === c ? null : c)}
                                    className={`text-xs px-3 py-2 rounded-full border ${activeTag === c ? 'bg-[#1f6fe6] text-white border-transparent' : 'bg-white text-slate-700 border-slate-100'} transition`}
                                >
                                    {c}
                                </button>
                            ))}
                            {activeTag && (
                                <button onClick={() => setActiveTag(null)} className="text-xs px-3 py-2 rounded-full border bg-white text-slate-500 border-slate-100">
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="hidden md:flex items-center justify-end">
                    <div className="rounded-2xl p-6 bg-white border border-slate-100 shadow-lg" style={{ boxShadow: 'var(--card-shadow)' }}>
                        <h5 className="text-sm font-semibold text-slate-700">Why choose us</h5>
                        <p className="mt-3 text-sm text-slate-600">
                            Cross-disciplinary expertise, rapid iteration cycles, and engineering-led execution
                            designed to deliver scalable solutions with uncompromising reliability.
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-[#fbfbfe] text-center">
                                <div className="text-lg font-extrabold text-[#0b2a5f]">2</div>
                                <div className="text-xs text-slate-500 mt-1">Years</div>
                            </div>
                            <div className="p-3 rounded-lg bg-[#fbfbfe] text-center">
                                <div className="text-lg font-extrabold text-[#0b2a5f]">20</div>
                                <div className="text-xs text-slate-500 mt-1">Projects</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SERVICES GRID */}
            <section className="max-w-6xl mx-auto mt-8">
                {loading && <div className="text-sm text-slate-500 mb-4">Loading services…</div>}
                {error && <div className="text-sm text-amber-600 mb-4">{error}</div>}
                <div ref={cardsRef as any} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((svc) => (
                        <article
                            key={svc.id}
                            className="service-card svc-reveal"
                            tabIndex={0}
                            role="article"
                            aria-labelledby={`${svc.id}-title`}
                            style={{
                                ['--accent' as any]: svc.color || '#1f6fe6',
                                ['--accent-faded' as any]: (svc.color || '#1f6fe6') + '33',
                                boxShadow: '0 16px 40px rgba(11,42,95,0.08)',
                            }}
                        >
                            <div className="card-top">
                                <div className="card-icon-wrap" aria-hidden>
                                    <div style={{ color: svc.color || 'currentColor' }}>
                                        {svc.iconSvg ? (
                                            <span dangerouslySetInnerHTML={{ __html: svc.iconSvg }} />
                                        ) : svc.iconKey ? (
                                            getIcon(svc.iconKey)
                                        ) : svc.iconPath ? (
                                            <img src={svc.iconPath} alt="" width={28} height={28} />
                                        ) : (
                                            svc.icon
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3 id={`${svc.id}-title`} className="card-title">
                                        {svc.title}
                                    </h3>
                                    <p className="card-desc">{svc.short}</p>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {svc.features.map((f) => (
                                    <span key={f} className="chip">
                                        {f}
                                    </span>
                                ))}
                            </div>

                            <div className="card-footer">
                                <Link href={svc.slug} className="learn-link inline-flex items-center gap-2 px-4 py-3 rounded-full border border-slate-100 bg-white text-slate-700" aria-label={`Learn more about ${svc.title}`}>
                                    Learn more →
                                </Link>
                                <Link href="/contact" className="btn-primary primary-cta inline-flex items-center gap-3 rounded-full gap-2 text-sm px-3 py-2 rounded-full border border-slate-100 hover:bg-slate-50">
                                    Enquire
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>

                {filtered.length === 0 && <div className="mt-10 text-center text-slate-600">No services match your search. Try a different keyword or clear filters.</div>}
            </section>

            {/* FOOT CTA */}
            <section className="reveal max-w-6xl mx-auto px-6 md:px-12 mt-12">
                <CTA
                    title="Ready to engineer your strategic vision?"
                    subtitle="Let's discuss your product roadmap, enterprise engineering, and full-cycle delivery."
                    primaryLabel="Schedule a Consultation"
                    primaryHref="/contact"
                    secondaryLabel="View Our Portfolio"
                    secondaryHref="/portfolio"
                    particleColor="#ffffff"
                    particleEnabled={true}
                    className="card-premium"
                />
            </section>

        </main>
    );
}

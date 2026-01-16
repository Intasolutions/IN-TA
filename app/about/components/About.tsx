// app/about/page.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReveal } from '../../context/RevealContext';


gsap.registerPlugin(ScrollTrigger);

const TEAM = [
    { 
      id: 'm1', 
      name: 'Akash A', 
      role: 'Project Manager', 
      avatar: '/avatars/p1 - Copy.png',
      desc: 'Expert in agile delivery and stakeholder management, ensuring projects align with strategic business goals.' 
    },
    { 
      id: 'm2', 
      name: 'Vijay P N', 
      role: 'Software Engineer', 
      avatar: '/avatars/vijay.jpg',
      desc: 'Specializing in full-stack development and high-performance applications with a focus on clean, scalable code.' 
    },
    { 
      id: 'm3', 
      name: 'Christin Johny', 
      role: 'System Architect', 
      avatar: '/avatars/christin-1.png',
      desc: 'Architecting robust, event-driven infrastructures and cloud-native systems for maximum reliability and scale.' 
    },
    { 
      id: 'm4', 
      name: 'Arun Rag', 
      role: 'Head of Marketing & Sales', 
      avatar: '/avatars/unni.png',
      desc: 'Driving market expansion and strategic partnerships through data-led digital growth and brand positioning.' 
    },
];

const STATS = [
    { id: 's1', label: 'Projects', value: `20+` },
    { id: 's2', label: 'Clients', value: 20 },
    { id: 's3', label: 'Years', value: `2+` },
    { id: 's4', label: 'Countries', value: 3 },
];

type Particle = { x: number; y: number; vx: number; vy: number; r: number; alpha: number; tw: number };

function hexToRgb(hex: string) {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r},${g},${b}`;
}

function ParticleCanvas({ enabled, color = '#1f6fe6' }: { enabled: boolean; color?: string }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const ratio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const roRef = useRef<ResizeObserver | null>(null);
    const colorRgb = hexToRgb(color || '#1f6fe6');

    useEffect(() => {
        if (!enabled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let w = 0;
        let h = 0;
        let paused = false;

        const resize = () => {
            const parent = canvas.parentElement;
            if (!parent) return;
            const rect = parent.getBoundingClientRect();
            w = Math.max(1, Math.floor(rect.width));
            h = Math.max(1, Math.floor(rect.height));
            const cw = Math.max(1, Math.round(w * ratio));
            const ch = Math.max(1, Math.round(h * ratio));
            if (canvas.width !== cw || canvas.height !== ch) {
                canvas.width = cw;
                canvas.height = ch;
                ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            }
        };

        const createParticles = () => {
            const area = w * h;
            const base = Math.round(Math.max(6, Math.min(48, (area / (400 * 300)) * 18)));
            const particles: Particle[] = [];
            for (let i = 0; i < base; i++) {
                particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.18,
                    vy: (Math.random() - 0.5) * 0.18,
                    r: Math.random() * 2.2 + 0.4,
                    alpha: Math.random() * 0.55 + 0.04,
                    tw: Math.random() * 360,
                });
            }
            particlesRef.current = particles;
        };

        const draw = (t: number) => {
            if (!ctx) return;
            ctx.clearRect(0, 0, w, h);

            const particles = particlesRef.current;
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.tw += 0.6 + Math.random() * 0.8;
                const pulse = 0.5 + Math.sin(p.tw * 0.018) * 0.5;
                const drawR = p.r * (0.85 + pulse * 0.45);
                const a = Math.max(0, Math.min(1, p.alpha * (0.6 + pulse * 0.9)));

                // soft radial glow using the provided color
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, drawR * 6);
                grad.addColorStop(0, `rgba(${colorRgb},${a})`);
                grad.addColorStop(0.35, `rgba(${colorRgb},${a * 0.24})`);
                grad.addColorStop(1, `rgba(${colorRgb},0)`);
                ctx.fillStyle = grad;
                ctx.fillRect(p.x - drawR * 6, p.y - drawR * 6, drawR * 12, drawR * 12);

                // tiny core - stronger opacity
                ctx.beginPath();
                ctx.fillStyle = `rgba(${colorRgb},${Math.min(1, a)})`;
                ctx.arc(p.x, p.y, drawR * 0.55, 0, Math.PI * 2);
                ctx.fill();

                // movement with slight oscillation
                p.x += p.vx + Math.cos(t * 0.00034 + i) * 0.028;
                p.y += p.vy + Math.sin(t * 0.00041 + i) * 0.028;

                // wrap
                if (p.x < -12) p.x = w + 12;
                if (p.y < -12) p.y = h + 12;
                if (p.x > w + 12) p.x = -12;
                if (p.y > h + 12) p.y = -12;

                // occasional sparkle
                if (Math.random() < 0.0035) p.alpha = Math.min(1, p.alpha + 0.7);
            }
        };

        const loop = (t: number) => {
            if (paused) return;
            draw(t);
            rafRef.current = requestAnimationFrame(loop);
        };

        const handleVisibility = () => {
            paused = document.hidden || !document.hasFocus();
            if (!paused) {
                if (!rafRef.current) rafRef.current = requestAnimationFrame(loop);
            } else {
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };

        resize();
        createParticles();
        rafRef.current = requestAnimationFrame(loop);

        try {
            const parent = canvas.parentElement;
            if (parent) {
                roRef.current = new ResizeObserver(() => {
                    resize();
                    createParticles();
                });
                roRef.current.observe(parent);
            }
        } catch {
            window.addEventListener('resize', () => {
                resize();
                createParticles();
            });
        }

        document.addEventListener('visibilitychange', handleVisibility);

        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                paused = !en.isIntersecting;
                if (!paused && !rafRef.current) rafRef.current = requestAnimationFrame(loop);
                if (paused && rafRef.current) {
                    cancelAnimationFrame(rafRef.current);
                    rafRef.current = null;
                }
            });
        }, { threshold: 0.05 });

        io.observe(canvas);

        return () => {
            paused = true;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
            try { if (roRef.current) roRef.current.disconnect(); } catch { }
            window.removeEventListener('resize', resize);
            document.removeEventListener('visibilitychange', handleVisibility);
            io.disconnect();
        };
    }, [enabled, ratio, colorRgb]);

    return (
        <canvas
            ref={canvasRef}
            className="card-particles absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden
            style={{ opacity: enabled ? 1 : 0, transition: 'opacity .6s ease' }}
        />
    );
}

export default function AboutPage() {
    const wrapRef = useRef<HTMLElement | null>(null);
    const heroBlobRef = useRef<HTMLDivElement | null>(null);
    const heroCardRef = useRef<HTMLDivElement | null>(null);
    const statRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const teamCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const { isRevealed } = useReveal();
    const [prefersReduce, setPrefersReduce] = useState(true);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!isRevealed) return; // Wait for mask reveal

        let media: MediaQueryList | null = null;
        const onMediaChange = (e: MediaQueryListEvent) => setPrefersReduce(!!e.matches);
        try {
            media = window.matchMedia('(prefers-reduced-motion: reduce)');
            setPrefersReduce(!!media.matches);
            if (media.addEventListener) media.addEventListener('change', onMediaChange);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            else if ((media as any).addListener) (media as any).addListener(onMediaChange);
        } catch {
            media = null;
        }

        const ctaRemovers: Array<() => void> = [];
        const magRemovers: Array<() => void> = [];
        const cardRemovers: Array<() => void> = [];

        const ctx = gsap.context(() => {
            // Exclude hero elements (and the hero section itself) from generic scroll triggers
            // Using JS filter for reliability over complex CSS selectors
            const reveals = gsap.utils.toArray<HTMLElement>('.reveal').filter(el => !el.closest('.ab-hero'));

            // NOTE: Elements already hidden via inline style (opacity:0, visibility:hidden)
            // No need for initial set() of autoAlpha: 0.

            reveals.forEach((el) => {
                ScrollTrigger.create({
                    trigger: el,
                    start: 'top 90%',
                    onEnter: () => {
                        // Only animate if revealed
                        if (!isRevealed && !prefersReduce) {
                            // If mask not done, ensure it stays hidden
                            return;
                        }

                        if (prefersReduce) { gsap.set(el, { autoAlpha: 1, y: 0 }); return; }

                        gsap.fromTo(el,
                            { autoAlpha: 0, y: 40, filter: 'blur(12px)' },
                            { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.25, ease: 'power4.out', clearProps: 'filter' }
                        );
                    },
                });
            });

            if (isRevealed) {
                // Explicit Hero Sequence
                const tl = gsap.timeline();

                // Hero Text & Elements
                tl.fromTo(
                    '.hero-reveal-text',
                    { autoAlpha: 0, y: 40, clipPath: 'inset(60% 0% 60% 0%)', filter: 'blur(12px)' },
                    { autoAlpha: 1, y: 0, clipPath: 'inset(0% 0% 0% 0%)', filter: 'blur(0px)', duration: 1.6, ease: 'power4.out', stagger: 0.15, clearProps: 'filter' }
                    , 0);

                // Other hero elements that were excluded from generic reveals
                const heroReveals = gsap.utils.toArray<HTMLElement>('.ab-hero .reveal');
                if (heroReveals.length) {
                    tl.fromTo(heroReveals,
                        { autoAlpha: 0, y: 30, filter: 'blur(10px)' },
                        { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', stagger: 0.1, clearProps: 'filter' }
                        , 0.2); // slight delay after text starts
                }
            }
            ScrollTrigger.refresh(true);
            // 🛟 SAFETY: force-show hero elements if already in viewport (reload fix)
            const heroEls = gsap.utils.toArray<HTMLElement>('.ab-hero .reveal');

            heroEls.forEach((el) => {
                const rect = el.getBoundingClientRect();
                if (rect.top < window.innerHeight) {
                    gsap.set(el, { autoAlpha: 1, y: 0, clearProps: 'filter' });
                }
            });


            STATS.forEach((s) => {
                const el = statRefs.current[s.id];
                if (!el) return;
                const label = el.querySelector<HTMLElement>('.stat-value');
                if (!label) return;
                const obj = { v: 0 };
                ScrollTrigger.create({
                    trigger: el,
                    start: 'top 92%',
                    onEnter: () => {
                        if (prefersReduce) { label.textContent = String(s.value); return; }
                        gsap.fromTo(obj, { v: 0 }, { v: s.value, duration: 1.2, ease: 'power2.out', onUpdate: () => { label.textContent = String(Math.floor(obj.v)); } });
                    },
                });
            });

            const teamEls = Object.values(teamCardRefs.current).filter(Boolean) as HTMLElement[];
            gsap.set(teamEls, { autoAlpha: 0, y: 22, transformOrigin: 'center center' });

            ScrollTrigger.batch(teamEls, {
                start: 'top 88%',
                onEnter: (batch) => {
                    gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.38 });
                    if (!prefersReduce) {
                        batch.forEach((card) => {
                            const img = card.querySelector<HTMLImageElement>('img, picture, .team-avatar');
                            const tl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });
                            const dy = gsap.utils.random(-6, -2);
                            const rot = gsap.utils.random(-1.2, 1.2);
                            tl.to(card, { y: dy, rotation: rot, duration: gsap.utils.random(3.2, 4.2) }, 0);
                            if (img) tl.to(img, { y: -dy * 0.32, rotation: -rot * 0.4, duration: gsap.utils.random(2.8, 3.8) }, 0);
                        });
                    }
                },
            });

            if (!prefersReduce && teamEls.length) {
                teamEls.forEach((card) => {
                    let raf: number | null = null;
                    const avatar = card.querySelector<HTMLImageElement>('.team-avatar');

                    // Soft hover / focus enter - elevation + avatar pop
                    const onEnter = () => {
                        gsap.killTweensOf(card);
                        gsap.to(card, { y: -6, scale: 1.02, boxShadow: '0 28px 60px rgba(11,42,95,0.14)', duration: 0.32, ease: 'power3.out' });
                        if (avatar) gsap.to(avatar, { scale: 1.07, y: -4, duration: 0.36, ease: 'power3.out' });
                        gsap.set(card, { transformPerspective: 900 });
                    };

                    const onLeave = () => {
                        if (raf) cancelAnimationFrame(raf);
                        gsap.to(card, { rotateX: 0, rotateY: 0, x: 0, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' });
                        if (avatar) gsap.to(avatar, { scale: 1, y: 0, duration: 0.6, ease: 'power3.out' });
                        gsap.to(card, { boxShadow: '0 18px 40px rgba(11,42,95,0.12)', duration: 0.5, ease: 'power3.out' });
                    };

                    // Pointer move tilt + avatar parallax
                    const onMove = (ev: PointerEvent) => {
                        if (raf) cancelAnimationFrame(raf);
                        raf = requestAnimationFrame(() => {
                            const r = card.getBoundingClientRect();
                            const px = (ev.clientX - r.left) / r.width;
                            const py = (ev.clientY - r.top) / r.height;
                            const rx = (py - 0.5) * 8;    // rotateX
                            const ry = (px - 0.5) * -10;  // rotateY
                            const tx = (px - 0.5) * 6;    // small x shift
                            const ty = (py - 0.5) * 6;    // small y shift

                            // card tilt
                            gsap.to(card, { rotateX: rx, rotateY: ry, x: tx * 0.25, y: -6 + ty * 0.15, scale: 1.02, duration: 0.28, ease: 'power3.out', overwrite: true });

                            // avatar moves inverse a bit for parallax
                            if (avatar) {
                                const ax = -tx * 0.18;
                                const ay = -ty * 0.12 - 3;
                                gsap.to(avatar, { x: ax, y: ay, rotation: ry * 0.12, duration: 0.36, ease: 'power3.out', overwrite: true });
                            }
                        });
                    };

                    // Keyboard focus handlers (mirror hover)
                    const onFocus = () => onEnter();
                    const onBlur = () => onLeave();

                    card.addEventListener('pointermove', onMove, { passive: true });
                    card.addEventListener('pointerenter', onEnter);
                    card.addEventListener('pointerleave', onLeave);
                    card.addEventListener('focus', onFocus);
                    card.addEventListener('blur', onBlur);

                    cardRemovers.push(() => {
                        card.removeEventListener('pointermove', onMove as EventListener);
                        card.removeEventListener('pointerenter', onEnter);
                        card.removeEventListener('pointerleave', onLeave);
                        card.removeEventListener('focus', onFocus);
                        card.removeEventListener('blur', onBlur);
                        if (raf) cancelAnimationFrame(raf);
                    });
                });
            }

            if (!prefersReduce && heroCardRef.current) {
                const card = heroCardRef.current;
                let raf: number | null = null;
                const strength = 10;
                const onMove = (ev: PointerEvent) => {
                    if (raf) cancelAnimationFrame(raf);
                    raf = requestAnimationFrame(() => {
                        const r = card.getBoundingClientRect();
                        const px = (ev.clientX - r.left) / r.width;
                        const py = (ev.clientY - r.top) / r.height;
                        const rx = (py - 0.5) * 6;
                        const ry = (px - 0.5) * -8;
                        const tx = (px - 0.5) * strength;
                        const ty = (py - 0.5) * strength * 0.6;
                        gsap.to(card, { rotateX: rx, rotateY: ry, x: tx, y: ty - 6, scale: 1.01, duration: 0.35, ease: 'power3.out', overwrite: true });
                        if (heroBlobRef.current) {
                            gsap.to(heroBlobRef.current, { x: -tx * 0.18, y: -ty * 0.18, rotation: ry * 0.25, duration: 0.45, ease: 'sine.out', overwrite: true });
                        }
                    });
                };
                const onEnter = () => gsap.set(card, { transformPerspective: 900 });
                const onLeave = () => {
                    if (raf) cancelAnimationFrame(raf);
                    gsap.to(card, { rotateX: 0, rotateY: 0, x: 0, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' });
                    if (heroBlobRef.current) gsap.to(heroBlobRef.current, { x: 0, y: 0, rotation: 0, duration: 0.6, ease: 'sine.out' });
                };

                card.addEventListener('pointermove', onMove, { passive: true });
                card.addEventListener('pointerenter', onEnter);
                card.addEventListener('pointerleave', onLeave);

                cardRemovers.push(() => {
                    card.removeEventListener('pointermove', onMove as EventListener);
                    card.removeEventListener('pointerenter', onEnter);
                    card.removeEventListener('pointerleave', onLeave);
                });
            }

            const ctas = gsap.utils.toArray<HTMLElement>('.btn-cta');
            if (!prefersReduce && ctas.length) {
                ctas.forEach((btn) => {
                    const icon = btn.querySelector<HTMLElement>('.cta-icon');

                    const enter = () => gsap.to(btn, { scale: 1.03, y: -3, boxShadow: '0 18px 40px rgba(11,42,95,0.14)', duration: 0.35, ease: 'power3.out' });
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

                    ctaRemovers.push(() => {
                        btn.removeEventListener('pointerenter', enter);
                        btn.removeEventListener('pointerleave', leave);
                        btn.removeEventListener('pointerdown', down);
                        btn.removeEventListener('pointerup', up);
                        btn.removeEventListener('focus', enter);
                        btn.removeEventListener('blur', leave);
                    });
                });
            }

            const magEls = Array.from(document.querySelectorAll<HTMLElement>('.primary-cta'));
            if (!prefersReduce && magEls.length) {
                magEls.forEach((el) => {
                    let raf: number | null = null;
                    const strength = 18;
                    const scaleOnHover = 1.02;

                    const onMove = (ev: PointerEvent) => {
                        if (raf) cancelAnimationFrame(raf);
                        raf = requestAnimationFrame(() => {
                            const r = el.getBoundingClientRect();
                            const cx = r.left + r.width / 2;
                            const cy = r.top + r.height / 2;
                            const dx = ev.clientX - cx;
                            const dy = ev.clientY - cy;
                            const nx = Math.max(-1, Math.min(1, dx / (r.width * 0.5)));
                            const ny = Math.max(-1, Math.min(1, dy / (r.height * 0.5)));
                            const tx = nx * strength;
                            const ty = ny * (strength * 0.6);
                            gsap.to(el, { x: tx, y: ty, scale: scaleOnHover, duration: 0.28, ease: 'power3.out', overwrite: true });
                            const icon = el.querySelector<HTMLElement>('.cta-icon');
                            if (icon) gsap.to(icon, { x: tx * 0.18, y: ty * 0.12, duration: 0.28, ease: 'power3.out', overwrite: true });
                        });
                    };

                    const onEnter = () => { gsap.to(el, { scale: scaleOnHover, y: -2, boxShadow: '0 20px 44px rgba(11,42,95,0.12)', duration: 0.26, ease: 'power3.out' }); el.addEventListener('pointermove', onMove, { passive: true }); };
                    const onLeave = () => { if (raf) cancelAnimationFrame(raf); el.removeEventListener('pointermove', onMove as EventListener); gsap.to(el, { x: 0, y: 0, scale: 1, boxShadow: '0 10px 30px rgba(11,42,95,0.06)', duration: 0.45, ease: 'power3.out' }); const icon = el.querySelector<HTMLElement>('.cta-icon'); if (icon) gsap.to(icon, { x: 0, y: 0, duration: 0.3, ease: 'power3.out' }); };

                    el.addEventListener('pointerenter', onEnter);
                    el.addEventListener('pointerleave', onLeave);
                    el.addEventListener('blur', onLeave);

                    magRemovers.push(() => {
                        el.removeEventListener('pointerenter', onEnter);
                        el.removeEventListener('pointerleave', onLeave);
                        el.removeEventListener('blur', onLeave);
                        el.removeEventListener('pointermove', onMove as EventListener);
                    });
                });
            }

        }, wrapRef);

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (ctx as any)._ctaRemovers = ctaRemovers;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (ctx as any)._magRemovers = magRemovers;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (ctx as any)._cardRemovers = cardRemovers;
        } catch { }

        return () => {
            try { ctx.revert(); } catch { }
            try { ScrollTrigger.getAll().forEach((t) => t.kill()); } catch { }

            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rem1 = (ctx as any)._ctaRemovers as Array<() => void> | undefined;
                if (rem1) rem1.forEach((fn) => fn());
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rem2 = (ctx as any)._magRemovers as Array<() => void> | undefined;
                if (rem2) rem2.forEach((fn) => fn());
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rem3 = (ctx as any)._cardRemovers as Array<() => void> | undefined;
                if (rem3) rem3.forEach((fn) => fn());
            } catch { }

            try {
                if (media) {
                    if (media.removeEventListener) media.removeEventListener('change', onMediaChange);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    else if ((media as any).removeListener) (media as any).removeListener(onMediaChange);
                }
            } catch { }
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRevealed]);

    const particleEnabled = !prefersReduce;
    const themeBlue = '#1f6fe6';

    return (
        <main ref={wrapRef} className="relative bg-[#fbf9f5] min-h-screen pb-20">
            {/* Background blobs (unchanged) */}
            <div aria-hidden className="absolute inset-0 -z-20 overflow-hidden">
                <div className="ab-bg-blob absolute left-[-12%] top-[-18%] w-[64%] h-[110%] pointer-events-none">
                    <div style={{ mixBlendMode: 'screen' }} className="w-full h-full rounded-full bg-gradient-to-br from-[#1f6fe6]/10 to-[#0b2a5f]/04 blur-[96px]" />
                </div>
                <div className="ab-bg-blob absolute right-[-8%] bottom-[-8%] w-[48%] h-[86%] pointer-events-none">
                    <div style={{ mixBlendMode: 'screen' }} className="w-full h-full rounded-full bg-gradient-to-tl from-[#0b2a5f]/06 to-[#1f6fe6]/04 blur-[72px]" />
                </div>
            </div>

            {/* HERO SECTION */}
            <section className="ab-hero reveal max-w-6xl mx-auto px-6 md:px-12 pt-20 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-7">
                    <p className="text-sm font-semibold tracking-wider text-slate-600 mb-3 reveal" style={{ opacity: 0, visibility: 'hidden' }}>ABOUT US</p>
                    <h1 className="ab-hero-title leading-tight text-[#0b2a5f]">
                        {/* Line 1: The Vision */}
                        <span className="block overflow-hidden mb-2">
                            <span className="hero-reveal-text block text-2xl md:text-3xl font-bold opacity-70"
                                style={{ opacity: 0, visibility: 'hidden' }}>
                                Design with purpose.
                            </span>
                        </span>

                        {/* Line 2: The Core (Largest) */}
                        <span className="block overflow-hidden mb-2">
                            <span className="hero-reveal-text block text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter"
                                style={{ opacity: 0, visibility: 'hidden' }}>
                                Built for performance.
                            </span>
                        </span>

                        {/* Line 3: The Result */}
                        <span className="block overflow-hidden">
                            <span className="hero-reveal-text block text-xl md:text-2xl font-medium text-slate-500 uppercase tracking-widest"
                                style={{ opacity: 0, visibility: 'hidden' }}>
                                Engineering Resilient Systems
                            </span>
                        </span>
                    </h1>
                    <p className="mt-8 text-base md:text-lg text-slate-600 max-w-2xl leading-relaxed reveal" style={{ opacity: 0, visibility: 'hidden' }}>
                        We are a specialized software engineering firm dedicated to high-performance architecture,
                        user-centric design, and strategic growth. From initial product roadmap to global deployment
                        and scaling - we provide end-to-end partnership for growth-stage startups and established enterprises.
                    </p>

                    <div className="mt-8 flex gap-4 reveal" style={{ opacity: 0, visibility: 'hidden' }}>
                        <Link href="/contact" className="btn-cta primary-cta inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6] text-white px-5 py-3 font-semibold shadow-lg transition-transform will-change-transform focus:outline-none focus:ring-4 focus:ring-[#1f6fe6]/20">
                            <span>Start a project</span>
                            <svg className="cta-icon ml-2 w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </Link>

                        <Link href="/portfolio" className="btn-cta btn-outline inline-flex items-center gap-2 text-slate-700 px-4 py-3 rounded-full border border-slate-100 transition-transform will-change-transform focus:outline-none focus:ring-4 focus:ring-[#1f6fe6]/12">
                            View portfolio
                        </Link>
                    </div>
                </div>

                <div className="lg:col-span-5 flex justify-center lg:justify-end items-center">
                    <div ref={heroCardRef} className="hero-card relative w-full max-w-md rounded-3xl overflow-hidden bg-white border border-slate-100 shadow-2xl transform-gpu will-change-transform reveal" style={{ opacity: 0, visibility: 'hidden' }}>
                        <div ref={heroBlobRef} className="hero-blob absolute -left-12 -top-10 w-44 h-36 rounded-full bg-gradient-to-br from-[#e6f0ff] to-transparent opacity-60 mix-blend-screen blur-2xl pointer-events-none" />
                        <div className="relative h-56">
                            <Image src="/about/inta-lobby.png" alt="office" fill className="object-cover" sizes="(min-width:1024px) 35vw, 100vw" />
                        </div>
                        <div className="p-5">
                            <div className="text-sm text-slate-500">Our studio</div>
                            <h3 className="mt-2 text-lg font-semibold text-slate-900">Engineering excellence & refined UX</h3>
                            <p className="mt-2 text-sm text-slate-600">Design systems, high-perf frontends and resilient backend architecture for scale.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* STORY + STATS */}
            <section className="reveal max-w-6xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start mt-8">
                <div className="lg:col-span-7">
                    <h4 className="text-2xl font-extrabold text-[#0b2a5f]">Our story</h4>
                    <p className="mt-4 text-slate-600 max-w-2xl">
                        Founded by engineers and product designers, we grew by solving hard product problems: fast iteration, strong engineering hygiene,
                        and creative storytelling. Our approach blends measurement, deep technical craft, and elegant interface design.
                    </p>

                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {[
                            { title: 'Strategy & Discovery', desc: 'Aligning business goals with a research-backed product roadmap.' },
                            { title: 'Engineering & Build', desc: 'Deploying high-performance systems with enterprise-grade code.' },
                            { title: 'Strategic Growth', desc: 'Scaling your digital presence through data-driven optimization.' },
                            { title: 'Enterprise Support', desc: 'Ensuring long-term reliability with 24/7 technical excellence.' }
                        ].map((item) => (
                            <div key={item.title} className="rounded-2xl p-5 bg-white border border-slate-100 shadow-md reveal card-premium relative overflow-hidden">
                                <ParticleCanvas enabled={particleEnabled} color={themeBlue} />
                                <div className="relative z-10">
                                    <div className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                                        {item.title}
                                    </div>
                                    <p className="mt-1 text-sm text-slate-600 leading-snug">
                                        {item.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <aside className="lg:col-span-5">
                    <div className="rounded-2xl p-6 bg-white border border-slate-100 shadow-lg reveal relative overflow-hidden">
                        {/* removed particle from Studio highlights as requested */}
                        <h5 className="text-sm font-semibold text-slate-700">Studio highlights</h5>
                        <p className="mt-3 text-slate-600">We ship polished products that scale - with observability, automated testing, and cross-platform workflows.</p>
                        <div className="mt-6 grid grid-cols-2 gap-4">
                            {STATS.map((s) => (
                                <div key={s.id} ref={(el) => { statRefs.current[s.id] = el; }} className="p-4 bg-[#fbfbfe] rounded-xl reveal relative overflow-hidden">
                                    <div className="text-2xl font-extrabold text-[#0b2a5f] stat-value">0</div>
                                    <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </section>

            {/* TEAM */}
            <section className="reveal max-w-6xl mx-auto px-6 md:px-12 mt-12">
                <h3 className="text-3xl font-extrabold text-[#0b2a5f] ">The team</h3>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-10">
                    {TEAM.map((m) => (
                        <div
                            key={m.id}
                            ref={(el) => { teamCardRefs.current[m.id] = el; }}
                            className="team-card relative p-6 rounded-3xl pt-10 bg-white border border-slate-100 shadow-lg overflow-visible transform-gpu will-change-transform"
                        >
                            <div className="absolute -top-8 left-6 w-20 h-20 rounded-full overflow-hidden ring-4 ring-white shadow-xl bg-slate-100">
                                <Image src={m.avatar} alt={m.name} width={80} height={80} className="object-fit team-avatar" />
                            </div>

                            <div className="mt-12">
                                <div className="text-lg font-semibold text-slate-900">{m.name}</div>
                                <div className="text-sm text-slate-500 mt-1">{m.role}</div>
                                <p className="text-sm text-slate-600 mt-3">{m.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* PROCESS */}
            <section className="reveal max-w-6xl mx-auto px-6 md:px-12 mt-12">
                <h3 className="text-3xl font-extrabold text-[#0b2a5f]">How we work</h3>
                <div className="mt-8 bg-white border border-slate-100 rounded-3xl p-8 shadow-lg">
                    <div className="flex flex-col md:flex-row items-start gap-6">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                            {['Discover', 'Design', 'Build', 'Launch', 'Grow'].map((step, i) => (
                                <div key={step} className="flex flex-col items-center text-center reveal relative overflow-hidden">
                                    <div className="w-14 h-14 rounded-full bg-[#0b2a5f] text-white flex items-center justify-center font-semibold shadow">{i + 1}</div>
                                    <div className="mt-3 text-sm font-semibold text-slate-900">{step}</div>
                                    <div className="text-xs text-slate-500 mt-1">Short line explaining the step</div>
                                </div>
                            ))}
                        </div>

                        <div className="md:w-1/3 reveal relative overflow-hidden">
                            <div className="rounded-2xl p-5 bg-[#fbfbfe] border border-slate-100">
                                <div className="text-sm font-bold text-slate-900 uppercase tracking-wide">Methodology</div>
                                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                                    We utilize agile iteration and continuous delivery to ensure seamless design-engineering collaboration and performance-driven results.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="reveal max-w-6xl mx-auto px-6 md:px-12 mt-12">
                <div className="rounded-3xl bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6] text-white p-10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 card-premium relative overflow-hidden">
                    {/* Particle only on CTA - keep white */}
                    <ParticleCanvas enabled={particleEnabled} color="#ffffff" />
                    <div>
                        <h4 className="text-2xl font-extrabold">Ready to build something meaningful?</h4>
                        <p className="mt-2 text-sm text-[#e6f0ff]">Let&apos;s talk about product strategy, engineering, and delivery.</p>
                    </div>
                    <div className="flex gap-4">
                        <Link href="/contact" className="btn-cta inline-flex items-center gap-3 rounded-full bg-white/10 border border-white/20 px-6 py-3 font-semibold hover:brightness-110">Book a call</Link>
                        <Link href="/portfolio" className="btn-cta inline-flex items-center gap-3 rounded-full bg-white text-[#0b2a5f] px-6 py-3 font-semibold">View works</Link>
                    </div>
                </div>
            </section>

            <style jsx>{`
        main { font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; }
        .ab-hero-title { letter-spacing: -0.02em; }
        .team-avatar { transform-origin: center; will-change: transform; }

        /* particle canvas sits under content */
        .card-premium { position: relative; }
        .card-particles { position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 0; }
        .card-premium > * { position: relative; z-index: 1; }

        /* hero card specific */
        .hero-card { transition: box-shadow .32s ease, transform .36s ease; }
        .hero-card:hover { box-shadow: 0 24px 60px rgba(11,42,95,0.12); }

        /* button visuals — premium gradient shift + soft elevation */
        .btn-cta { position: relative; overflow: hidden; border-radius: 999px; transition: transform .28s cubic-bezier(.2,.9,.3,1), box-shadow .38s ease; will-change: transform, box-shadow; }
        .btn-cta::before { content: ''; position: absolute; left: -40%; top: -40%; width: 180%; height: 180%; background: linear-gradient(120deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02) 40%, rgba(255,255,255,0.0)); transform: rotate(12deg); opacity: 0; transition: opacity .38s ease, transform .6s cubic-bezier(.2,.9,.3,1); pointer-events: none; }
        .btn-cta:hover::before, .btn-cta:focus::before { opacity: 1; transform: translateX(12%) rotate(12deg); }

        /* primary gradient movement */
        .primary-cta { background-size: 200% 100%; background-position: 0% 50%; }
        .primary-cta:hover { animation: btnGrad 1.6s linear forwards; }
        @keyframes btnGrad { to { background-position: 100% 50%; } }

        /* outline variant tweaks */
        .btn-outline { background: transparent; border-width: 1px; }

        /* CTA icon style */
        .cta-icon { transform-origin: center; will-change: transform; }

        /* team card hover + focus */
        .team-card { transition: box-shadow .28s ease, transform .36s ease; }
        .team-card:hover { box-shadow: 0 18px 40px rgba(11,42,95,0.12); }
        .team-card:active { transform: translateY(-4px); }

        @media (prefers-reduced-motion: reduce) {
          .team-avatar, .ab-bg-blob, .hero-blob, .team-card, .btn-cta, .hero-card, .card-particles { transition: none !important; animation: none !important; transform: none !important; }
          .card-particles { opacity: 0 !important; }
        }

        @media (max-width: 1024px) {
          .ab-hero { grid-template-columns: 1fr; }
        }

        a:focus { outline: none; box-shadow: 0 0 0 4px rgba(31,111,230,0.12); border-radius: 999px; }

        .shadow-soft { box-shadow: 0 10px 30px rgba(11,42,95,0.06); }
        .glass { background: linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.6)); }
      `}</style>
        </main>
    );
}

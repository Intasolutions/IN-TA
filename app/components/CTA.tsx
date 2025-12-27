'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';

/* -------------------- Types -------------------- */

type CTAProps = {
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  particleColor?: string;
  particleEnabled?: boolean;
  className?: string;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  tw: number;
};

/* -------------------- Helpers -------------------- */

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const bigint = parseInt(
    h.length === 3 ? h.split('').map(c => c + c).join('') : h,
    16
  );
  return `${(bigint >> 16) & 255},${(bigint >> 8) & 255},${bigint & 255}`;
}

/* -------------------- Particle Canvas -------------------- */

function ParticleCanvas({
  enabled,
  color = '#ffffff',
}: {
  enabled: boolean;
  color?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const ratio =
    typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const colorRgb = hexToRgb(color);

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
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const initParticles = () => {
      const count = Math.min(32, Math.max(10, Math.floor((w * h) / 24000)));
      particlesRef.current = Array.from({ length: count }).map(() => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.05,
        tw: Math.random() * 360,
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      particlesRef.current.forEach((p, i) => {
        p.tw += 0.8;
        const pulse = 0.5 + Math.sin(p.tw * 0.02) * 0.5;
        const r = p.r * (0.8 + pulse * 0.4);
        const a = p.alpha * (0.6 + pulse * 0.8);

        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 6);
        g.addColorStop(0, `rgba(${colorRgb},${a})`);
        g.addColorStop(1, `rgba(${colorRgb},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(p.x - 20, p.y - 20, 40, 40);

        p.x += p.vx + Math.cos(t * 0.0004 + i) * 0.03;
        p.y += p.vy + Math.sin(t * 0.0004 + i) * 0.03;

        if (p.x < -10) p.x = w + 10;
        if (p.y < -10) p.y = h + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y > h + 10) p.y = -10;
      });
    };

    const loop = (t: number) => {
      if (!paused) draw(t);
      rafRef.current = requestAnimationFrame(loop);
    };

    resize();
    initParticles();
    rafRef.current = requestAnimationFrame(loop);

    window.addEventListener('resize', resize);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [enabled, ratio, colorRgb]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />
  );
}

/* -------------------- CTA Component -------------------- */

export default function CTA({
  title = 'Ready to build something meaningful?',
  subtitle = "Let's talk about product strategy, engineering, and delivery.",
  primaryLabel = 'Book a call',
  primaryHref = '/contact',
  secondaryLabel = 'View works',
  secondaryHref = '/portfolio',
  particleColor = '#ffffff',
  particleEnabled = true,
  className = '',
}: CTAProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [reduceMotion, setReduceMotion] = useState(true);

  /* Reduced motion detection */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(media.matches);
    const onChange = () => setReduceMotion(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  /* Entrance animation */
  useEffect(() => {
    if (!wrapRef.current) return;
    if (!reduceMotion) {
      gsap.fromTo(
        wrapRef.current,
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out' }
      );
    }
  }, [reduceMotion]);

  const showParticles =
    particleEnabled &&
    !reduceMotion &&
    typeof window !== 'undefined' &&
    window.innerWidth > 640;

  return (
    <section
      ref={wrapRef}
      className={`
        relative overflow-hidden rounded-3xl shadow-2xl text-white
        px-6 py-8
        sm:px-8 sm:py-10
        md:px-12 md:py-12
        lg:px-16
        flex flex-col md:flex-row
        items-start md:items-center
        justify-between
        gap-6 md:gap-10
        ${className}
      `}
      style={{ background: 'linear-gradient(90deg,#0b2a5f,#1f6fe6)' }}
    >
      {/* Particles */}
      <div className="absolute inset-0 -z-10">
        <ParticleCanvas enabled={showParticles} color={particleColor} />
      </div>

      {/* Text */}
      <div className="max-w-xl text-center md:text-left">
        <h4 className="font-extrabold text-[clamp(1.4rem,3.5vw,2rem)] leading-tight">
          {title}
        </h4>
        <p className="mt-3 text-[clamp(0.9rem,2.5vw,1rem)] text-[#e6f0ff]">
          {subtitle}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 sm:gap-4">
        <Link
          href={primaryHref}
          className="
            cta-primary
            w-full sm:w-auto
            inline-flex items-center justify-center
            rounded-full
            bg-white/10 border border-white/20
            px-6 py-3
            text-sm font-semibold
            backdrop-blur
          "
        >
          {primaryLabel}
        </Link>

        <Link
          href={secondaryHref}
          className="
            w-full sm:w-auto
            inline-flex items-center justify-center
            rounded-full
            bg-white text-[#0b2a5f]
            px-6 py-3
            text-sm font-semibold
          "
        >
          {secondaryLabel}
        </Link>
      </div>
    </section>
  );
}

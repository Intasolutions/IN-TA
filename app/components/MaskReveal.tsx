'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function MaskReveal({
  triggerKey,
  onComplete,
}: {
  triggerKey: string;
  onComplete?: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (reduce) {
      onComplete?.();
      return;
    }

    const tl = gsap.timeline({
      defaults: { ease: 'power3.inOut' },
      onComplete,
    });

    // reset position on every route change
    tl.set(svgRef.current, { yPercent: 0 });

    tl.to(svgRef.current, {
      yPercent: -100,
      duration: 1.6,
    });

    return () => {
      tl.kill();
    };
  }, [triggerKey, onComplete]);

  return (
    <svg
      ref={svgRef}
      className="fixed inset-0 z-[9999] pointer-events-none"
      viewBox="0 0 1440 900"
      preserveAspectRatio="none"
    >
      <rect width="1440" height="900" fill="#000" />
      <path
        d="
          M0,0
          H1440
          V720
          C1080,860 360,860 0,720
          Z
        "
        fill="#000"
      />
    </svg>
  );
}

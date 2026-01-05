'use client';

import { useEffect } from 'react';
import gsap from 'gsap';

export default function usePageReveal() {
  useEffect(() => {
    const prefersReduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReduce) return;

    gsap.from('[data-reveal]', {
      y: 36,
      opacity: 0,
      filter: 'blur(10px)',
      duration: 1,
      ease: 'power4.out',
      stagger: 0.14,
      delay: 0.2,
    });
  }, []);
}

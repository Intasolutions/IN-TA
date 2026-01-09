// app/hooks/usePageReveal.ts
'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { useReveal } from '../context/RevealContext';

export default function usePageReveal() {
  const { isRevealed } = useReveal();

  useEffect(() => {
    if (!isRevealed) return;

    const prefersReduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReduce) {
      gsap.set('[data-reveal]', { autoAlpha: 1, y: 0, filter: 'blur(0px)' });
      return;
    }

    gsap.fromTo(
      '[data-reveal]',
      {
        y: 36,
        autoAlpha: 0,
        filter: 'blur(10px)',
      },
      {
        y: 0,
        autoAlpha: 1,
        filter: 'blur(0px)',
        duration: 1,
        ease: 'power4.out',
        stagger: 0.14,
        delay: 0.2,
      }
    );
  }, [isRevealed]);
}

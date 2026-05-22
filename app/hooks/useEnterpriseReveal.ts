'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReveal } from '../context/RevealContext';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export function useEnterpriseReveal() {
  const { isRevealed } = useReveal();

  useEffect(() => {
    if (typeof window === 'undefined' || !isRevealed) return;

    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduce) {
      gsap.set('[data-reveal]', { autoAlpha: 1, y: 0, opacity: 1 });
      return;
    }

    let ctx = gsap.context(() => {
      // 1. Mask-Up (For Headings)
      gsap.set('[data-reveal="mask-up"]', { y: 60, autoAlpha: 0 });
      ScrollTrigger.batch('[data-reveal="mask-up"]', {
        start: 'top 90%',
        onEnter: (elements) => {
          gsap.to(elements, {
            autoAlpha: 1,
            y: 0,
            duration: 1.2,
            stagger: 0.15,
            ease: 'expo.out',
            overwrite: 'auto'
          });
        },
      });

      // 2. Cascade (For Paragraphs, Features, Chips)
      gsap.set('[data-reveal="cascade"]', { y: 30, autoAlpha: 0 });
      ScrollTrigger.batch('[data-reveal="cascade"]', {
        start: 'top 90%',
        onEnter: (elements) => {
          gsap.to(elements, {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            stagger: 0.1,
            ease: 'back.out(1.2)',
            overwrite: 'auto'
          });
        },
      });

      // 3. Zoom-out (For Image Parallax)
      const zoomOuts = gsap.utils.toArray<HTMLElement>('[data-reveal="zoom-out"]');
      zoomOuts.forEach((el) => {
        gsap.fromTo(el,
          { scale: 1.15 },
          {
            scale: 1.0,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top bottom',
              end: 'top 20%',
              scrub: true,
            }
          }
        );
      });
      
    });

    return () => {
      ctx.revert();
    };
  }, [isRevealed]);
}

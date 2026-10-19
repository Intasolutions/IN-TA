'use client'

import { useEffect } from 'react'
import Lenis from '@studio-freight/lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      touchMultiplier: 3.8,
    })

    lenis.on('scroll', () => {
      ScrollTrigger.update();
    });

    const update = (time: number) => {
      lenis.raf(time * 1000);
    };
    
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    // Images / API content loading change the page height; keep every ScrollTrigger's positions in sync
    let refreshTimer: ReturnType<typeof setTimeout>;
    let lastHeight = document.body.scrollHeight;
    const ro = new ResizeObserver(() => {
      const height = document.body.scrollHeight;
      if (height === lastHeight) return;
      lastHeight = height;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 200);
    });
    ro.observe(document.body);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(update);
      ro.disconnect();
      clearTimeout(refreshTimer);
    }
  }, [])

  return <>{children}</>
}

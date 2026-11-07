'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger);
// Mobile address bars resize the viewport while scrolling; don't recalculate every trigger for that
ScrollTrigger.config({ ignoreMobileResize: true });

let instance: Lenis | null = null;

/** Smooth-scroll to a position on the page */
export function scrollToY(y: number) {
  if (instance) instance.scrollTo(y, { duration: 1.8 });
  else window.scrollTo({ top: y, behavior: 'smooth' });
}

/** Straight to a position on the page, with no scrolling in between */
export function jumpToY(y: number) {
  if (instance) instance.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo({ top: y, behavior: 'auto' });
  ScrollTrigger.update();
}

/** Straight back to the top of the page, without travelling through every section on the way */
export function scrollToTop() {
  if (instance) instance.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo({ top: 0, behavior: 'auto' });
  ScrollTrigger.update();
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // lerp 0.1 is Lenis's own default: smooth, but the page stops soon after the wheel does instead of drifting on
    // (0.075 kept it gliding for about a second, which felt laggy, most of all when stopping at the top)
    const lenis = new Lenis({
      lerp: 0.1,
      autoRaf: false, // driven by GSAP's ticker below, so ScrollTrigger and Lenis move in the same frame
    })
    instance = lenis;

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
      instance = null;
      gsap.ticker.remove(update);
      ro.disconnect();
      clearTimeout(refreshTimer);
    }
  }, [])

  return <>{children}</>
}

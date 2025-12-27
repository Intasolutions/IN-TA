'use client';

import React, { useEffect } from 'react';
import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import Header from '../components/Header';
import AboutPage from './components/About';

import Header1 from '../components/Header1';
import Footer1 from '../components/Footersecond';
import SmoothScroll from '../components/SmoothScroll';

gsap.registerPlugin(ScrollTrigger);

const Page = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smooth: true,
      smoothTouch: true,
      touchMultiplier: 3.8,
    } as any);

    // RAF loop for Lenis
    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Keep GSAP ScrollTrigger in sync with Lenis
    const onScroll = () => {
      try {
        ScrollTrigger.update();
      } catch { }
    };
    try {
      lenis.on('scroll', onScroll);
    } catch { }

    return () => {
      try {
        cancelAnimationFrame(rafId);
      } catch { }
      try { lenis.off('scroll', onScroll); } catch { }
      try { lenis.destroy(); } catch { }
    };
  }, []);

  return (
    <>
    <SmoothScroll>
      <Header1/>
      <AboutPage />
      <Footer1/>
   </SmoothScroll>
    </>
  );
};

export default Page;
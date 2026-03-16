'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReveal } from '../context/RevealContext';

gsap.registerPlugin(ScrollTrigger);

export default function CompanyIntro() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isRevealed } = useReveal();

  useEffect(() => {
    if (!containerRef.current || !isRevealed) return;

    // Use gsap.context for robust cleanup and scoping
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.reveal-text',
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 85%', // Trigger slightly earlier for better UX
            toggleActions: 'play none none none',
          },
        }
      );
    }, containerRef);

    // Force a refresh after a short delay to handle Next.js route changes/layout shifts
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 500);

    return () => {
      ctx.revert();
      clearTimeout(timer);
    };
  }, [isRevealed]);

  return (
    <section ref={containerRef} className="py-20 px-6 md:px-20 bg-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="reveal-text text-4xl md:text-6xl font-black text-[#0b2a5f] leading-tight mb-8">
          Custom Software Development Company in <span className="text-blue-600">Kerala</span>
        </h1>
        <div className="reveal-text space-y-6 text-lg md:text-xl text-slate-600 leading-relaxed font-light">
          <p>
            INTA Solutions is a premier <span className="font-semibold text-slate-900">IT company in Wayanad</span>, Kerala, 
            specializing in delivering high-impact digital solutions for global enterprises. 
            We provide comprehensive <span className="font-semibold text-slate-900">software development company Kerala</span> services, 
            ranging from scalable web ecosystems to high-performance mobile applications.
          </p>
          <p>
            Our core expertise lies in <span className="font-semibold text-slate-900">custom software development</span> and 
            advanced <span className="font-semibold text-slate-900">AI integration services</span>. We bridge the gap between 
            complex business requirements and cutting-edge technology, ensuring your digital infrastructure is built to 
            evolve alongside your ambitions.
          </p>
          <p>
            Whether you are a startup looking for an MVP or an established enterprise seeking digital transformation, 
            our architects and engineers in Wayanad deliver excellence through strategic design and robust engineering.
          </p>
        </div>
      </div>
    </section>
  );
}

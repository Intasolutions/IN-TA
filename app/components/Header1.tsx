// frontend/components/Header1.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';

export default function Header1() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const lastScrollY = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  // --- 1. SCROLL BEHAVIOR ---
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 20);

      // Hide header on scroll down (if > 100px), show on scroll up
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- 2. MENU ANIMATION SETUP ---
  useEffect(() => {
    const ctx = gsap.context(() => {
      tl.current = gsap.timeline({ paused: true });

      // Slide Menu Down (Keep the dark premium menu for contrast)
      tl.current.to(menuRef.current, {
        yPercent: 100,
        duration: 0.6,
        ease: 'power4.inOut',
        display: 'flex'
      });

      // Animate Links
      tl.current.fromTo('.mobile-link', 
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.1, ease: 'power2.out' },
        '-=0.2'
      );
    }, menuRef);

    return () => ctx.revert();
  }, []);

  // --- 3. TOGGLE HANDLER ---
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
      tl.current?.play();
    } else {
      document.body.style.overflow = '';
      tl.current?.reverse();
    }
  }, [isMobileOpen]);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Work', href: '/portfolio' },
    { name: 'About', href: '/about' },
    { name: 'Services', href: '/services' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full z-[60] transition-transform duration-500
          ${isVisible ? 'translate-y-0' : '-translate-y-full'}
        `}
      >
        {/* Glass Background Panel (Light Version) */}
        <div 
          className={`absolute inset-0 transition-opacity duration-300
            ${isScrolled && !isMobileOpen ? 'opacity-100' : 'opacity-0'}
            bg-[#f8f6f1]/80 backdrop-blur-md border-b border-black/5 shadow-sm
          `} 
        />

        <div className="relative max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          
          {/* --- LOGO SECTION --- */}
          {/* Kept the premium gradient box because it looks great as a badge on light backgrounds too */}
          <Link href="/" className="relative z-[70] group flex items-center gap-3 shrink-0">
             <div className="relative h-12 w-20 md:h-16 md:w-20 shrink-0 rounded-xl bg-gradient-to-br from-slate-950 via-[#0a0e24] to-blue-950 border border-blue-800/30 shadow-lg shadow-blue-900/10 ring-1 ring-inset ring-white/5 overflow-hidden flex items-center justify-center p-2">
                <img 
                  src="/logo/logo-inta-light.png" 
                  alt="Inta Solutions" 
                  className="w-full h-full object-contain drop-shadow-sm" 
                />
             </div>
             
             {/* Text: Dark on Desktop (Light background), White when Mobile Menu is open */}
             <span className={`font-bold tracking-wider uppercase whitespace-nowrap transition-colors duration-300
               text-xs md:text-sm 
               ${isMobileOpen ? 'text-white' : 'text-slate-800 group-hover:text-blue-600'}
             `}>
               In-ta Solutions
             </span>
          </Link>

          {/* DESKTOP NAV (BLACK TEXT) */}
          <nav className="hidden md:flex items-center gap-8 relative z-[70]">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href}
                className="text-sm font-semibold text-slate-800 hover:text-blue-600 transition-all duration-300 relative group"
              >
                {link.name}
                {/* Underline animation (Blue) */}
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-blue-600 transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
            
            <Link 
              href="/contact"
              className="ml-4 px-6 py-2.5 rounded-full bg-slate-900 hover:bg-blue-600 text-xs font-bold uppercase tracking-widest text-white transition-all duration-300 shadow-lg shadow-slate-900/20 hover:shadow-blue-600/30"
            >
              Get a Quote
            </Link>
          </nav>

          {/* BURGER MENU BUTTON (Dark bars for light bg) */}
          <button 
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className={`md:hidden relative z-[70] w-12 h-12 flex items-center justify-center rounded-lg border transition-colors backdrop-blur-sm
              ${isMobileOpen ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-black/5 bg-black/5 hover:bg-black/10'}
            `}
            aria-label="Toggle Menu"
          >
            <div className="flex flex-col gap-1.5 items-center justify-center w-6">
                <span className={`h-0.5 rounded-full transition-all duration-300 ease-in-out ${isMobileOpen ? 'bg-white w-6 rotate-45 translate-y-2' : 'bg-slate-900 w-6'}`} />
                <span className={`h-0.5 rounded-full transition-all duration-300 ease-in-out ${isMobileOpen ? 'bg-white w-0 opacity-0' : 'bg-slate-900 w-4'}`} />
                <span className={`h-0.5 rounded-full transition-all duration-300 ease-in-out ${isMobileOpen ? 'bg-white w-6 -rotate-45 -translate-y-2' : 'bg-slate-900 w-6'}`} />
            </div>
          </button>
        </div>
      </header>

      {/* MOBILE FULLSCREEN MENU (Kept Dark for Premium Contrast) */}
      <div 
        ref={menuRef}
        className="fixed inset-0 z-[50] bg-[#020617] hidden flex-col items-center justify-center -translate-y-full"
      >
        {/* Background Ambient Glow */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px]" />
        </div>
        
        {/* Links Container */}
        <div className="flex flex-col items-center gap-6 text-center relative z-10 w-full px-6">
          {navLinks.map((link) => (
            <Link 
              key={link.name}
              href={link.href}
              onClick={() => setIsMobileOpen(false)}
              className="mobile-link text-4xl font-bold text-white/90 hover:text-blue-400 transition-colors tracking-tight will-change-transform"
            >
              {link.name}
            </Link>
          ))}
           
           <div className="mobile-link mt-8 w-full max-w-[200px]">
              <Link 
                href="/contact"
                onClick={() => setIsMobileOpen(false)}
                className="flex items-center justify-center w-full px-6 py-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold tracking-wide shadow-xl shadow-blue-900/30 transition-all"
              >
                Get a Quote
              </Link>
           </div>
        </div>

        {/* Footer Brand */}
        <div className="absolute bottom-10 left-0 w-full text-center mobile-link opacity-50">
             <span className="text-[10px] uppercase tracking-[0.3em] text-white/30">
                Inta Solutions Pvt Ltd
             </span>
        </div>
      </div>
    </>
  );
}
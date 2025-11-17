// frontend/components/Header.tsx
'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolling(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      aria-label="Main header"
      className={`absolute top-0 left-0 right-0 z-50 transition-all duration-500 pointer-events-auto ${
        scrolling ? 'bg-black/70 backdrop-blur-md shadow-md' : 'bg-transparent'
      }`}
      style={{ WebkitBackdropFilter: scrolling ? 'saturate(120%) blur(6px)' : undefined }}
    >
      {/* subtle glow behind header (non-interactive) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="header-glow" />
      </div>

      <div className="relative z-10">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo/logo-inta.png"
              alt="logo"
              width={130}
              height={26}
              priority
              className="object-contain"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#" className="hover:text-[#1f6fe6] text-white font-medium">
              Home
            </Link>
            <Link href="#" className="hover:text-[#1f6fe6] text-white">
              About Us
            </Link>
            <Link href="#" className="hover:text-[#1f6fe6] text-white">
              Services
            </Link>
            <button className="ml-6 rounded-full bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6] text-white px-4 py-2 font-semibold shadow-md hover:brightness-110 transition">
              Get a Quote
            </button>
          </nav>

          {/* Mobile toggle */}
          <div className="md:hidden flex items-center">
            <button
              aria-label="menu"
              onClick={() => setOpen(!open)}
              className="p-2 border border-white/20 rounded-md"
            >
              <svg width="22" height="14" viewBox="0 0 22 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="22" height="2" rx="1" fill="white" />
                <rect y="6" width="22" height="2" rx="1" fill="white" />
                <rect y="12" width="22" height="2" rx="1" fill="white" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <div
          className={`md:hidden bg-black/90 border-t border-white/10 transition-all duration-300 ${
            open ? 'max-h-60 py-3' : 'max-h-0 overflow-hidden'
          }`}
        >
          <div className="flex flex-col gap-3 px-4 text-white">
            <Link href="#" className="hover:text-[#1f6fe6]">Home</Link>
            <Link href="#" className="hover:text-[#1f6fe6]">About Us</Link>
            <Link href="#" className="hover:text-[#1f6fe6]">Services</Link>
            <button className="w-full mt-2 rounded-full bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6] text-white px-4 py-2 font-semibold shadow-md hover:brightness-110 transition">
              Get a Quote
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

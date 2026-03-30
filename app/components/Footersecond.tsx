'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Footer1() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-[#fbf9f5]">
      <div className="max-w-7xl mx-auto px-6 py-8 md:py-6 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
        
        {/* LEFT — Logo + Brand */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <div className="relative shrink-0">
            <Image
              src="/logo/logo-inta.png" 
              alt="IN-TA Solutions Logo"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>

          <div>
            <p className="font-bold text-[#0b2a5f] leading-tight text-sm tracking-wide">
              IN-TA SOLUTIONS PVT LTD
            </p>
            <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              <p>Thonichal, Mananthavady, Wayanad, Kerala 670645</p>
              <a href="tel:+919447595381" className="text-[#0b2a5f] hover:underline font-medium transition-all">+91 94475 95381</a>
            </div>
          </div>
        </div>

        {/* CENTER — Navigation */}
        {/* flex-wrap ensures links don't overflow on small mobile screens */}
        <nav 
          aria-label="Footer Navigation"
          className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm font-medium text-slate-600"
        >
          <Link href="/" className="hover:text-[#0b2a5f] transition-colors duration-200">
            Home
          </Link>
          <Link href="/about" className="hover:text-[#0b2a5f] transition-colors duration-200">
            About
          </Link>
          <Link href="/services" className="hover:text-[#0b2a5f] transition-colors duration-200">
            Services
          </Link>
          <Link href="/portfolio" className="hover:text-[#0b2a5f] transition-colors duration-200">
            Work
          </Link>
          <Link href="/contact" className="hover:text-[#0b2a5f] transition-colors duration-200">
            Contact
          </Link>
        </nav>

        {/* RIGHT — Copyright */}
        <div className="text-xs sm:text-sm text-slate-500 text-center md:text-right opacity-80">
          <p>© {currentYear} IN-TA Solutions Pvt. Ltd.</p>
          <p className="md:hidden mt-1">All rights reserved.</p> {/* Splits line on mobile for neatness */}
          <span className="hidden md:inline"> All rights reserved.</span>
        </div>

      </div>
    </footer>
  );
}
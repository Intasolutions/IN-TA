'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Footer1() {
  return (
    <footer className="border-t border-slate-200 bg-[#fbf9f5]">
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-4 flex flex-col md:flex-row items-center justify-between gap-3">

        {/* LEFT — Logo + Brand */}
        <div className="flex items-center gap-3 text-center md:text-left">
          <Image
            src="/logo/logo-inta.png" // 🔁 replace with your actual logo path
            alt="YourCompany logo"
            width={32}
            height={32}
            className="object-contain"
            priority
          />

          <div>
            <p className="font-semibold text-[#0b2a5f] leading-tight">
              IN-TA SOLUTION PVT LTD
            </p>
            <p className="text-xs text-slate-500">
              Designing & building digital products.
            </p>
          </div>
        </div>

        {/* CENTER — Navigation */}
        <nav className="flex gap-6 text-sm text-slate-600">
          <Link href="/" className="hover:text-[#0b2a5f] transition">
            Home
          </Link>
          <Link href="/about" className="hover:text-[#0b2a5f] transition">
            About
          </Link>
          <Link href="/services" className="hover:text-[#0b2a5f] transition">
            Services
          </Link>
          <Link href="/portfolio" className="hover:text-[#0b2a5f] transition">
            Work
          </Link>
          <Link href="/contact" className="hover:text-[#0b2a5f] transition">
            Contact
          </Link>
        </nav>

        {/* RIGHT — Copyright */}
        <div className="text-sm text-slate-500 text-center md:text-right">
          © {new Date().getFullYear()} IN-TA Solutions Pvt. Ltd. All rights reserved.
        </div>

      </div>
    </footer>
  );
}

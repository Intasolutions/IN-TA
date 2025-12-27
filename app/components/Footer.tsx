// frontend/components/Footer.tsx
'use client';

import React, { useState } from 'react';
export default function Footer() {
  const [email, setEmail] = useState('');
  const year = new Date().getFullYear();

  const onSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple fallback: open user's mail client. Replace this with your API call if available.
    if (!email) {
      // small client-side hint
      alert('Please enter your email to subscribe.');
      return;
    }
    const subject = encodeURIComponent('Subscribe to newsletter');
    const body = encodeURIComponent(`Please subscribe ${email} to the newsletter.`);
    window.location.href = `mailto:hello@yourdomain.com?subject=${subject}&body=${body}`;
  };

  return (
    <footer className="bg-gradient-to-tr from-[#07172a] via-[#0b2a5f] to-[#0b3f7f] text-slate-200 ">
      <div className="container mx-auto px-6 md:px-12 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand / about */}
          <div className="md:col-span-4">
            <div className="flex items-center gap-3">
              <img src="/logo/logo-inta.png" alt="IN-TA Solutions" className="w-12 h-12 object-contain" />
              <div>
                <div className="text-lg font-semibold">IN-TA Solutions</div>
                <div className="mt-1 text-sm text-slate-300 max-w-xs">
                  Crafting premium digital experiences — design system-driven, accessible, and performance-minded.
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <a
                href="mailto:hello@yourdomain.com"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-white/6 hover:bg-white/8 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1f6fe6]/30"
                aria-label="Email us"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M3 7.5v9A2.5 2.5 0 0 0 5.5 19h13a2.5 2.5 0 0 0 2.5-2.5v-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M21 7.5L12 13 3 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                hello@yourdomain.com
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="md:col-span-5 grid grid-cols-2 gap-6 md:gap-10">
            <div>
              <h4 className="text-sm font-semibold text-slate-100 mb-3">Services</h4>
              <nav aria-label="footer services">
                <ul className="space-y-2 text-sm text-slate-300">
                  <li><a className="footer-link" href="/services/web-development">Web Development</a></li>
                  <li><a className="footer-link" href="/services/ui-ux">UI / UX Design</a></li>
                  <li><a className="footer-link" href="/services/app-development">App Development</a></li>
                  <li><a className="footer-link" href="/services/video-production">Video Production</a></li>
                </ul>
              </nav>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-100 mb-3">Resources</h4>
              <nav aria-label="footer resources">
                <ul className="space-y-2 text-sm text-slate-300">
                  <li><a className="footer-link" href="/case-studies">Case Studies</a></li>
                  <li><a className="footer-link" href="/blog">Insights</a></li>
                  <li><a className="footer-link" href="/contact">Contact</a></li>
                  <li><a className="footer-link" href="/privacy">Privacy</a></li>
                </ul>
              </nav>
            </div>
          </div>

          {/* Newsletter / Social */}
          <div className="md:col-span-3">
            <h4 className="text-sm font-semibold text-slate-100 mb-3">Join our newsletter</h4>
            <p className="text-sm text-slate-300 mb-4">Short, useful updates — design & product thinking, once a month.</p>

            <form className="flex gap-2" onSubmit={onSubscribe}>
              <label htmlFor="footer-email" className="sr-only">Email address</label>
              <input
                id="footer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="flex-1 min-w-0 px-3 py-2 text-sm rounded-full bg-white/6 placeholder:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1f6fe6]/30"
                aria-label="Your email"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6] text-white text-sm font-semibold shadow hover:translate-y-[-2px] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1f6fe6]/30"
                aria-label="Subscribe"
              >
                Subscribe
              </button>
            </form>

            <div className="mt-6 flex items-center gap-3" aria-hidden>
              {/* Social icons (only visuals) */}
              <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" className="social-btn" aria-label="LinkedIn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4.98 3.5A2.5 2.5 0 0 0 2.5 6v12a2.5 2.5 0 0 0 2.48 2.5h.02A2.5 2.5 0 0 0 7.98 18V6a2.5 2.5 0 0 0-2.98-2.5zM9 8.9h3v1.6h.04c.42-.8 1.44-1.64 2.96-1.64 3.17 0 3.76 2.06 3.76 4.74V18h-3v-4.02c0-.96-.02-2.2-1.34-2.2-1.34 0-1.55 1.04-1.55 2.12V18h-3V8.9z" stroke="currentColor" strokeWidth="0.6" /></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="social-btn" aria-label="Twitter">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 7.5c-.56.26-1.16.44-1.8.52.64-.38 1.12-.98 1.35-1.7-.6.36-1.28.62-2 .76C16.9 6.4 16 6 15 6c-1.64 0-2.97 1.3-2.97 2.9 0 .23.03.45.08.66C9.7 9.42 7.12 8.2 5.5 6.2c-.25.42-.4.92-.4 1.45 0 1.02.52 1.92 1.33 2.45-.48 0-.94-.14-1.34-.36v.04c0 1.43 1.03 2.62 2.4 2.89-.25.07-.5.1-.76.1-.18 0-.36-.02-.54-.05.36 1.15 1.38 1.98 2.6 2.01-1 .79-2.25 1.26-3.61 1.26-.23 0-.46-.01-.69-.04 1.3.82 2.85 1.29 4.52 1.29 5.42 0 8.38-4.52 8.38-8.44v-.38c.57-.4 1.06-.9 1.45-1.46-.5.24-1.02.4-1.58.47.57-.36 1-1 .95-1.7z" stroke="currentColor" strokeWidth="0.5" /></svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="social-btn" aria-label="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="0.6" /><path d="M16.5 7.5h.01" stroke="currentColor" strokeWidth="0.8" /><path d="M12 8.3a3.7 3.7 0 100 7.4 3.7 3.7 0 000-7.4z" stroke="currentColor" strokeWidth="0.6" /></svg>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/6 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400">© {year} IN-TA Solutions. All rights reserved.</p>

          <div className="flex items-center gap-4">
            <nav aria-label="footer small links" className="text-sm text-slate-400">
              <a className="footer-link ml-0 mr-3" href="/terms">Terms</a>
              <a className="footer-link mr-3" href="/security">Security</a>
              <a className="footer-link" href="/sitemap.xml">Sitemap</a>
            </nav>

            {/* small payment / trust badges */}
            <div className="flex items-center gap-3 opacity-80">
              <span className="text-xs text-slate-400">Trusted by</span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-6 bg-white/6 rounded-md flex items-center justify-center text-xs">A</div>
                <div className="w-8 h-6 bg-white/6 rounded-md flex items-center justify-center text-xs">B</div>
                <div className="w-8 h-6 bg-white/6 rounded-md flex items-center justify-center text-xs">C</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .footer-link {
          color: rgba(241,246,255,0.82);
          text-decoration: none;
          transition: color .18s ease, transform .18s ease;
        }
        .footer-link:hover, .footer-link:focus {
          color: #ffffff;
          transform: translateY(-2px);
        }

        .social-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(255,255,255,0.03);
          transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
          color: rgba(255,255,255,0.92);
        }
        .social-btn:hover {
          transform: translateY(-4px);
          background: rgba(255,255,255,0.06);
          box-shadow: 0 10px 30px rgba(2,6,23,0.45);
        }

        @media (prefers-reduced-motion: reduce) {
          .footer-link, .social-btn, button, .panel-cta { transition: none !important; animation: none !important; transform: none !important; }
        }
      `}</style>
    </footer>
  );
}

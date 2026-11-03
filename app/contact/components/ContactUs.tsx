'use client';

import React, { useEffect, useRef, useState } from 'react';
import ContactForm from './ContactForm';
import gsap from 'gsap';


import { useReveal } from '../../context/RevealContext';

export default function ContactPage() {
  const root = useRef<HTMLElement | null>(null);
  const [sent, setSent] = useState(false);
  const { isRevealed } = useReveal();

  useEffect(() => {
    if (!root.current || !isRevealed) return; // wait for reveal

    const ctx = gsap.context(() => {
      /* ---------------- HERO TEXT (APPLE STYLE) ---------------- */
      // Content already hidden via inline styles
      gsap.fromTo(
        '.hero-line',
        {
          yPercent: 120,
          autoAlpha: 0,
          filter: 'blur(10px)',
          letterSpacing: '0.08em',
        },
        {
          yPercent: 0,
          autoAlpha: 1,
          filter: 'blur(0px)',
          letterSpacing: '0em',
          duration: 3,
          ease: 'power4.out',
          stagger: 0.14,
          clearProps: 'filter'
        }
      );

      /* ---------------- HERO PARAGRAPH ---------------- */
      gsap.fromTo(
        '.hero-sub',
        {
          y: 24,
          autoAlpha: 0,
          filter: 'blur(6px)',
        },
        {
          y: 0,
          autoAlpha: 1,
          filter: 'blur(0px)',
          duration: 1.4,
          ease: 'power3.out',
          delay: 0.6,
          clearProps: 'filter'
        }
      );

      /* ---------------- FORM + RIGHT COLUMN (MICRO DELAY) ---------------- */
      gsap.fromTo(
        '.reveal',
        {
          y: 40,
          autoAlpha: 0,
          filter: 'blur(12px)'
        },
        {
          y: 0,
          autoAlpha: 1,
          filter: 'blur(0px)',
          duration: 1.25,
          ease: 'power4.out',
          stagger: 0.12,
          delay: 0.95,
          clearProps: 'filter'
        }
      );
    }, root);

    return () => ctx.revert();
  }, [isRevealed]);

  return (
    <main
      ref={root}
      className="min-h-screen bg-[#f8f7f4] px-6 md:px-16 py-24"
    >
      {/* ---------------- HERO ---------------- */}
      <section className="max-w-5xl mx-auto text-center mb-24">
        <h1 className="heading-page text-midnight">
          <span className="block overflow-hidden">
            <span className="hero-line block will-change-transform" style={{ opacity: 0, visibility: 'hidden' }}>
              Let’s talk about
            </span>
          </span>
          <span className="block overflow-hidden">
            <span className="hero-line block will-change-transform" style={{ opacity: 0, visibility: 'hidden' }}>
              what you’re building.
            </span>
          </span>
        </h1>

        <p className="hero-sub mt-6 text-lg text-slate-600 max-w-2xl mx-auto" style={{ opacity: 0, visibility: 'hidden' }}>
          Whether it’s a product, platform, or idea -
          we help you turn it into something real.
        </p>
      </section>

      {/* ---------------- CONTENT ---------------- */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* LEFT – FORM */}
        <div className="reveal bg-white/70 backdrop-blur-xl rounded-[32px] p-10 shadow-[0_40px_120px_rgba(0,0,0,0.08)]" style={{ opacity: 0, visibility: 'hidden' }}>
          {!sent ? (
            <ContactForm
              onSuccess={() => {
                try {
                  (window as any).dataLayer?.push?.({
                    event: 'contactFormSuccess',
                  });
                } catch { }
                setSent(true);
              }}
            />
          ) : (
            <div className="text-center py-20">
              <div className="text-5xl mb-6">🚀</div>
              <h3 className="heading-sub text-midnight">
                Message received
              </h3>
              <p className="mt-3 text-slate-600">
                We’ll get back to you shortly.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT – INFO */}
        <div className="reveal flex flex-col gap-10" style={{ opacity: 0, visibility: 'hidden' }}>
          <div className="bg-white/70 backdrop-blur-[18px] rounded-[28px] p-[28px] shadow-[0_30px_90px_rgba(0,0,0,0.06)]">
            <h3 className="heading-sub text-midnight">What happens next</h3>
            <div className="mt-5 flex flex-col gap-[18px]">
              <div className="flex gap-4 items-start">
                <span className="font-bold text-[#1f6fe6]">01</span>
                <p className="text-slate-600 text-sm">We review your request and goals</p>
              </div>
              <div className="flex gap-4 items-start">
                <span className="font-bold text-[#1f6fe6]">02</span>
                <p className="text-slate-600 text-sm">A short discovery call</p>
              </div>
              <div className="flex gap-4 items-start">
                <span className="font-bold text-[#1f6fe6]">03</span>
                <p className="text-slate-600 text-sm">Clear scope, timeline & pricing</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-[18px] rounded-[28px] p-[28px] shadow-[0_30px_90px_rgba(0,0,0,0.06)]">
            <h3 className="heading-sub text-midnight">Why work with us</h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-slate-600">
              <li>✔ Product-focused engineering</li>
              <li>✔ Clear communication</li>
              <li>✔ Scalable, future-ready solutions</li>
              <li>✔ Long-term support mindset</li>
            </ul>
          </div>

          <div className="p-6 rounded-3xl bg-gradient-to-b from-[#1f6fe614] to-[#0b2a5f14]">
            <p className="font-semibold text-[#0b2a5f] mb-3">Prefer a direct conversation?</p>
            <div className="text-sm text-slate-700">📧 info@in-tasolutions.com</div>
            <div className="text-sm text-slate-700">📞 +91 9447595381</div>
          </div>
        </div>
      </section>
    </main>
  );
}

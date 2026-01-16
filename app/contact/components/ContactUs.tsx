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
        <h1 className="text-4xl md:text-6xl font-extrabold text-[#0b2a5f] leading-tight">
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
              <h3 className="text-2xl font-bold text-[#0b2a5f]">
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
          <div className="glass-card">
            <h3 className="section-title">What happens next</h3>
            <div className="timeline">
              <div className="step">
                <span>01</span>
                <p>We review your request and goals</p>
              </div>
              <div className="step">
                <span>02</span>
                <p>A short discovery call</p>
              </div>
              <div className="step">
                <span>03</span>
                <p>Clear scope, timeline & pricing</p>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="section-title">Why work with us</h3>
            <ul className="trust-list">
              <li>✔ Product-focused engineering</li>
              <li>✔ Clear communication</li>
              <li>✔ Scalable, future-ready solutions</li>
              <li>✔ Long-term support mindset</li>
            </ul>
          </div>

          <div className="soft-contact">
            <p>Prefer a direct conversation?</p>
            <div className="contact-row">📧 hello@y.com</div>
            <div className="contact-row">📞 +91 </div>
          </div>
        </div>
      </section>

      {/* ---------------- STYLES ---------------- */}
      <style jsx>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(18px);
          border-radius: 28px;
          padding: 28px;
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.06);
        }

        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: #0b2a5f;
        }

        .timeline {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .step {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .step span {
          font-weight: 700;
          color: #1f6fe6;
        }

        .step p {
          color: #475569;
          font-size: 14px;
        }

        .trust-list {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 14px;
          color: #475569;
        }

        .soft-contact {
          padding: 24px;
          border-radius: 24px;
          background: linear-gradient(
            180deg,
            rgba(31, 111, 230, 0.08),
            rgba(11, 42, 95, 0.08)
          );
        }

        .soft-contact p {
          font-weight: 600;
          color: #0b2a5f;
          margin-bottom: 12px;
        }

        .contact-row {
          font-size: 14px;
          color: #334155;
        }
      `}</style>
    </main>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function ContactPage() {
  const root = useRef<HTMLElement | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
  const ctx2 = gsap.context(() => {
    gsap.from('.reveal .line', {
      yPercent: 120,
      opacity: 0,
      duration: 1.2,
      ease: 'power4.out',
      stagger: 0.12,
    });
  });


    const ctx = gsap.context(() => {
      gsap.from('.reveal', {
        y: 40,
        autoAlpha: 0,
        duration: 1,
        ease: 'power3.out',
        stagger: 0.12,
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <main
      ref={root}
      className="min-h-screen bg-[#f8f7f4] px-6 md:px-16 py-24"
    >
      {/* HERO */}
      <section className="max-w-5xl mx-auto text-center mb-24">
    <h1 className="reveal text-4xl md:text-6xl font-extrabold text-[#0b2a5f] leading-tight overflow-hidden">
  <span className="line block">Let’s talk about</span>
  <span className="line block">what you’re building.</span>
</h1>


        <p className="reveal mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
          Whether it’s a product, platform, or idea —  
          we help you turn it into something real.
        </p>
      </section>

      {/* CONTENT */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* LEFT – MESSAGE FORM */}
        <div className="reveal bg-white/70 backdrop-blur-xl rounded-[32px] p-10 shadow-[0_40px_120px_rgba(0,0,0,0.08)]">
          {!sent ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="space-y-6"
            >
              <p className="text-black text-sm">
                Start the conversation 👋
              </p>

              <div className="chat-bubble text-black">
                Hi, I’m  
                <input required placeholder="your name" />
              </div>

              <div className="chat-bubble text-black">
                You can reach me at  
                <input required type="email" placeholder="email address" />
              </div>

              <div className="chat-bubble text-black  ">
                I’m looking for help with  
                <select>
                  <option>Custom Software</option>
                  <option>Web / App Development</option>
                  <option>Branding & Design</option>
                  <option>Digital Marketing</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="chat-bubble text-black">
                Here’s a bit more detail  
                <textarea rows={3} placeholder="Tell us about your idea…" />
              </div>

              <button className="primary-btn w-full mt-6">
                Send message →
              </button>
            </form>
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

        {/* RIGHT – TRUST */}
      {/* RIGHT – PREMIUM INFO */}
<div className="reveal flex flex-col gap-10">

  {/* PROCESS */}
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

  {/* TRUST */}
  <div className="glass-card">
    <h3 className="section-title">Why work with us</h3>

    <ul className="trust-list">
      <li>✔ Product-focused engineering</li>
      <li>✔ Clear communication</li>
      <li>✔ Scalable, future-ready solutions</li>
      <li>✔ Long-term support mindset</li>
    </ul>
  </div>

  {/* CONTACT */}
  <div className="soft-contact">
    <p>Prefer a direct conversation?</p>

    <div className="contact-row">
      <span>📧</span>
      <span>hello@yourcompany.com</span>
    </div>
    <div className="contact-row">
      <span>📞</span>
      <span>+91 00000 00000</span>
    </div>
  </div>

</div>

      </section>

      {/* STYLES */}
      <style jsx>{`
        .chat-bubble {
          background: #ffffff;
          border-radius: 18px;
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 14px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.06);
        }

        .chat-bubble input,
        .chat-bubble textarea,
        .chat-bubble select {
          border: none;
          outline: none;
          font-size: 15px;
          padding: 6px 0;
          background: transparent;
        }

        .primary-btn {
          background: linear-gradient(90deg, #1f6fe6, #0b2a5f);
          color: white;
          padding: 14px 24px;
          border-radius: 999px;
          font-weight: 700;
          box-shadow: 0 20px 60px rgba(31, 111, 230, 0.35);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .primary-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 30px 80px rgba(31, 111, 230, 0.45);
        }

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
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #334155;
}
/* Text color */
.chat-bubble input,
.chat-bubble textarea,
.chat-bubble select {
  color: #0b2a5f; /* dark professional navy */
}

/* Placeholder color */
.chat-bubble input::placeholder,
.chat-bubble textarea::placeholder {
  color: #64748b; /* slate gray */
  opacity: 1; /* IMPORTANT for Safari */
}

/* Select dropdown arrow color (optional polish) */
.chat-bubble select {
  color: #0b2a5f;
}

      `}</style>
    </main>
  );
}

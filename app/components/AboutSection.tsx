// frontend/components/About.tsx
'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function About() {
  const wrapRef = useRef<HTMLElement | null>(null);
  const topCurveRef = useRef<SVGPathElement | null>(null);
  const bottomCurveRef = useRef<SVGPathElement | null>(null);
  const imageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduce) {
      // immediate reveal for reduced-motion users
      const elems = wrapRef.current?.querySelectorAll<HTMLElement>('.about-reveal') ?? [];
      elems.forEach((el) => (el.style.opacity = '1'));
      if (topCurveRef.current) { topCurveRef.current.style.strokeDashoffset = '0'; }
      if (bottomCurveRef.current) { bottomCurveRef.current.style.strokeDashoffset = '0'; }
      return;
    }

    const ctx = gsap.context(() => {
      // reveal blocks with scroll
      const reveals = gsap.utils.toArray<HTMLElement>('.about-reveal');
      gsap.set(reveals, { autoAlpha: 0, y: 18 });
      reveals.forEach((el) => {
        gsap.to(el, {
          autoAlpha: 1,
          y: 0,
          duration: 0.75,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 86%',
            toggleActions: 'play none none reverse',
          },
        });
      });

      // top curve draw
      if (topCurveRef.current && wrapRef.current) {
        const len = topCurveRef.current.getTotalLength();
        topCurveRef.current.style.strokeDasharray = `${len}`;
        topCurveRef.current.style.strokeDashoffset = `${len}`;
        gsap.to(topCurveRef.current, {
          strokeDashoffset: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: wrapRef.current!,
            start: 'top center',
            end: 'bottom top',
            scrub: 0.7,
            invalidateOnRefresh: true,
          },
        });
      }

      // bottom curve draw
      if (bottomCurveRef.current && wrapRef.current) {
        const len = bottomCurveRef.current.getTotalLength();
        bottomCurveRef.current.style.strokeDasharray = `${len}`;
        bottomCurveRef.current.style.strokeDashoffset = `${len}`;
        gsap.to(bottomCurveRef.current, {
          strokeDashoffset: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: wrapRef.current!,
            start: 'top center',
            end: 'bottom top',
            scrub: 0.7,
            invalidateOnRefresh: true,
          },
        });
      }

      // image parallax (subtle)
      if (imageRef.current && wrapRef.current) {
        gsap.fromTo(
          imageRef.current,
          { yPercent: -10, rotate: -5 },
          {
            yPercent: 10,
            rotate: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: wrapRef.current!,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.7,
              invalidateOnRefresh: true,
            },
          }
        );
      }

      // features cards cascade
      const cards = gsap.utils.toArray<HTMLElement>('.feature-card');
      gsap.set(cards, { autoAlpha: 0, y: 10, scale: 0.995 });
      gsap.to(cards, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.12,
        scrollTrigger: {
          trigger: '.features-grid',
          start: 'top 80%',
          end: 'bottom 60%',
          toggleActions: 'play none none reverse',
        },
      });

      // stats micro-pop
      const stats = gsap.utils.toArray<HTMLElement>('.stat');
      gsap.set(stats, { autoAlpha: 0, y: 8 });
      gsap.to(stats, {
        autoAlpha: 1,
        y: 0,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.08,
        scrollTrigger: {
          trigger: '.stats-row',
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      });

      // "How we work" steps reveal + connector draw
      const steps = gsap.utils.toArray<HTMLElement>('.how-step');
      gsap.set(steps, { autoAlpha: 0, y: 12 });
      gsap.to(steps, {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.14,
        scrollTrigger: {
          trigger: '#how-we-work',
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      });

      const conn = document.querySelector<SVGPathElement>('.connector-path');
      if (conn) {
        const len = conn.getTotalLength();
        conn.style.strokeDasharray = `${len}`;
        conn.style.strokeDashoffset = `${len}`;
        gsap.to(conn, {
          strokeDashoffset: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: '#how-we-work',
            start: 'top 90%',
            end: 'bottom top',
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });
      }
    }, wrapRef);

    return () => {
      try { ctx.revert(); } catch {}
      try { ScrollTrigger.getAll().forEach((t) => t.kill()); } catch {}
    };
  }, []);

  return (
    <section ref={wrapRef} id="about" aria-label="About INTA" className="relative bg-white text-slate-900 py-20 overflow-hidden">
      <div className="container mx-auto px-20">
        {/* intro */}
        <div className="relative grid lg:grid-cols-12 gap-12 items-center py-12 about-reveal">
          {/* top full-bleed curve */}
         

          {/* bottom-right accent curve */}
          <svg className="absolute right-0 bottom-0 w-[60%] h-[45%] pointer-events-none transform translate-x-10 translate-y-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" preserveAspectRatio="none" aria-hidden>
            <path ref={bottomCurveRef} d="M600,350 C520,220 420,140 200,120" fill="none" stroke="#1f6fe6" strokeWidth="2.8" strokeLinecap="round" opacity="0.24" />
          </svg>

          {/* left: number + tilted image */}
          <div className="lg:col-span-6 flex flex-col lg:flex-row items-center justify-center gap-8 relative z-10">
            <div className="text-center lg:text-left about-reveal z-10">
              <div className="text-sm font-semibold tracking-wider text-slate-700 mb-1">YEARS OF EXPERIENCE</div>
              <div className="text-[6rem] md:text-[7rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6] leading-none">
                8<span className="text-[#1f6fe6] align-top text-[3rem]">+</span>
              </div>
            </div>

            <div ref={imageRef} className="relative transform -rotate-5 rounded-2xl overflow-hidden shadow-elev about-reveal z-10">
              <Image
                src="/about/inta-lobby.png"
                alt="INTA Office Lobby"
                width={520}
                height={600}
                className="object-cover rounded-2xl"
                priority
              />
            </div>
          </div>

          {/* right: text content */}
          <div className="lg:col-span-6 space-y-5 z-10">
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900">What We Do</h2>
            <p className="text-lg text-slate-700 leading-relaxed">
              We are a team of web and mobile app developers delivering high-quality, scalable
              digital products. Over the years, we’ve evolved alongside technology—merging design,
              data, and engineering to build systems that empower businesses and elevate user
              experiences.
            </p>
            <p className="text-lg text-slate-700 leading-relaxed">
              Our focus is on crafting reliable web applications, custom digital solutions,
              and enterprise systems that grow with your vision.
            </p>

            <div className="pt-4">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6] text-white px-6 py-3 font-semibold shadow-md hover:brightness-110 transition"
              >
                Our Story
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* features */}
        <div className="mt-16 features-grid">
          <div className="grid md:grid-cols-3 gap-6">
            <article className="feature-card rounded-xl p-6 bg-white border border-slate-100 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-md bg-gradient-to-tr from-[#0b2a5f] to-[#1f6fe6] flex items-center justify-center text-white">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2v20" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <div>
                  <h5 className="font-semibold text-slate-900">Design System</h5>
                  <p className="text-sm text-slate-600 mt-1">Reusable components and tokenized styles for faster, consistent builds.</p>
                </div>
              </div>
            </article>

            <article className="feature-card rounded-xl p-6 bg-white border border-slate-100 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-md bg-gradient-to-tr from-[#0b2a5f] to-[#1f6fe6] flex items-center justify-center text-white">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 12h18" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <div>
                  <h5 className="font-semibold text-slate-900">Scalable Apps</h5>
                  <p className="text-sm text-slate-600 mt-1">Architecture designed for scale and maintainability — testing & CI included.</p>
                </div>
              </div>
            </article>

            <article className="feature-card rounded-xl p-6 bg-white border border-slate-100 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-md bg-gradient-to-tr from-[#0b2a5f] to-[#1f6fe6] flex items-center justify-center text-white">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 9h-5l-2 9-2-9H5l7-9z" stroke="white" strokeWidth="1.2" strokeLinecap="round"/></svg>
                </div>
                <div>
                  <h5 className="font-semibold text-slate-900">Data & Insights</h5>
                  <p className="text-sm text-slate-600 mt-1">User behaviour and analytics integrated from day one to inform product decisions.</p>
                </div>
              </div>
            </article>
          </div>
        </div>

        {/* stats strip */}
        <div className="mt-12 stats-row bg-slate-50 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="stat text-center md:text-left">
            <div className="text-2xl font-extrabold text-slate-900">120+</div>
            <div className="text-sm text-slate-600">Projects delivered</div>
          </div>
          <div className="stat text-center">
            <div className="text-2xl font-extrabold text-slate-900">45</div>
            <div className="text-sm text-slate-600">Two-sided teams</div>
          </div>
          <div className="stat text-center md:text-right">
            <div className="text-2xl font-extrabold text-slate-900">98%</div>
            <div className="text-sm text-slate-600">Client satisfaction</div>
          </div>
        </div>

        {/* timeline / values */}
        <div className="mt-14 grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 about-reveal">
            <h4 className="text-xl font-semibold mb-3">How we work</h4>
            <ol className="space-y-6 text-slate-700">
              <li>
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-inta-500/10 text-inta-500 flex items-center justify-center font-semibold">1</div>
                  <div>
                    <div className="font-semibold text-slate-900">Discover</div>
                    <div className="text-sm text-slate-600">Research, stakeholder interviews and rapid discovery workshops.</div>
                  </div>
                </div>
              </li>

              <li>
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-inta-500/10 text-inta-500 flex items-center justify-center font-semibold">2</div>
                  <div>
                    <div className="font-semibold text-slate-900">Design</div>
                    <div className="text-sm text-slate-600">Wireframes, prototypes and design systems for rapid validation.</div>
                  </div>
                </div>
              </li>

              <li>
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-inta-500/10 text-inta-500 flex items-center justify-center font-semibold">3</div>
                  <div>
                    <div className="font-semibold text-slate-900">Deliver</div>
                    <div className="text-sm text-slate-600">Engineering, testing, and operational handoff with observability.</div>
                  </div>
                </div>
              </li>
            </ol>
          </div>

          <aside className="about-reveal bg-gradient-to-br from-[#0b2a5f] to-[#1f6fe6] text-white rounded-2xl p-6 shadow-elev">
            <h5 className="font-semibold mb-2">Our values</h5>
            <ul className="space-y-3 text-sm">
              <li>Product clarity over feature clutter</li>
              <li>Empathy with users & teams</li>
              <li>Relentless quality and ownership</li>
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}

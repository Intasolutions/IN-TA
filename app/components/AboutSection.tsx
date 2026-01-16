// frontend/components/About.tsx
'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReveal } from '../context/RevealContext';

gsap.registerPlugin(ScrollTrigger);

// Refresh HMR
export default function About() {
  const wrapRef = useRef<HTMLElement | null>(null);
  const topCurveRef = useRef<SVGPathElement | null>(null);
  const bottomCurveRef = useRef<SVGPathElement | null>(null);
  const imageRef = useRef<HTMLDivElement | null>(null);
  const asideRef = useRef<HTMLDivElement | null>(null);
  const { isRevealed } = useReveal();

  useEffect(() => {
    if (typeof window === 'undefined' || !isRevealed) return;
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduce) {
      // immediate reveal for reduced-motion users
      const elems = wrapRef.current?.querySelectorAll<HTMLElement>('.about-reveal') ?? [];
      elems.forEach((el) => (el.style.opacity = '1'));
      if (topCurveRef.current) { topCurveRef.current.style.strokeDashoffset = '0'; }
      if (bottomCurveRef.current) { bottomCurveRef.current.style.strokeDashoffset = '0'; }

      // place aside at final position immediately
      if (wrapRef.current && asideRef.current) {
        const wrapRect = wrapRef.current.getBoundingClientRect();
        const asideRect = asideRef.current.getBoundingClientRect();
        const finalY = (wrapRect.top + wrapRect.height) - (asideRect.top + asideRect.height);
        asideRef.current.style.transform = `translateY(${finalY}px)`;
      }
      return;
    }

    const ctx = gsap.context(() => {
      // reveal blocks with scroll (keeps original behavior)
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
          { yPercent: -10, rotate: -4 },
          {
            yPercent: 8,
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

      // "How we work" steps reveal (block)
      const steps = gsap.utils.toArray<HTMLElement>('.how-step');
      gsap.set(steps, { autoAlpha: 0, y: 10 });
      gsap.to(steps, {
        autoAlpha: 1,
        y: 0,
        duration: 0.75,
        ease: 'power3.out',
        stagger: 0.12,
        scrollTrigger: {
          trigger: '#how-we-work',
          start: 'top 86%',
          toggleActions: 'play none none reverse',
        },
      });

      // How We Work title: keep it crisp and visible
      const howTitle = document.querySelector('.how-title');
      if (howTitle) {
        gsap.fromTo(
          howTitle,
          { autoAlpha: 0, y: 22 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: howTitle,
              start: 'top 86%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }



      // Label animation (Discover / Design / Deliver) — subtle scale + y
      const labels = gsap.utils.toArray<HTMLElement>('.how-label');
      gsap.set(labels, { autoAlpha: 0, y: 10, scale: 0.985 });
      gsap.to(labels, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        ease: 'power3.out',
        stagger: 0.16,
        scrollTrigger: {
          trigger: '#how-we-work',
          start: 'top 82%',
          toggleActions: 'play none none reverse',
        },
      });

      // -------- Microtext letter-by-letter animation (refined) --------
      const microTexts = gsap.utils.toArray<HTMLElement>('.how-micro');

      microTexts.forEach((el) => {
        // avoid double-splitting on refresh
        if ((el as HTMLElement).dataset.split === 'true') return;

        const raw = el.textContent || '';
        // trim then preserve spaces
        const chars = Array.from(raw);
        const wrapped = chars
          .map((ch) => {
            if (ch === '\n') return '<br />';
            if (ch === ' ') return '<span class="how-char inline-block mr-[0.17ch]">&nbsp;</span>';
            // inline-block so transforms are smooth
            return `<span class="how-char inline-block">${ch}</span>`;
          })
          .join('');
        el.innerHTML = wrapped;
        (el as HTMLElement).dataset.split = 'true';
      });

      const allChars = gsap.utils.toArray<HTMLElement>('.how-micro .how-char');
      gsap.set(allChars, { autoAlpha: 0, y: 6 });

      gsap.to(allChars, {
        autoAlpha: 1,
        y: 0,
        duration: 0.42,
        ease: 'power3.out',
        stagger: {
          each: 0.022, // slightly slower for a polished read
          from: 'start',
        },
        scrollTrigger: {
          trigger: '#how-we-work',
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      });
      // ------------------------------------------------------

      // "connector-path" kept if you add SVG later
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

      // Aside slide-to-bottom (no pin)
      if (wrapRef.current && asideRef.current) {
        gsap.set(asideRef.current, { y: 0 });

        gsap.to(asideRef.current, {
          y: () => {
            if (!wrapRef.current || !asideRef.current) return 0;
            const wrapRect = wrapRef.current.getBoundingClientRect();
            const asideRect = asideRef.current.getBoundingClientRect();
            const finalY = (wrapRect.top + wrapRect.height) - (asideRect.top + asideRect.height);
            return Math.max(finalY, 0);
          },
          ease: 'none',
          scrollTrigger: {
            trigger: wrapRef.current!,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.7,
            invalidateOnRefresh: true,
          },
        });
      }
    }, wrapRef);

    return () => {
      try { ctx.revert(); } catch { }
      try { ScrollTrigger.getAll().forEach((t) => t.kill()); } catch { }
    };
  }, [isRevealed]);

  return (
    <section
      ref={wrapRef}
      id="about"
      aria-label="About INTA"
      className="relative bg-[#f9f8f6] text-slate-900 py-20 overflow-hidden rounded-t-4xl -mt-20"
    >
      <div className="container mx-auto px-20 ">
        {/* intro */}
        <div className="relative grid lg:grid-cols-12 gap-12 items-center py-40 about-reveal">
          {/* bottom-right accent curve */}
          <svg
            className="absolute right-0 bottom-0 w-[70%] h-[45%] pointer-events-none transform translate-x-10 translate-y-10"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 600 400"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              ref={bottomCurveRef}
              d="M600,350 C520,220 420,140 200,120"
              fill="none"
              stroke="#1f6fe6"
              strokeWidth="2.8"
              strokeLinecap="round"
              opacity="0.24"
            />
          </svg>

          {/* left: number + tilted image */}
          <div className="lg:col-span-6 flex flex-col lg:flex-row items-center justify-center gap-8 relative z-10">
            <div className="text-center lg:text-left about-reveal z-10">
              <div className="text-sm font-bold tracking-[0.2em] text-slate-500 mb-1 uppercase">
                Professional Milestone
              </div>
              <div className="text-[6rem] md:text-[7rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6] leading-none">
                2
                <span className="text-[#1f6fe6] align-top text-[3rem]">+</span>
              </div>
              <p className="text-slate-600 font-medium mt-2">
                Years of Engineering Excellence
              </p>
            </div>

            <div
              ref={imageRef}
              className="relative transform -rotate-5 rounded-2xl overflow-hidden shadow-elev about-reveal z-10"
            >
              <Image
                src="/about/inta-lobby.png"
                alt="INTA Office Lobby"
                width={520}
                height={1000}
                className="object-cover rounded-2xl"
                priority
              />
            </div>
          </div>

          {/* right: text content */}
          <div className="lg:col-span-6 space-y-5 z-10">
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              Engineering Digital Excellence
            </h2>
            <p className="text-lg text-slate-700 leading-relaxed mt-4">
              We are a specialized team of architects and developers dedicated to deploying
              scalable, high-performance digital products. By integrating cutting-edge design
              with robust engineering, we build intelligent systems that empower enterprises
              and redefine user engagement.
            </p>
            <p className="text-lg text-slate-700 leading-relaxed mt-4">
              Our expertise lies in architecting reliable web ecosystems and custom enterprise
              solutions designed to evolve in lockstep with your business ambitions.
            </p>

            <div className="pt-4">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6] text-white px-6 py-3 font-semibold shadow-md hover:brightness-110 transition"
              >
                Our Story
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* features */}
        <div className="mt-16 features-grid">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <article className="feature-card rounded-xl p-6 bg-white border border-slate-100 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-md bg-gradient-to-tr from-[#0b2a5f] to-[#1f6fe6] flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2v20" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <h5 className="font-bold text-slate-900">Strategic Design Systems</h5>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Accelerating deployment through modular frameworks to ensure visual consistency across your digital ecosystem.
                  </p>
                </div>
              </div>
            </article>

            {/* Card 2 */}
            <article className="feature-card rounded-xl p-6 bg-white border border-slate-100 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-md bg-gradient-to-tr from-[#0b2a5f] to-[#1f6fe6] flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M3 12h18" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <h5 className="font-bold text-slate-900">Enterprise Architecture</h5>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Engineered for high-load performance and long-term maintainability with automated CI/CD workflows.
                  </p>
                </div>
              </div>
            </article>

            {/* Card 3 */}
            <article className="feature-card rounded-xl p-6 bg-white border border-slate-100 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-md bg-gradient-to-tr from-[#0b2a5f] to-[#1f6fe6] flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3l7 9h-5l-2 9-2-9H5l7-9z" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <h5 className="font-bold text-slate-900">Data-Driven Intelligence</h5>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Integrated behavioral analytics to provide actionable insights and drive informed strategic product decisions.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>

        {/* stats strip */}
        <div className="mt-12 stats-row bg-slate-50 rounded-2xl p-6 flex flex-row items-center justify-center gap-12 md:gap-24">
          <div className="stat text-center">
            <div className="text-2xl md:text-3xl font-extrabold text-slate-900">20+</div>
            <div className="text-xs md:text-sm font-semibold text-slate-600 uppercase tracking-wide">
              Projects Delivered
            </div>
          </div>

          {/* Vertical Divider for a professional touch */}
          <div className="w-px h-10 bg-slate-200"></div>

          <div className="stat text-center">
            <div className="text-2xl md:text-3xl font-extrabold text-slate-900">100%</div>
            <div className="text-xs md:text-sm font-semibold text-slate-600 uppercase tracking-wide">
              Client Satisfaction
            </div>
          </div>
        </div>

        {/* timeline / values */}
        <div className="mt-14 grid lg:grid-cols-3 gap-8 items-start">

          {/* HOW WE WORK + spotlight */}
          <div className="lg:col-span-2 about-reveal relative" id="how-we-work">


            <div className="relative">
              <h4 className="how-title text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6] mb-6 leading-tight">
                How We Work
              </h4>

              <div className="relative pl-6 border-l-2 border-slate-200 space-y-10 how-steps">
                {/* Step 1 */}
                <div className="flex items-start gap-4 how-step">
                  <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-[#0b2a5f] to-[#1f6fe6] text-white flex items-center justify-center font-bold shadow-md">
                    1
                  </div>
                  <div>
                    {/* Labels + micro text now light color for contrast */}
                    <div className="how-label font-semibold text-xl text-slate-900">Discover</div>
                    <p className="how-micro text-slate-600 mt-1">
                      Research, stakeholder interviews and rapid discovery workshops.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-4 how-step">
                  <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-[#0b2a5f] to-[#1f6fe6] text-white flex items-center justify-center font-bold shadow-md">
                    2
                  </div>
                  <div>
                    <div className="how-label font-semibold text-xl text-slate-900">Design</div>
                    <p className="how-micro text-slate-600 mt-1">
                      Wireframes, prototypes and design systems for rapid validation.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-4 how-step">
                  <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-[#0b2a5f] to-[#1f6fe6] text-white flex items-center justify-center font-bold shadow-md">
                    3
                  </div>
                  <div>
                    <div className="how-label font-semibold text-xl text-slate-900">Deliver</div>
                    <p className="how-micro text-slate-600 mt-1">
                      Engineering, testing, and operational handoff with observability.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Our values aside */}
          <aside
            ref={asideRef}
            className="about-reveal bg-gradient-to-br from-[#0b2a5f] to-[#1f6fe6] text-white rounded-2xl p-6 shadow-elev"
          >
            <h5 className="font-bold mb-4 uppercase tracking-wider text-xs opacity-90">Our Core Values</h5>
            <ul className="space-y-4 text-sm font-medium">
              <li className="flex items-start gap-2">
                <span className="opacity-70">•</span>
                Strategic clarity over feature complexity
              </li>
              <li className="flex items-start gap-2">
                <span className="opacity-70">•</span>
                User-centric empathy & stakeholder alignment
              </li>
              <li className="flex items-start gap-2">
                <span className="opacity-70">•</span>
                Uncompromising quality & end-to-end ownership
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}

// frontend/components/About.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReveal } from '../context/RevealContext';

gsap.registerPlugin(ScrollTrigger);

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
      return;
    }

    const ctx = gsap.context(() => {
      // 1. General Reveal Blocks
      const reveals = gsap.utils.toArray<HTMLElement>('.about-reveal');
      gsap.set(reveals, { autoAlpha: 0, y: 30 }); // Increased Y slightly for mobile drama
      reveals.forEach((el) => {
        gsap.to(el, {
          autoAlpha: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%', // Trigger earlier on mobile
            toggleActions: 'play none none reverse',
          },
        });
      });

      // 2. SVG Curves
      [topCurveRef.current, bottomCurveRef.current].forEach((curve) => {
        if (curve && wrapRef.current) {
          const len = curve.getTotalLength();
          curve.style.strokeDasharray = `${len}`;
          curve.style.strokeDashoffset = `${len}`;
          gsap.to(curve, {
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
      });

      // 3. Image Parallax
      if (imageRef.current && wrapRef.current) {
        gsap.fromTo(
          imageRef.current,
          { yPercent: -5, rotate: -4 }, // Reduced movement for safety
          {
            yPercent: 5,
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

      // 4. Feature Cards Cascade
      const cards = gsap.utils.toArray<HTMLElement>('.feature-card');
      gsap.set(cards, { autoAlpha: 0, y: 20, scale: 0.98 });
      ScrollTrigger.batch(cards, {
        start: 'top 85%',
        onEnter: batch => gsap.to(batch, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          stagger: 0.15,
          duration: 0.8,
          ease: 'power3.out'
        }),
        onLeaveBack: batch => gsap.to(batch, { autoAlpha: 0, y: 20, scale: 0.98 })
      });

      // 5. Stats Pop
      const stats = gsap.utils.toArray<HTMLElement>('.stat');
      gsap.fromTo(stats, 
        { autoAlpha: 0, y: 15 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: '.stats-row',
            start: 'top 85%',
          }
        }
      );

      // 6. "How We Work" Steps
      const steps = gsap.utils.toArray<HTMLElement>('.how-step');
      gsap.fromTo(steps,
        { autoAlpha: 0, x: -10 },
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.6,
          stagger: 0.15,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '#how-we-work',
            start: 'top 80%',
          }
        }
      );



      // 8. Desktop Only: Aside Slide Animation
      // We check window width to ensure we only apply the custom Y translation 
      // when the layout is side-by-side (LG screens).
      if (window.innerWidth >= 1024 && wrapRef.current && asideRef.current) {
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
      ctx.revert();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, [isRevealed]);

  return (
    <section
      ref={wrapRef}
      id="about"
      aria-label="About INTA"
      className="relative bg-[#f9f8f6] text-slate-900 py-16 lg:py-24 overflow-hidden rounded-t-[2.5rem] -mt-10 lg:-mt-20"
    >
      <div className="container mx-auto px-6 md:px-12 lg:px-20">
        
        {/* Intro Grid */}
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-12 items-center py-12 lg:py-20 about-reveal">
          
          {/* Bottom-right Accent Curve (Hidden on mobile to save space/clutter) */}
          <svg
            className="hidden lg:block absolute right-0 bottom-0 w-[70%] h-[45%] pointer-events-none transform translate-x-10 translate-y-10"
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

          {/* Left: Number + Image */}
          <div className="lg:col-span-6 flex flex-col md:flex-row lg:flex-row items-center justify-center gap-8 relative z-10">
            
            <div className="text-center lg:text-left about-reveal z-10">
              <div className="text-xs md:text-sm font-bold tracking-[0.2em] text-slate-500 mb-1 uppercase">
                Professional Milestone
              </div>
              <div className="text-7xl md:text-8xl lg:text-[7rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6] leading-none">
                2
                <span className="text-[#1f6fe6] align-top text-4xl md:text-[3rem]">+</span>
              </div>
              <p className="text-slate-600 font-medium mt-2 text-sm md:text-base">
                Years of Engineering Excellence
              </p>
            </div>

            <div
              ref={imageRef}
              className="relative transform -rotate-3 lg:-rotate-5 rounded-2xl overflow-hidden shadow-elev about-reveal z-10 w-full max-w-sm md:max-w-xs lg:max-w-md mx-auto"
            >
              <Image
                src="/about/inta-lobby.png"
                alt="INTA Office Lobby"
                width={520}
                height={1000}
                className="object-cover w-full h-[350px] md:h-[450px] lg:h-auto rounded-2xl"
                priority
              />
            </div>
          </div>

          {/* Right: Text Content */}
          <div className="lg:col-span-6 space-y-5 z-10 text-center lg:text-left">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Engineering Digital Excellence
            </h2>
            <p className="text-base md:text-lg text-slate-700 leading-relaxed mt-4">
              We are a specialized team of architects and developers dedicated to deploying
              scalable, high-performance digital products. By integrating cutting-edge design
              with robust engineering, we build intelligent systems that empower enterprises
              and redefine user engagement.
            </p>
            <p className="text-base md:text-lg text-slate-700 leading-relaxed mt-4 hidden md:block">
              Our expertise lies in architecting reliable web ecosystems and custom enterprise
              solutions designed to evolve in lockstep with your business ambitions.
            </p>

            <div className="pt-6 flex justify-center lg:justify-start">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6] text-white px-6 py-3 font-semibold shadow-md hover:brightness-110 transition text-sm md:text-base"
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
              </Link>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-8 lg:mt-16 features-grid">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <article className="feature-card rounded-xl p-6 bg-white border border-slate-100 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-md bg-gradient-to-tr from-[#0b2a5f] to-[#1f6fe6] flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2v20" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <h5 className="font-bold text-slate-900">Strategic Design</h5>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed hyphens-auto break-words">
                    Modular frameworks ensuring visual consistency across your digital ecosystem.
                  </p>
                </div>
              </div>
            </article>

            {/* Card 2 */}
            <article className="feature-card rounded-xl p-6 bg-white border border-slate-100 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-md bg-gradient-to-tr from-[#0b2a5f] to-[#1f6fe6] flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M3 12h18" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <h5 className="font-bold text-slate-900">Enterprise Arch.</h5>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed hyphens-auto break-words">
                    Engineered for high-load performance with automated CI/CD workflows.
                  </p>
                </div>
              </div>
            </article>

            {/* Card 3 */}
            <article className="feature-card rounded-xl p-6 bg-white border border-slate-100 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-md bg-gradient-to-tr from-[#0b2a5f] to-[#1f6fe6] flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3l7 9h-5l-2 9-2-9H5l7-9z" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <h5 className="font-bold text-slate-900">Data Intelligence</h5>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed hyphens-auto break-words">
                    Integrated analytics providing actionable insights for strategic decisions.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="mt-8 md:mt-12 stats-row bg-slate-50 rounded-2xl p-6 flex flex-row items-center justify-center gap-8 md:gap-24">
          <div className="stat text-center">
            <div className="text-2xl md:text-3xl font-extrabold text-slate-900">20+</div>
            <div className="text-[10px] md:text-sm font-semibold text-slate-600 uppercase tracking-wide">
              Projects Delivered
            </div>
          </div>

          <div className="w-px h-10 bg-slate-200"></div>

          <div className="stat text-center">
            <div className="text-2xl md:text-3xl font-extrabold text-slate-900">100%</div>
            <div className="text-[10px] md:text-sm font-semibold text-slate-600 uppercase tracking-wide">
              Client Satisfaction
            </div>
          </div>
        </div>

        {/* Timeline / Values */}
        <div className="mt-12 lg:mt-14 grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16 items-start">

          {/* HOW WE WORK */}
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
                    <div className="how-label font-semibold text-xl text-slate-900">Discover</div>
                    <p className="how-micro text-slate-600 mt-1 text-sm md:text-base hyphens-auto break-words">
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
                    <p className="how-micro text-slate-600 mt-1 text-sm md:text-base hyphens-auto break-words">
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
                    <p className="how-micro text-slate-600 mt-1 text-sm md:text-base hyphens-auto break-words">
                      Engineering, testing, and operational handoff with observability.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Our Values Aside */}
          <aside
            ref={asideRef}
            className="about-reveal bg-gradient-to-br from-[#0b2a5f] to-[#1f6fe6] text-white rounded-2xl p-6 shadow-elev w-full"
          >
            <h5 className="font-bold mb-4 uppercase tracking-wider text-xs opacity-90">Our Core Values</h5>
            <ul className="space-y-4 text-sm font-medium">
              <li className="flex items-start gap-2">
                <span className="opacity-70 mt-1">•</span>
                <span>Strategic clarity over feature complexity</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="opacity-70 mt-1">•</span>
                <span>User-centric empathy & stakeholder alignment</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="opacity-70 mt-1">•</span>
                <span>Uncompromising quality & end-to-end ownership</span>
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}
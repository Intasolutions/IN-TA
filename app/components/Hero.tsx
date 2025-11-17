'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type Slide = {
  id: string;
  title: string;       // can contain '\n' for line breaks
  video?: string;
  poster?: string;
  cta?: { text: string; href: string };
};

const SLIDES: Slide[] = [
  {
    id: 's1',
    title: 'UI / UX\nDESIGN',
    video: '/test1.mp4',
    poster: '/videos/slide-1-poster.jpg',
    cta: { text: 'View Projects', href: '#projects' },
  },
  {
    id: 's2',
    title: 'PRODUCT\nDESIGN',
    video: '/test1.mp4',
    poster: '/videos/slide-2-poster.jpg',
    cta: { text: 'See Work', href: '#projects' },
  },
];

export default function HeroSlider({ autoplay = true, interval = 7000 }: { autoplay?: boolean; interval?: number }) {
  const [index, setIndex] = useState(0);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const contentRefs = useRef<Array<HTMLDivElement | null>>([]);
  const headingRefs = useRef<Array<HTMLElement | null>>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const autoplayRef = useRef<number | null>(null);
  const animRefs = useRef<Array<{ intro: gsap.core.Timeline | null; parallax: gsap.core.Tween | null }>>([]);

  const goTo = (i: number) => {
    const from = index;
    const to = ((i % SLIDES.length) + SLIDES.length) % SLIDES.length;
    if (from === to) return;

    const currentSlide = slideRefs.current[from];
    const nextSlide = slideRefs.current[to];
    const currentContent = contentRefs.current[from];
    const nextContent = contentRefs.current[to];

    // preload/play next video
    const nextVid = nextSlide?.querySelector('video') as HTMLVideoElement | null;
    if (nextVid) {
      nextVid.currentTime = 0;
      nextVid.play().catch(() => {});
    }

    if (tlRef.current) { tlRef.current.kill(); tlRef.current = null; }
    const tl = gsap.timeline();
    tlRef.current = tl;

    if (currentSlide) tl.to(currentSlide, { duration: 0.9, autoAlpha: 0, ease: 'power2.out' }, 0);
    if (nextSlide) tl.fromTo(nextSlide, { autoAlpha: 0 }, { duration: 1.0, autoAlpha: 1, ease: 'power2.out' }, 0);

    if (currentContent) tl.to(currentContent, { duration: 0.5, y: -24, autoAlpha: 0, ease: 'power1.in' }, 0);
    if (nextContent) tl.fromTo(nextContent, { y: 18, autoAlpha: 0 }, { duration: 0.8, y: 0, autoAlpha: 1, ease: 'power2.out' }, 0.18);

    setIndex(to);
    setTimeout(() => playIntroForSlide(to), 80);
  };

  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  useEffect(() => {
    if (!autoplay) return;
    if (autoplayRef.current) window.clearInterval(autoplayRef.current);
    autoplayRef.current = window.setInterval(() => goTo(index + 1), interval);
    return () => {
      if (autoplayRef.current) {
        window.clearInterval(autoplayRef.current);
        autoplayRef.current = null;
      }
    };
  }, [index, autoplay, interval]);

  useEffect(() => {
    slideRefs.current.forEach((el, i) => {
      if (!el) return;
      gsap.set(el, { autoAlpha: i === index ? 1 : 0 });
    });
    contentRefs.current.forEach((el, i) => {
      if (!el) return;
      gsap.set(el, { autoAlpha: i === index ? 1 : 0, y: i === index ? 0 : 14 });
    });

    const firstVid = slideRefs.current[index]?.querySelector('video') as HTMLVideoElement | null;
    if (firstVid) firstVid.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // split heading into char spans preserving newlines
  function splitTextToChars(node: HTMLElement) {
    const text = node.textContent ?? '';
    const parts = text.split('\n');
    const frag: string[] = [];
    parts.forEach((part, pi) => {
      const chars = Array.from(part);
      const charSpans = chars.map(c => {
        const safe = c === ' ' ? '&nbsp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c;
        return `<span class="char inline-block opacity-0 translate-y-8">${safe}</span>`;
      }).join('');
      frag.push(`<span class="line inline-block">${charSpans}</span>`);
      if (pi < parts.length - 1) frag.push('<br/>');
    });
    node.innerHTML = frag.join('');
  }

  function playIntroForSlide(i: number) {
    const prefersReduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const heading = headingRefs.current[i];
    if (!heading) return;

    const existingChar = heading.querySelector('.char');
    if (!existingChar) splitTextToChars(heading);

    animRefs.current[i] = animRefs.current[i] || { intro: null, parallax: null };
    if (animRefs.current[i].intro) {
      animRefs.current[i].intro!.kill();
      animRefs.current[i].intro = null;
    }

    if (prefersReduce) {
      heading.querySelectorAll<HTMLElement>('.char').forEach(c => {
        c.style.opacity = '1';
        c.style.transform = 'none';
      });
      return;
    }

    const chars = heading.querySelectorAll<HTMLElement>('.char');
    const introTl = gsap.timeline();
    introTl.to(chars, {
      opacity: 1,
      y: 0,
      duration: 0.75,
      ease: 'power3.out',
      stagger: 0.03,
    });
    animRefs.current[i].intro = introTl;
  }

  // setup per-slide heading split + ScrollTrigger parallax + intro triggers
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // clear previous
    animRefs.current.forEach(a => {
      try { a.intro?.kill(); } catch {}
      try { a.parallax?.kill(); } catch {}
    });
    animRefs.current = [];

    slideRefs.current.forEach((slideEl, i) => {
      const headingEl = contentRefs.current[i]?.querySelector<HTMLElement>('.hero-heading') ?? null;
      headingRefs.current[i] = headingEl;

      if (!headingEl) {
        animRefs.current[i] = { intro: null, parallax: null };
        return;
      }

      // prepare chars
      splitTextToChars(headingEl);

      // intro trigger when content enters view
      const introTrigger = ScrollTrigger.create({
        trigger: contentRefs.current[i] ?? slideEl!,
        start: 'top 80%',
        onEnter: () => playIntroForSlide(i),
      });

      // parallax for heading (scroll scrub)
      let parallaxTween: gsap.core.Tween | null = null;
      if (!prefersReduce) {
        parallaxTween = gsap.to(headingEl, {
          y: 200,

          ease: 'none',
          scrollTrigger: {
            trigger: slideEl ?? contentRefs.current[i],
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
      } else {
        headingEl.style.transform = 'none';
      }

      animRefs.current[i] = { intro: null, parallax: parallaxTween };

      if (i === index) playIntroForSlide(i);

      // cleanup per slide trigger on unmount - ScrollTrigger global cleanup below also handles it
      return () => {
        try { introTrigger.kill(); } catch {}
      };
    });

    return () => {
      try { ScrollTrigger.getAll().forEach(t => t.kill()); } catch {}
      animRefs.current.forEach(a => {
        try { a.intro?.kill(); } catch {}
        try { a.parallax?.kill(); } catch {}
      });
      animRefs.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  useEffect(() => {
    return () => {
      try { tlRef.current?.kill(); } catch {}
      try { animRefs.current.forEach(a => { a.intro?.kill(); a.parallax?.kill(); }); } catch {}
      try { ScrollTrigger.getAll().forEach(t => t.kill()); } catch {}
      if (autoplayRef.current) { window.clearInterval(autoplayRef.current); autoplayRef.current = null; }
    };
  }, []);

  return (
    <section aria-label="Hero slider" className="relative ">
      <div className="relative h-[100vh] min-h-[520px] flex">
        {/* left vision bar */}
        {/* <aside className="hidden lg:flex w-[240px] bg-gradient-to-b from-[#0b2a5f] to-[#1f6fe6] text-white flex-col justify-between p-6 overflow-hidden">
          <div className="mt-auto text-left select-none left-vision">
            {['Reimagining the', 'Future', 'Redefine', 'Possibilities'].map((line, i) => (
              <div key={i} className="vision-line-wrapper">
                <span className="vision-line">{line}</span>
              </div>
            ))}
            <div className="mt-6 text-sm opacity-70">{index + 1} / {SLIDES.length}</div>
          </div>
        </aside> */}

        {/* slides */}
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0">
            {SLIDES.map((s, i) => (
              <div
                key={s.id}
                ref={(el) => (slideRefs.current[i] = el)}
                className="absolute inset-0 w-full h-full flex items-stretch justify-center"
                style={{ willChange: 'opacity, transform' }}
              >
                {/* background */}
                <div className="absolute inset-0">
                  {s.video && (
                    <video
                      className="w-full h-full object-cover hero-video"
                      src={s.video}
                      poster={s.poster}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="auto"
                    />
                  )}
                  {s.poster && (
                    <div className="absolute inset-0 bg-center bg-cover sm:opacity-0" style={{ backgroundImage: `url(${s.poster})` }} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0b2a5f]/70 via-[#1f6fe6]/55 to-[#0b2a5f]/70 mix-blend-multiply" />
                </div>


<div className="relative z-10 flex items-center w-full h-full">
  <div
    ref={(el) => (contentRefs.current[i] = el)}
    className="container mx-auto px-6 py-8 h-full flex items-center"
  >
    <div className="w-full lg:max-w-2xl lg:ml-auto lg:text-right">
      <h2 className="hero-heading text-6xl md:text-7xl lg:text-[4rem] font-extrabold leading-[1.05] text-white whitespace-pre-line">
        {s.title}
      </h2>

      {/* tightened spacing below heading */}
      {/* <div className="mt-5 flex gap-3 justify-center lg:justify-end">
        {s.cta && (
          <Link
            href={s.cta.href}
            className="rounded-full bg-gradient-to-r from-[#0b2a5f] to-[#1f6fe6] text-white px-6 py-3 font-semibold shadow-lg hover:brightness-110 transition"
          >
            {s.cta.text}
          </Link>
        )}
        <Link
          href="#contact"
          className="rounded-full border border-white/30 text-white px-6 py-3 font-semibold hover:bg-white/10 transition"
        >
          Contact Us
        </Link>
      </div> */}
    </div>
  </div>
</div>


              </div>
            ))}
          </div>

          {/* controls */}
          <div className="absolute left-8 top-1/2 transform -translate-y-1/2 z-40 hidden sm:flex flex-col gap-3">
            <button onClick={prev} aria-label="Previous" className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center hover:bg-black/60 transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button onClick={next} aria-label="Next" className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center hover:bg-black/60 transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 6l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* pagination dots */}
          <div className="absolute left-1/2 transform -translate-x-1/2 bottom-8 z-40 flex gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`w-3 h-3 rounded-full transition-all ${i === index ? 'bg-white scale-110' : 'bg-white/40'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

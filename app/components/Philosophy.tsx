'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Icon from './Icon';
import Scramble from './Scramble';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// "How We Work" + core values, taken from IN-TA's existing site copy
const STEPS = [
  {
    tag: 'Discover',
    icon: 'travel_explore',
    title: 'Strategy before screens',
    body: 'Research, stakeholder interviews and rapid discovery workshops turn your goals into a clear, research-backed roadmap, so we build the right thing first.',
    output: 'Roadmap · Scope · Estimate',
    value: 'Clarity over complexity',
  },
  {
    tag: 'Design',
    icon: 'design_services',
    title: 'Prototypes you can click',
    body: 'Wireframes, interactive prototypes and a shared design system let you validate the product with real users before a line of production code is written.',
    output: 'Wireframes · Prototype · Design system',
    value: 'User-centric',
  },
  {
    tag: 'Engineer',
    icon: 'terminal',
    title: 'Built, tested, handed over',
    body: 'Full-stack engineering with automated testing, a clean operational handoff and monitoring in place, with the same team supporting you after launch.',
    output: 'Web · Mobile · Cloud',
    value: 'End-to-end ownership',
  },
];

export default function Philosophy() {
  const ref = useRef<HTMLElement>(null);
  // Bumped each time a card becomes active, to replay its tag scramble
  const [tagKeys, setTagKeys] = useState(() => STEPS.map(() => 0));

  useGSAP(
    () => {
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const move = (v: number) => (calm ? 0 : v);

      // Reveals use IntersectionObserver: always accurate, even if content above changes height
      const observers: IntersectionObserver[] = [];
      const onceVisible = (el: Element, threshold: number, play: () => void) => {
        const io = new IntersectionObserver(([entry]) => {
          if (!entry.isIntersecting) return;
          play();
          io.disconnect();
        }, { threshold });
        io.observe(el);
        observers.push(io);
      };

      // Heading column
      const intro = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-ph="kicker-line"]', { scaleX: 0, duration: 0.8, ease: 'power3.inOut' }, 0)
        .from('[data-ph="kicker"]', { x: move(-12), autoAlpha: 0, duration: 0.6 }, 0.1)
        .from('[data-ph="line"]', { yPercent: move(110), autoAlpha: calm ? 0 : 1, duration: 1.1, stagger: 0.12 }, 0.15)
        .from('[data-ph="copy"]', { y: move(20), autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0.5)
        .from('[data-ph="status"]', { y: move(24), scale: calm ? 1 : 0.97, autoAlpha: 0, duration: 0.9 }, 0.65);
      onceVisible(ref.current!.querySelector('[data-ph="intro"]')!, 0.15, () => intro.play());

      // Cards slide in as each one comes into view
      const cardEls = gsap.utils.toArray<HTMLElement>('[data-ph="card"]');
      cardEls.forEach((card) => {
        const icon = card.querySelector('[data-ph="icon"]');
        const chips = card.querySelectorAll('[data-ph="chip"]');
        gsap.set(card, { y: move(60), scale: calm ? 1 : 0.97, autoAlpha: 0 });
        gsap.set(icon, { scale: calm ? 1 : 0.4, rotate: move(-90), autoAlpha: 0 });
        gsap.set(chips, { y: move(8), autoAlpha: 0 });
        onceVisible(card, 0.12, () =>
          gsap
            .timeline()
            .to(card, { y: 0, scale: 1, autoAlpha: 1, duration: 1, ease: 'expo.out', clearProps: 'opacity,visibility' })
            .to(icon, { scale: 1, rotate: 0, autoAlpha: 1, duration: 0.8, ease: 'back.out(2)' }, 0.25)
            .to(chips, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.07, ease: 'power3.out' }, 0.4),
        );

        // Big outlined number drifts at its own speed for depth
        if (!calm) {
          gsap.fromTo(
            card.querySelector('[data-ph="watermark"]'),
            { yPercent: 30 },
            { yPercent: -30, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } },
          );
        }
      });

      // A card is "active" while it crosses the middle band of the screen (lights its node + number)
      const active = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            const wasActive = e.target.classList.contains('is-active');
            e.target.classList.toggle('is-active', e.isIntersecting);
            if (e.isIntersecting && !wasActive) {
              const idx = Number((e.target as HTMLElement).dataset.index);
              setTagKeys((keys) => keys.map((k, j) => (j === idx ? k + 1 : k)));
            }
          }),
        { rootMargin: '-45% 0px -45% 0px' },
      );
      cardEls.forEach((c) => active.observe(c));
      observers.push(active);
      const disconnectAll = () => observers.forEach((o) => o.disconnect());

      // Timeline rail fills as you scroll through the cards
      gsap.fromTo(
        '[data-ph="rail-fill"]',
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: { trigger: '[data-ph="cards"]', start: 'top 62%', end: 'bottom 62%', scrub: calm ? true : 0.6 },
        },
      );

      // Desktop: card tilts towards the cursor and a soft glow follows it
      if (!window.matchMedia('(pointer: fine)').matches) return disconnectAll;
      const tilts = cardEls.map((card) => {
        if (!calm) gsap.set(card, { transformPerspective: 1100 });
        return {
          card,
          rx: gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' }),
          ry: gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' }),
        };
      });
      const handlers = tilts.map(({ card, rx, ry }) => {
        const move = (e: PointerEvent) => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          card.style.setProperty('--gx', `${e.clientX - r.left}px`);
          card.style.setProperty('--gy', `${e.clientY - r.top}px`);
          if (calm) return;
          rx((0.5 - py) * 5);
          ry((px - 0.5) * 6);
        };
        const leave = () => { rx(0); ry(0); };
        card.addEventListener('pointermove', move);
        card.addEventListener('pointerleave', leave);
        return () => {
          card.removeEventListener('pointermove', move);
          card.removeEventListener('pointerleave', leave);
        };
      });
      return () => {
        disconnectAll();
        handlers.forEach((off) => off());
      };
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="philosophy" aria-labelledby="philosophy-title" className="max-w-[1520px] mx-auto px-4 sm:px-6 pt-16 sm:pt-20 lg:pt-28 pb-12 sm:pb-16 lg:pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        {/* Thesis column (pinned on desktop) */}
        <div data-ph="intro" className="lg:col-span-5 lg:sticky lg:top-36 h-fit">
          <div className="flex items-center gap-3 mb-5">
            <span data-ph="kicker-line" className="w-6 h-0.5 bg-brand-blue origin-left" />
            <span data-ph="kicker" className="font-mono text-[11px] text-brand-blue tracking-[0.3em] uppercase font-bold">
              Philosophy // How we work
            </span>
          </div>

          <h2
            id="philosophy-title"
            className="font-display font-extrabold text-[length:clamp(2rem,4.2vw,3.4rem)] text-midnight tracking-tight leading-[1.04] uppercase"
          >
            <span className="block overflow-hidden"><span data-ph="line" className="block">We don&apos;t just</span></span>
            <span className="block overflow-hidden"><span data-ph="line" className="block">write code.</span></span>
            <span className="block overflow-hidden pb-[0.12em]">
              {/* Static version of the hero's gradient (only the hero animates); padded so g/p descenders aren't clipped */}
              <span data-ph="line" className="inline-block pr-1 pb-[0.14em] font-serif italic font-light normal-case bg-linear-to-r from-brand-blue via-[#2563eb] to-[#3b7bf7] bg-clip-text text-transparent">
                We engineer products that last.
              </span>
            </span>
          </h2>

          <p data-ph="copy" className="text-midnight/80 text-base leading-relaxed mt-6 max-w-xl">
            Founded by engineers and product designers, IN-TA treats every project as a product, not a ticket. Clear
            strategy first, careful design next, then engineering built to grow with your business.
          </p>
          <Link
            data-ph="copy"
            href="/about"
            className="group mt-6 inline-flex items-center gap-2 font-mono text-[12px] font-semibold uppercase tracking-wider text-brand-blue"
          >
            <span className="border-b border-brand-blue/30 group-hover:border-brand-blue transition-colors">More about us</span>
            <Icon name="arrow_outward" className="text-[16px] group-hover:rotate-45 transition-transform duration-300" />
          </Link>

          {/* Delivery card */}
          <div
            data-ph="status"
            className="mt-8 p-5 sm:p-6 rounded-2xl bg-white border border-brand-blue/20 shadow-md hover:border-brand-blue transition-colors duration-300 max-w-xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-brand-blue/10">
              <span className="font-mono text-[10px] uppercase tracking-wider text-midnight/60 font-bold">How we deliver</span>
              <span className="px-2.5 py-0.5 rounded bg-canvas border border-brand-blue/30 text-brand-blue font-mono text-[10px] font-bold flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-blue" />
                </span>
                WEEKLY DEMOS
              </span>
            </div>
            <dl className="pt-4 grid grid-cols-2 gap-4 font-mono">
              <div>
                <dt className="text-[10px] text-midnight/50 font-semibold uppercase">Cadence</dt>
                <dd className="text-xs text-midnight font-bold mt-0.5">Weekly sprints</dd>
              </div>
              <div>
                <dt className="text-[10px] text-midnight/50 font-semibold uppercase">Ownership</dt>
                <dd className="text-xs text-brand-blue font-bold mt-0.5">Strategy → Launch</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Process cards on a timeline rail */}
        <ol data-ph="cards" className="lg:col-span-7 relative flex flex-col gap-6 pl-8 sm:pl-12">
          <span aria-hidden="true" className="absolute left-2 sm:left-3 top-2 bottom-2 w-px bg-brand-blue/15">
            <span data-ph="rail-fill" className="absolute inset-0 bg-brand-blue origin-top" />
          </span>

          {STEPS.map((step, i) => (
            <li
              key={step.tag}
              data-ph="card"
              data-index={i}
              className="group relative p-6 sm:p-8 lg:p-10 rounded-3xl bg-white border border-brand-blue/20 shadow-sm transition-[border-color,box-shadow,opacity,scale] duration-500
                hover:border-brand-blue hover:shadow-xl hover:shadow-brand-blue/10
                [&.is-active]:border-brand-blue/60 [&.is-active]:shadow-lg [&.is-active]:shadow-brand-blue/10
                pointer-coarse:opacity-55 pointer-coarse:scale-[0.97] pointer-coarse:[&.is-active]:opacity-100 pointer-coarse:[&.is-active]:scale-100
                pointer-coarse:active:scale-[0.985]"
            >
              {/* Rail node */}
              <span
                aria-hidden="true"
                className="absolute top-10 -left-6 sm:-left-9 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-brand-blue bg-canvas transition-[background-color,scale] duration-300 group-[.is-active]:bg-brand-blue group-[.is-active]:scale-125"
              />

              {/* Decorative layer, clipped to the card: watermark number, cursor glow, top light trace */}
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-3xl overflow-hidden">
                <span
                  data-ph="watermark"
                  className="absolute -right-2 bottom-0 font-display font-extrabold leading-none text-[length:clamp(7rem,14vw,11rem)] text-transparent [-webkit-text-stroke:1.5px_rgb(1_68_181/0.09)] transition-[-webkit-text-stroke-color] duration-500 group-[.is-active]:[-webkit-text-stroke-color:rgb(1_68_181/0.16)] select-none"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'radial-gradient(380px circle at var(--gx, 50%) var(--gy, 50%), rgb(1 68 181 / 0.06), transparent 70%)' }}
                />
                <span className="absolute top-0 left-8 right-8 h-0.5 rounded-full bg-gradient-to-r from-transparent via-brand-blue to-transparent origin-left scale-x-0 transition-transform duration-700 ease-out group-[.is-active]:scale-x-100 group-hover:scale-x-100" />
              </span>

              <div className="relative flex items-start justify-between gap-4">
                <span className="font-mono text-4xl sm:text-5xl font-extrabold text-brand-blue/25 transition-colors duration-300 group-hover:text-brand-blue group-[.is-active]:text-brand-blue tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex items-center gap-2.5">
                  <span
                    data-ph="icon"
                    aria-hidden="true"
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-canvas border border-brand-blue/30 flex items-center justify-center text-brand-blue transition-colors duration-500 group-hover:bg-brand-blue group-hover:text-white group-[.is-active]:bg-brand-blue group-[.is-active]:text-white"
                  >
                    <Icon
                      name={step.icon}
                      className="text-[22px] sm:text-[24px] transition-transform duration-700 ease-out group-hover:rotate-[360deg] group-[.is-active]:rotate-[360deg]"
                    />
                  </span>
                  <Scramble
                    text={step.tag.toUpperCase()}
                    playKey={tagKeys[i]}
                    duration={550}
                    className="font-mono text-[10px] sm:text-[11px] px-3 sm:px-3.5 py-1 rounded-full bg-canvas text-brand-blue border border-brand-blue/30 tracking-widest font-semibold"
                  />
                </div>
              </div>
              <h3 className="relative font-display text-xl sm:text-2xl font-bold text-midnight mt-5 sm:mt-6 mb-2 tracking-tight uppercase">
                {step.title}
              </h3>
              <p className="relative text-midnight/80 text-sm sm:text-[15px] leading-relaxed max-w-xl">{step.body}</p>
              <div className="relative mt-6 pt-4 border-t border-brand-blue/10 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider">
                <ul aria-label="Output" className="flex flex-wrap items-center gap-1.5">
                  {step.output.split(' · ').map((item) => (
                    <li
                      key={item}
                      data-ph="chip"
                      className="px-2 py-0.5 rounded bg-canvas border border-brand-blue/20 text-midnight/70 font-semibold transition-colors duration-300 group-[.is-active]:border-brand-blue/40 group-[.is-active]:text-midnight"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
                <span className="text-brand-blue font-bold">{step.value}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

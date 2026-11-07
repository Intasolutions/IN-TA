'use client';

import { useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Icon from './Icon';
import { useText } from '../site/SiteContext';
import { accent, listOf } from '../site/site';

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Card = {
  icon: string;
  layout: string; // grid placement per breakpoint
  featured?: boolean;
};

// Each card's look; its words are set in the admin (Site settings > Page wording: Home, capabilities)
const CARDS: Card[] = [
  {
    icon: 'neurology',
    layout: 'md:col-span-2 lg:col-span-8',
    featured: true,
  },
  {
    icon: 'code',
    layout: 'lg:col-span-4',
  },
  {
    icon: 'domain',
    layout: 'lg:col-span-4',
  },
  {
    icon: 'devices',
    layout: 'lg:col-span-4',
  },
  {
    icon: 'speed',
    layout: 'lg:col-span-4',
  },
];

// Small neural-network drawing for the featured AI card: 3 → 4 → 2 nodes
const NET_LAYERS = [
  [40, [45, 100, 155]],
  [160, [25, 75, 125, 175]],
  [280, [65, 135]],
] as const;
const NET_NODES = NET_LAYERS.flatMap(([x, ys]) => ys.map((y) => [x, y] as const));
const NET_LINKS = NET_LAYERS.slice(0, -1).flatMap(([x1, ys1], li) =>
  ys1.flatMap((y1) => NET_LAYERS[li + 1][1].map((y2) => `M${x1} ${y1} L${NET_LAYERS[li + 1][0]} ${y2}`)),
);

// Beside the text on wide screens; as an inline illustration under the text on smaller ones
function NeuralNet({ inline = false }: { inline?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 200"
      className={
        inline
          ? 'lg:hidden pointer-events-none block w-full max-w-[340px] h-auto mt-6 mx-auto opacity-80'
          : 'hidden lg:block pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 w-[32%] max-w-[360px] opacity-75'
      }
    >
      {NET_LINKS.map((d, i) => (
        <path key={i} data-cap="net-link" d={d} pathLength={1} className="fill-none stroke-brand-blue/35 [stroke-dasharray:1] [stroke-dashoffset:1]" strokeWidth={1} />
      ))}
      {NET_NODES.map(([x, y], i) => (
        <circle
          key={i}
          data-cap="net-node"
          cx={x}
          cy={y}
          r={6}
          style={{ transitionDelay: `${i * 45}ms` }}
          className="fill-white stroke-brand-blue [stroke-width:1.5] transition-[fill] duration-300 group-hover:fill-brand-blue group-[.is-active]:fill-brand-blue"
        />
      ))}
    </svg>
  );
}

export default function Capabilities() {
  const t = useText();
  const cards = CARDS.map((card, i) => ({
    ...card,
    track: t(`home_cap${i + 1}_track`),
    title: t(`home_cap${i + 1}_title`),
    body: t(`home_cap${i + 1}_text`),
    tags: listOf(t(`home_cap${i + 1}_tags`)),
  }));
  const [titlePlain, titleBright] = accent(t('home_cap_title'));
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = ref.current!;
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const touch = !window.matchMedia('(pointer: fine)').matches;
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

      // ---- Heading ----
      const header = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-cap="word"]', { yPercent: move(110), autoAlpha: calm ? 0 : 1, duration: 1.1, stagger: 0.1 }, 0.1)
        .from('[data-cap="kicker"]', { y: move(10), autoAlpha: 0, duration: 0.7 }, 0)
        .from('[data-cap="lede"]', { y: move(18), autoAlpha: 0, duration: 0.9 }, 0.35);
      onceVisible(root.querySelector('[data-cap="header"]')!, 0.2, () => header.play());

      // ---- Cards: scroll-driven in both directions ----
      // Each card's motion is tied to its scroll position: it tilts up out of the page and unmasks on the
      // way in, holds, then tips back and fades as it leaves the top. Scrolling up plays it in reverse.
      // Runs on the <li> slot, so the desktop hover tilt (on the inner card) never fights it.
      const cards = gsap.utils.toArray<HTMLElement>('[data-cap="card"]');
      const slots = gsap.utils.toArray<HTMLElement>('[data-cap="slot"]');

      // Cards sharing a row arrive one after another
      const indexInRow = (slot: HTMLElement) =>
        slots.filter((s) => Math.abs(s.offsetTop - slot.offsetTop) < 4 && s.offsetLeft < slot.offsetLeft).length;

      slots.forEach((slot) => {
        const icon = slot.querySelector('[data-cap="icon"]');
        const items = slot.querySelectorAll('[data-cap="item"]');
        const tags = slot.querySelectorAll('[data-cap="tag"]');

        if (calm) {
          // Reduced motion: a simple one-time fade
          gsap.set(slot, { autoAlpha: 0 });
          onceVisible(slot, 0.15, () => gsap.to(slot, { autoAlpha: 1, duration: 0.8 }));
          return;
        }

        // Responsive strength: phones get a gentler tilt/rise. Function values are re-read on every
        // ScrollTrigger refresh (resize / rotation) thanks to invalidateOnRefresh.
        const small = () => window.innerWidth < 768;
        const sheen = slot.querySelector('[data-cap="sheen"]');
        const edge = slot.querySelector('[data-cap="edge"]');

        gsap.set(slot, { transformPerspective: 1200, transformOrigin: '50% 100%', force3D: true });
        gsap
          .timeline({
            scrollTrigger: {
              trigger: slot,
              start: () => `top bottom-=${indexInRow(slot) * 70}`,
              end: 'bottom top',
              // Lenis already smooths the scroll, so only a short catch-up here keeps it tight, not floaty
              scrub: 0.35,
              invalidateOnRefresh: true,
            },
          })
          // in: transform + opacity only (compositor-friendly, no repaints while scrolling)
          .fromTo(
            slot,
            { yPercent: () => (small() ? 9 : 14), rotationX: () => (small() ? 8 : 14), scale: () => (small() ? 0.95 : 0.9), autoAlpha: 0 },
            { yPercent: 0, rotationX: 0, scale: 1, autoAlpha: 1, ease: 'power3.out', duration: 0.3 },
            0,
          )
          .fromTo(icon, { scale: 0.3, rotate: -120, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, ease: 'back.out(2)', duration: 0.16 }, 0.1)
          .fromTo(items, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'power2.out', duration: 0.14, stagger: 0.03 }, 0.12)
          .fromTo(tags, { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'power2.out', duration: 0.1, stagger: 0.02 }, 0.2)
          // glowing edge draws across the top, then a soft light sweeps over the card as it settles
          .fromTo(edge, { scaleX: 0 }, { scaleX: 1, ease: 'power2.out', duration: 0.16 }, 0.16)
          .fromTo(sheen, { xPercent: -120 }, { xPercent: 420, ease: 'power1.inOut', duration: 0.24 }, 0.18)
          // out (top of the screen): tip back and fade, gentler on phones
          .to(
            slot,
            {
              yPercent: () => (small() ? -3 : -6),
              rotationX: () => (small() ? -5 : -10),
              scale: () => (small() ? 0.97 : 0.94),
              autoAlpha: () => (small() ? 0.5 : 0.25),
              ease: 'power1.in',
              duration: 0.22,
            },
            0.78,
          );
      });

      // ---- Scroll: neural network draws itself through the featured card ----
      const featured = root.querySelector('[data-cap="card"][data-featured]');
      if (featured) {
        gsap.to(featured.querySelectorAll('[data-cap="net-link"]'), {
          strokeDashoffset: 0,
          ease: 'none',
          stagger: 0.02,
          scrollTrigger: { trigger: featured, start: 'top 85%', end: 'center 45%', scrub: calm ? true : 0.6 },
        });
        gsap.from(featured.querySelectorAll('[data-cap="net-node"]'), {
          scale: 0,
          transformOrigin: 'center',
          ease: 'back.out(2)',
          stagger: 0.04,
          scrollTrigger: { trigger: featured, start: 'top 80%', end: 'center 50%', scrub: calm ? true : 0.6 },
        });
      }

      // ---- Touch: the card in the middle of the screen becomes "active" ----
      if (touch) {
        const active = new IntersectionObserver(
          (entries) => entries.forEach((e) => e.target.classList.toggle('is-active', e.isIntersecting)),
          { rootMargin: '-42% 0px -42% 0px' },
        );
        cards.forEach((c) => active.observe(c));
        observers.push(active);
        return () => observers.forEach((o) => o.disconnect());
      }

      // ---- Desktop: icons float at their own pace while scrolling ----
      if (!calm) {
        cards.forEach((card) =>
          gsap.fromTo(
            card.querySelector('[data-cap="icon-wrap"]'),
            { y: 10 },
            { y: -10, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } },
          ),
        );
      }

      // ---- Desktop hover: 3D tilt, cursor glow and a border spotlight ----
      const offs = cards.map((card) => {
        const strength = card.hasAttribute('data-featured') ? 0.5 : 1;
        if (!calm) gsap.set(card, { transformPerspective: 1100 });
        const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' });
        const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' });
        const onMove = (e: PointerEvent) => {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--gx', `${e.clientX - r.left}px`);
          card.style.setProperty('--gy', `${e.clientY - r.top}px`);
          if (calm) return;
          rx((0.5 - (e.clientY - r.top) / r.height) * 6 * strength);
          ry(((e.clientX - r.left) / r.width - 0.5) * 7 * strength);
        };
        const onLeave = () => { rx(0); ry(0); };
        card.addEventListener('pointermove', onMove);
        card.addEventListener('pointerleave', onLeave);
        return () => {
          card.removeEventListener('pointermove', onMove);
          card.removeEventListener('pointerleave', onLeave);
        };
      });

      return () => {
        observers.forEach((o) => o.disconnect());
        offs.forEach((off) => off());
      };
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="services" aria-labelledby="capabilities-title" className="max-w-[1520px] mx-auto px-4 sm:px-6 pt-12 sm:pt-16 lg:pt-20 pb-16 sm:pb-20 lg:pb-24">
      {/* Heading */}
      <div data-cap="header" className="flex flex-col md:flex-row md:items-end justify-between gap-5 sm:gap-6 mb-10 sm:mb-14 lg:mb-16">
        <div>
          <span data-cap="kicker" className="font-mono text-[11px] text-brand-blue tracking-[0.3em] uppercase block mb-3 font-bold">
            {t('home_cap_kicker')}
          </span>
          <h2
            id="capabilities-title"
            className="font-display font-extrabold text-[length:clamp(2.25rem,5.4vw,3.75rem)] leading-[1] text-midnight tracking-tight uppercase"
          >
            <span className="inline-block overflow-hidden align-bottom pb-[0.06em]"><span data-cap="word" className="inline-block">{titlePlain}</span></span>{' '}
            <span className="inline-block overflow-hidden align-bottom pb-[0.06em]"><span data-cap="word" className="inline-block pb-[0.06em] bg-linear-to-r from-brand-blue via-[#2563eb] to-[#3b7bf7] bg-clip-text text-transparent">{titleBright}</span></span>
          </h2>
        </div>
        <p data-cap="lede" className="text-midnight/80 max-w-md text-sm sm:text-[15px] leading-relaxed">
          {t('home_cap_text')}
        </p>
      </div>

      {/* Bento grid */}
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-6">
        {cards.map((card, ci) => (
          <li key={ci} data-cap="slot" className={`${card.layout} will-change-transform`}>
            <Link
              href="/services"
              data-cap="card"
              data-featured={card.featured || undefined}
              className={`group relative flex flex-col h-full rounded-3xl bg-white border border-brand-blue/20 shadow-sm
                transition-[border-color,box-shadow,opacity,scale] duration-500
                hover:border-brand-blue/50 hover:shadow-2xl hover:shadow-brand-blue/10
                [&.is-active]:border-brand-blue/50 [&.is-active]:shadow-xl [&.is-active]:shadow-brand-blue/10
                max-md:pointer-coarse:opacity-55 max-md:pointer-coarse:scale-[0.97]
                max-md:pointer-coarse:[&.is-active]:opacity-100 max-md:pointer-coarse:[&.is-active]:scale-100
                pointer-coarse:active:scale-[0.985]
                focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue
                ${card.featured ? 'p-6 sm:p-8 lg:p-12' : 'p-6 sm:p-8'}`}
            >
              {/* Decorative layer clipped to the card: inner glow + border spotlight that follow the cursor */}
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-3xl overflow-hidden">
                {/* Light sweep + glowing top edge, played by the scroll reveal */}
                <span
                  data-cap="sheen"
                  className="absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-[rgb(1_68_181/0.07)] to-transparent"
                  style={{ transform: 'translateX(-120%)' }}
                />
                <span
                  data-cap="edge"
                  className="absolute top-0 inset-x-10 h-0.5 rounded-full bg-linear-to-r from-transparent via-brand-blue to-transparent origin-center"
                  style={{ transform: 'scaleX(0)' }}
                />
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'radial-gradient(420px circle at var(--gx, 50%) var(--gy, 50%), rgb(1 68 181 / 0.07), transparent 70%)' }}
                />
              </span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-3xl p-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'radial-gradient(260px circle at var(--gx, 50%) var(--gy, 50%), rgb(1 68 181 / 0.95), transparent 70%)',
                  WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                }}
              />

              {card.featured && <NeuralNet />}

              <div className={`relative flex flex-col h-full ${card.featured ? 'lg:max-w-[62%]' : ''}`}>
                <div className={`flex items-center justify-between gap-4 ${card.featured ? 'mb-8' : 'mb-6'}`}>
                  <span data-cap="icon-wrap" className="inline-flex">
                    <span
                      data-cap="icon"
                      className={`rounded-2xl bg-canvas border border-brand-blue/30 flex items-center justify-center text-brand-blue shadow-sm
                        transition-[background-color,color,scale] duration-300 group-hover:scale-110 group-hover:bg-brand-blue group-hover:text-white
                        group-[.is-active]:bg-brand-blue group-[.is-active]:text-white
                        ${card.featured ? 'w-14 h-14' : 'w-12 h-12 sm:w-14 sm:h-14'}`}
                    >
                      <Icon
                        name={card.icon}
                        className={`transition-transform duration-700 ease-out group-hover:rotate-[360deg] group-[.is-active]:rotate-[360deg] ${card.featured ? 'text-[30px]' : 'text-[26px] sm:text-[28px]'}`}
                      />
                    </span>
                  </span>
                  {card.featured && (
                    <span data-cap="item" className="font-mono text-[10px] sm:text-xs text-brand-blue uppercase tracking-widest bg-canvas border border-brand-blue/30 px-3 sm:px-3.5 py-1.5 rounded-md font-bold">
                      {card.track}
                    </span>
                  )}
                </div>

                {!card.featured && (
                  <span data-cap="item" className="font-mono text-[11px] sm:text-xs text-brand-blue uppercase tracking-widest block mb-2 font-bold">
                    {card.track}
                  </span>
                )}
                <h3
                  data-cap="item"
                  className={`font-display font-bold text-midnight uppercase tracking-tight transition-colors duration-300 group-hover:text-brand-blue
                    ${card.featured ? 'text-2xl sm:text-3xl mb-4' : 'text-xl sm:text-2xl mb-3'}`}
                >
                  {card.title}
                </h3>
                <p data-cap="item" className={`text-midnight/80 leading-relaxed ${card.featured ? 'text-sm sm:text-base' : 'text-sm'}`}>
                  {card.body}
                </p>
                {card.featured && <NeuralNet inline />}

                <div className="mt-auto pt-6">
                  <div className="pt-5 border-t border-brand-blue/10 flex items-end justify-between gap-4">
                    <ul aria-label="Technologies" className="flex flex-wrap gap-2">
                      {card.tags.map((tag, ti) => (
                        <li
                          key={tag}
                          data-cap="tag"
                          style={{ transitionDelay: `${ti * 40}ms` }}
                          className="px-2.5 sm:px-3 py-1 rounded bg-canvas border border-brand-blue/20 text-midnight font-mono text-[11px] sm:text-xs font-semibold
                            transition-[translate,border-color,color] duration-300 group-hover:-translate-y-0.5 group-hover:border-brand-blue/40 group-hover:text-brand-blue"
                        >
                          {tag}
                        </li>
                      ))}
                    </ul>
                    <span
                      aria-hidden="true"
                      className="shrink-0 w-10 h-10 rounded-full border border-brand-blue/25 flex items-center justify-center text-brand-blue
                        transition-[background-color,color,border-color] duration-300 group-hover:bg-brand-blue group-hover:text-white group-hover:border-brand-blue
                        group-[.is-active]:bg-brand-blue group-[.is-active]:text-white"
                    >
                      <Icon name="arrow_outward" className="text-[18px] transition-transform duration-300 group-hover:rotate-45" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

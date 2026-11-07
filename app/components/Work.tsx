'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Icon from './Icon';
import { useText } from '../site/SiteContext';
import { accent } from '../site/site';

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Project = {
  id: number;
  title: string;
  slug: string;
  role: string;
  summary: string;
  hero: string;
  tags: { name: string; slug: string }[];
  external_url: string;
  featured: boolean;
  order: number;
};

const GALLERY_COUNT = 6;
// Pinned horizontal scrolling only where there's room for it; elsewhere it's a native swipe carousel.
// (Must match the [@media(min-width:1024px)_and_(min-height:640px)] classes in the markup.)
const DESKTOP_QUERY = '(min-width: 1024px) and (min-height: 640px)';
const STATIC_GRADIENT = 'bg-linear-to-r from-brand-blue via-[#2563eb] to-[#3b7bf7] bg-clip-text text-transparent';

// Tags that describe the client's industry (used for the small label above each title)
const INDUSTRY_TAGS = [
  'healthcare-software', 'manufacturing', 'edtech', 'education', 'e-commerce', 'online-retail',
  'property-management', 'community', 'professional-education',
];

const hostname = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

function useProjects() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const controller = new AbortController();
    fetch(`${apiBase}/api/portfolio/projects/`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        const list: Project[] = Array.isArray(data) ? data : data.results ?? [];
        list.sort((a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order);
        setProjects(list);
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setFailed(true);
      });
    return () => controller.abort();
  }, []);

  return { projects, failed };
}

const CARD_SIZE =
  // below desktop: narrower so the next card peeks in, height from content; desktop: fills the pinned space
  'w-[80vw] sm:w-[58vw] md:w-[46vw] [@media(min-width:1024px)_and_(min-height:640px)]:w-[min(50vw,860px)] [@media(min-width:1024px)_and_(min-height:640px)]:h-full [@media(min-width:1024px)_and_(min-height:640px)]:min-h-0'

function ProjectCard({ project }: { project: Project }) {
  const host = hostname(project.external_url);
  const isLive = Boolean(host);
  const industry = (project.tags.find((t) => INDUSTRY_TAGS.includes(t.slug)) ?? project.tags[0])?.name ?? '';

  return (
    <li data-g="card" className={`${CARD_SIZE} shrink-0 snap-center will-change-transform`}>
      <a
        href={isLive ? project.external_url : '/portfolio'}
        {...(isLive ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        data-g="inner"
        className="group relative flex h-full w-full flex-col overflow-hidden rounded-3xl bg-midnight text-white shadow-xl shadow-brand-blue/10 will-change-transform
          focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue"
      >
        {/* Screenshot: fitted to the card's full width and pinned to the top, so nothing is cut off at the sides */}
        <span data-g="img" className="relative block w-full aspect-video shrink-0 bg-[#020a33] [@media(min-width:1024px)_and_(min-height:640px)]:absolute [@media(min-width:1024px)_and_(min-height:640px)]:inset-0 [@media(min-width:1024px)_and_(min-height:640px)]:aspect-auto">
          <Image
            src={project.hero}
            alt=""
            fill
            sizes="(min-width: 1024px) 50vw, 90vw"
            className="object-contain object-top"
          />
        </span>
        {/* Gradients only where the text sits, so most of the screenshot stays clear */}
        <span aria-hidden="true" className="hidden [@media(min-width:1024px)_and_(min-height:640px)]:block absolute inset-0 bg-linear-to-t from-midnight from-25% via-midnight/70 via-45% to-transparent to-75%" />
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-20 bg-linear-to-b from-midnight/45 to-transparent" />

        {/* Top row */}
        <span className="absolute top-4 inset-x-4 sm:top-5 sm:inset-x-5 flex items-center justify-end gap-3 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider font-bold">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-midnight/60 border border-white/15 max-w-[60%] truncate">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7fa6ff] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#7fa6ff]" />
              </span>
              <span className="truncate">{host}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-midnight/60 border border-white/15">
              <Icon name="lock" className="text-[12px]" /> Private build
            </span>
          )}
        </span>

        {/* Bottom content */}
        <span className="relative mt-auto w-full p-5 sm:p-7 flex items-end justify-between gap-4">
          <span className="min-w-0">
            {industry && (
              <span className="block font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-[#9dbbff] font-bold mb-2">
                {industry}
              </span>
            )}
            <span className="block overflow-hidden pb-[0.04em]">
              <span data-g="title" className="block font-display font-extrabold uppercase tracking-tight leading-[1.02] text-[1.4rem] sm:text-3xl lg:text-[2.1rem]">
                {project.title}
              </span>
            </span>
            {/* Summary slides up on hover (always visible on touch) */}
            <span
              className="overflow-hidden text-sm text-white/75 leading-relaxed transition-[max-height,opacity,margin] duration-500 ease-out
                max-h-24 mt-3 opacity-100 pointer-fine:max-h-0 pointer-fine:mt-0 pointer-fine:opacity-0
                pointer-fine:group-hover:max-h-24 pointer-fine:group-hover:mt-3 pointer-fine:group-hover:opacity-100 line-clamp-2 sm:line-clamp-3"
            >
              {project.summary}
            </span>
            <span className="mt-4 flex flex-wrap gap-1.5">
              {project.tags.slice(0, 3).map((t, ti) => (
                <span key={t.slug} data-g="tag" className={`px-2 py-0.5 rounded bg-white/10 border border-white/15 font-mono text-[10px] sm:text-[11px] font-semibold ${ti === 2 ? 'max-sm:hidden' : ''}`}>
                  {t.name}
                </span>
              ))}
            </span>
          </span>
          <span data-g="arrow" className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white text-midnight flex items-center justify-center transition-[background-color,color,scale] duration-300 group-hover:bg-brand-blue group-hover:text-white group-hover:scale-110">
            <Icon name="north_east" className="text-[20px] sm:text-[22px] transition-transform duration-300 group-hover:rotate-45" />
          </span>
        </span>
        {/* Dims cards at the edges of the coverflow */}
        <span data-g="dim" aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 rounded-3xl bg-midnight opacity-0" />
        <span className="sr-only">{isLive ? `Visit ${project.title} (opens in a new tab)` : `${project.title}: see the portfolio`}</span>
      </a>
    </li>
  );
}

function SeeAllCard({ projects }: { projects: Project[] }) {
  return (
    <li data-g="card" className={`${CARD_SIZE} shrink-0 snap-center will-change-transform`}>
      <Link
        href="/portfolio"
        data-g="inner"
        className="group relative flex h-full w-full flex-col justify-between overflow-hidden rounded-3xl p-6 sm:p-9 text-white will-change-transform
          bg-[linear-gradient(145deg,#0144b5_0%,#06123f_60%,#01072b_100%)]
          focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -top-28 w-[28rem] h-[28rem] rounded-full transition-transform duration-700 group-hover:scale-125"
          style={{ background: 'radial-gradient(closest-side, rgb(127 166 255 / 0.35), transparent)' }}
        />
        {/* Dims cards at the edges of the coverflow */}
        <span data-g="dim" aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 rounded-3xl bg-midnight opacity-0" />
        <span className="relative font-mono text-[11px] tracking-[0.3em] uppercase text-white/70 font-bold">Portfolio</span>
        <span className="relative">
          <span className="block overflow-hidden pb-[0.04em]">
            <span data-g="title" className="block font-display font-extrabold uppercase tracking-tight leading-[1] text-[length:clamp(2rem,4vw,3.25rem)]">
              See all
              <br />
              case studies
            </span>
          </span>
          <span className="mt-6 flex items-center justify-between gap-4">
            <span className="flex -space-x-3">
              {projects.slice(GALLERY_COUNT, GALLERY_COUNT + 5).map((p, i) => (
                <span
                  key={p.id}
                  className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-[#06123f] bg-white/10 transition-transform duration-300 group-hover:-translate-y-1"
                  style={{ transitionDelay: `${i * 50}ms` }}
                >
                  <Image src={p.hero} alt="" fill sizes="48px" className="object-cover object-top" />
                </span>
              ))}
            </span>
            <span data-g="arrow" className="shrink-0 w-14 h-14 rounded-full bg-white text-brand-blue flex items-center justify-center transition-[scale] duration-300 group-hover:scale-110">
              <Icon name="arrow_outward" className="text-[22px] transition-transform duration-300 group-hover:rotate-45" />
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}

export default function Work() {
  const t = useText();
  const [titlePlain, titleBright] = accent(t('home_work_title'));
  const ref = useRef<HTMLElement>(null);
  // Set by the active (desktop / mobile) animation branch so the buttons know how to move
  const navRef = useRef<((dir: 1 | -1) => void) | null>(null);
  const skipRef = useRef<(() => void) | null>(null);
  const { projects, failed } = useProjects();
  const gallery = projects?.slice(0, GALLERY_COUNT) ?? [];

  // Header reveal
  useGSAP(
    () => {
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const move = (v: number) => (calm ? 0 : v);
      const tl = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-g="kicker"]', { y: move(10), autoAlpha: 0, duration: 0.7 }, 0)
        .from('[data-g="word"]', { yPercent: move(110), autoAlpha: calm ? 0 : 1, duration: 1.1, stagger: 0.1 }, 0.1)
        .from('[data-g="lede"]', { y: move(18), autoAlpha: 0, duration: 0.9 }, 0.35)
        .from('[data-g="meta"]', { y: move(14), autoAlpha: 0, duration: 0.8, stagger: 0.1 }, 0.45);
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        tl.play();
        io.disconnect();
      }, { threshold: 0.2 });
      io.observe(ref.current!.querySelector('[data-g="header"]')!);
      return () => io.disconnect();
    },
    { scope: ref },
  );

  // Gallery motion (needs the cards to exist)
  useGSAP(
    () => {
      if (!projects?.length) return;
      const root = ref.current!;
      const viewport = root.querySelector<HTMLElement>('[data-g="viewport"]')!;
      const track = root.querySelector<HTMLElement>('[data-g="track"]')!;
      const bar = root.querySelector('[data-g="bar"]');
      const head = root.querySelector('[data-g="head"]');
      const cards = gsap.utils.toArray<HTMLElement>('[data-g="card"]');
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const fine = window.matchMedia('(pointer: fine)').matches;
      const setProgress = (p: number) => {
        const v = Math.max(0.02, p);
        gsap.set(bar, { scaleX: v });
        gsap.set(head, { xPercent: v * 100 });
      };
      setProgress(0);

      const mm = gsap.matchMedia();

      // ---- Desktop: pin the section and scroll the track sideways ----
      mm.add(DESKTOP_QUERY, () => {
        const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
        // The track moves ~1.8px per 1px of scroll, so the pinned stretch is about half as long
        const PIN_RATIO = 0.55;
        const skew = gsap.quickTo(cards.map((c) => c.querySelector('[data-g="inner"]')), 'skewX', { duration: 0.4, ease: 'power3.out' });
        let settle: ReturnType<typeof setTimeout>;

        const slide = gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: root.querySelector('[data-g="pin"]'),
            pin: true,
            start: 'top top',
            end: () => `+=${distance() * PIN_RATIO}`,
            scrub: 0.6,
            invalidateOnRefresh: true,
            anticipatePin: 1,
            onUpdate: (self) => {
              setProgress(self.progress);
              if (calm) return;
              // cards lean with scroll speed, then settle
              skew(gsap.utils.clamp(-7, 7, self.getVelocity() / -250));
              clearTimeout(settle);
              settle = setTimeout(() => skew(0), 140);
            },
          },
        });

        const st = slide.scrollTrigger!;
        if (!calm) {
          const pinEl = root.querySelector('[data-g="pin"]');
          gsap
            .timeline({ scrollTrigger: { trigger: pinEl, start: 'top bottom', end: 'top top', scrub: 0.5 } })
            .fromTo(cards, { y: 160, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'power3.out', stagger: 0.12, duration: 0.7 }, 0.15)
            .fromTo(root.querySelector('[data-g="controls"]'), { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'power2.out', duration: 0.4 }, 0.6);
        }
        if (!calm) {
          gsap.fromTo(
            root.querySelector('[data-g="ghost"]'),
            { xPercent: -30 },
            { xPercent: 0, ease: 'none', scrollTrigger: { trigger: root.querySelector('[data-g="pin"]'), start: 'top top', end: () => `+=${distance() * PIN_RATIO}`, scrub: 1, invalidateOnRefresh: true } },
          );
        }
        // Jump card by card: scroll the page to where that card sits at the left edge
        navRef.current = (dir) => {
          const x = -Number(gsap.getProperty(track, 'x'));
          const lefts = cards.map((c) => c.offsetLeft);
          const current = lefts.reduce((best, l, i) => (Math.abs(l - x) < Math.abs(lefts[best] - x) ? i : best), 0);
          const target = gsap.utils.clamp(0, cards.length - 1, current + dir);
          const progress = gsap.utils.clamp(0, 1, lefts[target] / distance());
          window.scrollTo({ top: st.start + (st.end - st.start) * progress, behavior: 'smooth' });
        };
        // Skip lands where the next section begins
        skipRef.current = () =>
          window.scrollTo({ top: root.getBoundingClientRect().bottom + window.scrollY, behavior: 'smooth' });

        if (!calm) {
          cards.forEach((card) => {
            const inner = card.querySelector('[data-g="inner"]');
            // title rises out of its mask, tags pop in, arrow spins in as the card arrives
            gsap
              .timeline({ scrollTrigger: { trigger: card, containerAnimation: slide, start: 'left 92%', end: 'left 50%', scrub: true } })
              .fromTo(card.querySelector('[data-g="title"]'), { yPercent: 105 }, { yPercent: 0, ease: 'power3.out' }, 0)
              .fromTo(card.querySelectorAll('[data-g="tag"]'), { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.08, ease: 'power2.out' }, 0.25)
              .fromTo(card.querySelector('[data-g="arrow"]'), { scale: 0, rotate: -120 }, { scale: 1, rotate: 0, ease: 'back.out(2)' }, 0.35);
            // Coverflow: tied to the card's position, not scroll speed, so it shows even when scrolling slowly.
            // Turned towards the centre on the right, flat through the middle, turned away on the left.
            const dim = card.querySelector('[data-g="dim"]');
            gsap.set(inner, { transformPerspective: 1600, transformOrigin: '50% 50%' });
            gsap
              .timeline({ scrollTrigger: { trigger: card, containerAnimation: slide, start: 'left right', end: 'right left', scrub: true } })
              .fromTo(inner, { rotationY: -30, scale: 0.84 }, { rotationY: 0, scale: 1, ease: 'sine.out', duration: 0.35 }, 0)
              .fromTo(dim, { opacity: 0.55 }, { opacity: 0, ease: 'sine.out', duration: 0.35 }, 0)
              .to(inner, { rotationY: 30, scale: 0.84, ease: 'sine.in', duration: 0.35 }, 0.65)
              .to(dim, { opacity: 0.55, ease: 'sine.in', duration: 0.35 }, 0.65);

          });
        }
        // Magnetic arrow: pulled gently towards the cursor while hovering a card
        const offs: (() => void)[] = [];
        if (fine && !calm) {
          cards.forEach((card) => {
            const inner = card.querySelector<HTMLElement>('[data-g="inner"]')!;
            const arrow = card.querySelector('[data-g="arrow"]');
            const ax = gsap.quickTo(arrow, 'x', { duration: 0.4, ease: 'power3.out' });
            const ay = gsap.quickTo(arrow, 'y', { duration: 0.4, ease: 'power3.out' });
            const move = (e: PointerEvent) => {
              const r = inner.getBoundingClientRect();
              ax(((e.clientX - r.left) / r.width - 0.85) * 26);
              ay(((e.clientY - r.top) / r.height - 0.85) * 26);
            };
            const leave = () => { ax(0); ay(0); };
            inner.addEventListener('pointermove', move);
            inner.addEventListener('pointerleave', leave);
            offs.push(() => {
              inner.removeEventListener('pointermove', move);
              inner.removeEventListener('pointerleave', leave);
            });
          });
        }

        return () => {
          clearTimeout(settle);
          offs.forEach((off) => off());
          navRef.current = null;
          skipRef.current = null;
        };
      });

      // ---- Phones / tablets / short screens: native swipe carousel ----
      mm.add(`not all and ${DESKTOP_QUERY}`, () => {
        const ghost = gsap.quickSetter(root.querySelector('[data-g="ghost"]'), 'xPercent');
        if (!calm) ghost(-30);
        if (!calm) gsap.set(cards, { transformPerspective: 1200, transformOrigin: '50% 50%' });
        // Each card turns, shrinks and dims by how far it is from the centre of the carousel
        const flow = () => {
          if (calm) return;
          const mid = viewport.scrollLeft + viewport.clientWidth / 2;
          cards.forEach((c) => {
            const off = gsap.utils.clamp(-1, 1, (c.offsetLeft + c.offsetWidth / 2 - mid) / viewport.clientWidth);
            gsap.set(c, { rotationY: off * -24, scale: 1 - Math.abs(off) * 0.1, opacity: 1 - Math.abs(off) * 0.45 });
          });
        };
        let frame = 0;
        const onScroll = () => {
          if (frame) return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            const max = viewport.scrollWidth - viewport.clientWidth;
            const p = max > 0 ? viewport.scrollLeft / max : 0;
            setProgress(p);
            if (!calm) ghost(-30 + p * 30);
            flow();
          });
        };
        flow();
        viewport.addEventListener('scroll', onScroll, { passive: true });

        navRef.current = (dir) => {
          const step = cards[0].offsetWidth + parseFloat(getComputedStyle(track).columnGap || '16');
          viewport.scrollBy({ left: dir * step, behavior: 'smooth' });
        };

        if (!calm) {
          gsap.from(cards.map((c) => c.querySelector('[data-g="inner"]')), {
            y: 60, scale: 0.94, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.08,
            scrollTrigger: { trigger: viewport, start: 'top 85%', once: true },
          });
        }

        // Each card's content animates in the first time it's snapped into the centre
        const revealed = new WeakSet<Element>();
        if (!calm) {
          cards.forEach((c) => {
            gsap.set(c.querySelector('[data-g="title"]'), { yPercent: 105 });
            gsap.set(c.querySelectorAll('[data-g="tag"]'), { y: 10, autoAlpha: 0 });
            gsap.set(c.querySelector('[data-g="arrow"]'), { scale: 0, rotate: -120 });
          });
        }
        const focus = new IntersectionObserver(
          (entries) =>
            entries.forEach((e) => {
              if (!e.isIntersecting || calm || revealed.has(e.target)) return;
              revealed.add(e.target);
              gsap
                .timeline({ defaults: { ease: 'expo.out' } })
                .fromTo(e.target.querySelector('[data-g="title"]'), { yPercent: 105 }, { yPercent: 0, duration: 0.9 }, 0.05)
                .fromTo(e.target.querySelectorAll('[data-g="tag"]'), { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.06 }, 0.25)
                .fromTo(e.target.querySelector('[data-g="arrow"]'), { scale: 0, rotate: -120 }, { scale: 1, rotate: 0, duration: 0.7, ease: 'back.out(2)' }, 0.3);
            }),
          { root: viewport, threshold: 0.6 },
        );
        cards.forEach((c) => focus.observe(c));

        return () => {
          viewport.removeEventListener('scroll', onScroll);
          cancelAnimationFrame(frame);
          focus.disconnect();
          navRef.current = null;
        };
      });

      // The pin is created once the projects arrive, often after the sections below (and the footer) set up their
      // scroll effects. Re-order everything by its place on the page so those are measured after the pin's extra length.
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
      return () => mm.revert();
    },
    { scope: ref, dependencies: [projects], revertOnUpdate: true },
  );

  return (
    <section ref={ref} id="work" aria-labelledby="work-title" className="relative overflow-x-clip">
      <div
        data-g="pin"
        className="relative max-w-[1520px] mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-16 sm:pb-20
          [@media(min-width:1024px)_and_(min-height:640px)]:h-screen [@media(min-width:1024px)_and_(min-height:640px)]:flex [@media(min-width:1024px)_and_(min-height:640px)]:flex-col [@media(min-width:1024px)_and_(min-height:640px)]:justify-center
          [@media(min-width:1024px)_and_(min-height:640px)]:pt-16 [@media(min-width:1024px)_and_(min-height:640px)]:pb-5"
      >
        {/* Header, with giant outlined text gliding behind it (nothing covers it there) */}
        <div data-g="header" className="relative z-10 shrink-0 flex flex-col lg:flex-row lg:items-end justify-between gap-5 lg:gap-10 mb-8 sm:mb-10 [@media(min-width:1024px)_and_(min-height:640px)]:mb-3">
          <div aria-hidden="true" className="hidden lg:flex pointer-events-none select-none absolute inset-y-0 -left-4 sm:-left-6 -right-[50vw] items-center -z-10">
            <div
              data-g="ghost"
              className="whitespace-nowrap font-display font-extrabold uppercase leading-none tracking-tight text-[length:clamp(4.5rem,10vw,9rem)] text-transparent [-webkit-text-stroke:1.5px_rgb(1_68_181/0.07)]"
              style={{ transform: 'translateX(-30%)' }}
            >
              Portfolio ✦ Portfolio ✦ Portfolio ✦ Portfolio ✦ Portfolio ✦ Portfolio
            </div>
          </div>
          <div className="max-w-3xl">
            <span data-g="kicker" className="inline-flex items-center gap-3 font-mono text-[11px] text-brand-blue tracking-[0.3em] uppercase font-bold mb-3">
              <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
              {t('home_work_kicker')}
            </span>
            <h2 id="work-title" className="font-display font-extrabold text-[length:clamp(2.25rem,5vw,3.5rem)] leading-[1] text-midnight tracking-tight uppercase">
              <span className="inline-block overflow-hidden align-bottom pb-[0.06em]"><span data-g="word" className="inline-block">{titlePlain}</span></span>{' '}
              <span className="inline-block overflow-hidden align-bottom pb-[0.06em]"><span data-g="word" className={`inline-block pb-[0.06em] ${STATIC_GRADIENT}`}>{titleBright}</span></span>
            </h2>
            <p data-g="lede" className="mt-4 text-midnight/80 text-sm sm:text-base leading-relaxed max-w-2xl">
              {t('home_work_text')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Animate a wrapper: the button's own CSS transition would fight GSAP on the same element */}
            <span data-g="meta" className="inline-flex">
              <Link
                href="/portfolio"
                className="kinetic-cta-btn group inline-flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-brand-blue hover:bg-midnight text-white font-mono text-xs uppercase tracking-wider font-semibold active:scale-[0.97]"
              >
                <span>View all case studies</span>
                <Icon name="arrow_outward" className="text-[16px] transition-transform duration-300 group-hover:rotate-45" />
              </Link>
            </span>
          </div>
        </div>

        {/* Gallery */}
        {failed ? (
          <div className="rounded-3xl border border-brand-blue/20 bg-white p-8 sm:p-10 text-center">
            <p className="text-midnight/80">Our case studies are taking a moment to load.</p>
            <Link href="/portfolio" className="mt-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider font-bold text-brand-blue">
              Open the portfolio <Icon name="arrow_outward" className="text-[16px]" />
            </Link>
          </div>
        ) : (
          <>
            <div
              data-g="viewport"
              className="relative z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto snap-x snap-mandatory scroll-px-4 sm:scroll-px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                [@media(min-width:1024px)_and_(min-height:640px)]:overflow-visible [@media(min-width:1024px)_and_(min-height:640px)]:snap-none [@media(min-width:1024px)_and_(min-height:640px)]:flex-1 [@media(min-width:1024px)_and_(min-height:640px)]:min-h-0 [@media(min-width:1024px)_and_(min-height:640px)]:flex [@media(min-width:1024px)_and_(min-height:640px)]:items-center"
            >
              <ul data-g="track" className="flex w-max gap-4 sm:gap-6 py-2 [@media(min-width:1024px)_and_(min-height:640px)]:h-full [@media(min-width:1024px)_and_(min-height:640px)]:max-h-[760px] [@media(min-width:1024px)_and_(min-height:640px)]:py-2" aria-busy={!projects || undefined}>
                {projects
                  ? (
                    <>
                      {gallery.map((p) => <ProjectCard key={p.id} project={p} />)}
                      <SeeAllCard projects={projects} />
                    </>
                  )
                  : [0, 1, 2].map((i) => (
                    <li key={i} className={`${CARD_SIZE} aspect-[4/5] sm:aspect-[4/3] [@media(min-width:1024px)_and_(min-height:640px)]:aspect-auto shrink-0 rounded-3xl bg-brand-blue/10 animate-pulse`} aria-hidden="true" />
                  ))}
              </ul>
            </div>

            {/* Progress + navigation */}
            <div data-g="controls" className="relative z-10 shrink-0 mt-6 sm:mt-8 [@media(min-width:1024px)_and_(min-height:640px)]:mt-2 flex items-center gap-3 sm:gap-4 font-mono text-[11px] font-bold uppercase tracking-wider text-midnight/70">
              <div className="flex items-center gap-2">
                {[
                  { dir: -1 as const, icon: 'arrow_back', label: 'Previous project' },
                  { dir: 1 as const, icon: 'arrow_forward', label: 'Next project' },
                ].map(({ dir, icon, label }) => (
                  <button
                    key={icon}
                    type="button"
                    aria-label={label}
                    onClick={() => navRef.current?.(dir)}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-brand-blue/30 bg-white text-brand-blue flex items-center justify-center shadow-sm
                      transition-[background-color,color,border-color,scale] duration-300 hover:bg-brand-blue hover:text-white hover:border-brand-blue active:scale-90"
                  >
                    <Icon name={icon} className="text-[18px]" />
                  </button>
                ))}
              </div>
              <span className="relative h-px flex-1 bg-brand-blue/15">
                <span data-g="bar" className="absolute inset-0 bg-brand-blue origin-left" style={{ transform: 'scaleX(0.02)' }} />
                {/* Glowing head that leads the bar */}
                <span data-g="head" aria-hidden="true" className="absolute inset-0 pointer-events-none">
                  <span className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-brand-blue shadow-[0_0_0_4px_rgb(1_68_181/0.15),0_0_14px_rgb(1_68_181/0.7)]" />
                </span>
              </span>
              <button
                type="button"
                onClick={() => skipRef.current?.()}
                className="hidden [@media(min-width:1024px)_and_(min-height:640px)]:inline-flex group items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-white hover:text-brand-blue transition-colors"
              >
                Skip
                <Icon name="south" className="text-[14px] transition-transform duration-300 group-hover:translate-y-0.5" />
              </button>
              <span className="[@media(min-width:1024px)_and_(min-height:640px)]:hidden inline-flex items-center gap-1">
                Swipe <Icon name="arrow_forward" className="text-[14px]" />
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

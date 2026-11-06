'use client';

import { useRef, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Icon from './Icon';
import { IstClock } from './Header';
import { useOfficeStatus } from './OfficeStatus';
import { scrollToTop } from './SmoothScroll';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export const EMAIL = 'info@in-tasolutions.com';
export const PHONE = { href: 'tel:+919447595381', label: '+91 94475 95381' };
export const MAP = 'https://www.google.com/maps/search/?api=1&query=11.8021,76.0232';

const EXPLORE = [
  { name: 'Home', href: '/' },
  { name: 'Work', href: '/portfolio' },
  { name: 'Capabilities', href: '/services' },
  { name: 'About', href: '/about' },
  { name: 'Blog', href: '/blog' },
  { name: 'Contact', href: '/contact' },
];

// Mirrors /api/services/ (title + slug, in their display order) so the footer needs no request of its own
export const SERVICES = [
  { name: 'AI Integration & Model Training', slug: 'ai-integration-model-training' },
  { name: 'Web Development', slug: 'web-development' },
  { name: 'Software Development', slug: 'software-development' },
  { name: 'Mobile App', slug: 'mobile-app' },
  { name: 'Digital Marketing', slug: 'Marketing' },
  { name: 'UI/UX Design', slug: 'ui-ux-design' },
  { name: 'SEO, AEO & GEO Services', slug: 'seo-aeo-geo-services' },
  { name: 'Media Production', slug: 'media-production' },
];

export const SOCIALS: { name: string; href: string; icon: ReactNode }[] = [
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/company/in-ta-solutions/',
    icon: <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.5h4V21H3V9.5Zm6.5 0h3.8v1.6h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.65 4.77 6.1V21h-4v-5.1c0-1.22-.02-2.79-1.7-2.79-1.7 0-1.96 1.33-1.96 2.7V21h-4V9.5Z" />,
  },
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/intasolutions',
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1.2" />
      </>
    ),
  },
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/share/17taAqPXPP/',
    icon: <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.87.25-1.46 1.5-1.46h1.6V4.46A21 21 0 0 0 14.27 4.3c-2.3 0-3.88 1.4-3.88 3.98v2.22H7.8v3h2.6V21h3.1Z" />,
  },
  {
    name: 'X',
    href: 'https://x.com/intasolution',
    icon: <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.19L2 3h6.33l4.36 5.77L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.58l11.09 14.47Z" />,
  },
  {
    name: 'YouTube',
    href: 'https://www.youtube.com/@IN-TASolutionsPvtLtd',
    icon: (
      <path
        fillRule="evenodd"
        d="M22.5 7.2a2.8 2.8 0 0 0-1.97-1.98C18.8 4.75 12 4.75 12 4.75s-6.8 0-8.53.47A2.8 2.8 0 0 0 1.5 7.2 29 29 0 0 0 1.03 12c0 1.62.16 3.24.47 4.8a2.8 2.8 0 0 0 1.97 1.98c1.73.47 8.53.47 8.53.47s6.8 0 8.53-.47a2.8 2.8 0 0 0 1.97-1.98c.31-1.56.47-3.18.47-4.8 0-1.62-.16-3.24-.47-4.8ZM9.75 15.1V8.9L15.2 12l-5.45 3.1Z"
      />
    ),
  },
];

// The sign-off line, revealed letter by letter
const CTA = ["Let's build", "what's next"];

const HEAD = 'mb-3 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.25em] font-bold text-white/45';

/** Label that rolls up to a blue copy of itself when its link (a `group/roll`) is hovered or focused */
function Roll({ children }: { children: string }) {
  const motion = 'block transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]';
  return (
    <span className="relative inline-flex overflow-hidden">
      <span className={`${motion} group-hover/roll:-translate-y-full group-focus-visible/roll:-translate-y-full`}>{children}</span>
      <span aria-hidden="true" className={`${motion} absolute inset-x-0 top-0 translate-y-full text-[#9dbbff] group-hover/roll:translate-y-0 group-focus-visible/roll:translate-y-0`}>
        {children}
      </span>
    </span>
  );
}

export default function Footer() {
  const ref = useRef<HTMLElement>(null);
  const status = useOfficeStatus();
  const isOpen = status?.startsWith('OPEN') ?? false;
  const year = new Date().getFullYear();
  let charIndex = 0; // running index across the sign-off line, for the hover wave delay

  useGSAP(
    () => {
      const root = ref.current!;
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const glow = root.querySelector<HTMLElement>('[data-ft="glow"]');
      gsap.set(glow, { x: () => root.offsetWidth * 0.18, y: 40 });

      // ---- Columns: rules draw across, links rise in, once ----
      const cols = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-ft="rule"]', { scaleX: still ? 1 : 0, duration: 1.4, stagger: 0.2 }, 0)
        .from('[data-ft="item"]', { y: still ? 0 : 18, autoAlpha: 0, duration: 0.9, stagger: 0.02 }, 0.1);
      const io = new IntersectionObserver(
        ([e]) => {
          if (!e.isIntersecting) return;
          cols.play();
          io.disconnect();
        },
        { rootMargin: '0px 0px -10% 0px' },
      );
      io.observe(root.querySelector('[data-ft="cols"]')!);

      // ---- Back-to-top ring: how far down the page you are (only tracked while the footer is on screen) ----
      const ring = root.querySelector<SVGCircleElement>('[data-ft="ring"]');
      let raf = 0;
      const paint = () => {
        raf = 0;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        ring?.setAttribute('stroke-dashoffset', (100 - (max > 0 ? window.scrollY / max : 1) * 100).toFixed(1));
      };
      const onScroll = () => {
        if (!raf) raf = requestAnimationFrame(paint);
      };
      const seen = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) {
          paint();
          window.addEventListener('scroll', onScroll, { passive: true });
        } else window.removeEventListener('scroll', onScroll);
      });
      seen.observe(root);

      // ---- Scroll-linked (reverses on the way back up) ----
      if (!still) {
        const through = { trigger: root, start: 'top bottom', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true };
        // the footer rises from underneath the page, and the big logo with it
        gsap.fromTo('[data-ft="inner"]', { y: () => (window.innerWidth < 768 ? -40 : -90) }, { y: 0, ease: 'none', scrollTrigger: through });
        gsap.fromTo('[data-ft="mark"]', { yPercent: 45 }, { yPercent: 0, ease: 'none', scrollTrigger: through });
        // the sign-off rises letter by letter
        gsap
          .timeline({ scrollTrigger: { trigger: '[data-ft="cta"]', start: 'top bottom', end: 'top 50%', scrub: 0.6 } })
          .fromTo('[data-ft="ch"]', { yPercent: 115 }, { yPercent: 0, ease: 'power3.out', stagger: 0.02 }, 0)
          .fromTo('[data-ft="lead"]', { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'power2.out', stagger: 0.1 }, 0.15)
          .fromTo('[data-ft="arrow"]', { scale: 0, rotate: -90 }, { scale: 1, rotate: 0, ease: 'back.out(1.7)' }, 0.2);
      }

      // ---- Mouse only: magnetic buttons and a glow that follows the cursor ----
      const mm = gsap.matchMedia();
      mm.add('(pointer: fine)', () => {
        if (still) return;
        const offs = gsap.utils.toArray<HTMLElement>('[data-ft="mag"]').map((el) => {
          const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
          const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
          const pull = Number(el.dataset.pull ?? 0.35);
          const move = (e: PointerEvent) => {
            const r = el.getBoundingClientRect();
            xTo((e.clientX - r.left - r.width / 2) * pull);
            yTo((e.clientY - r.top - r.height / 2) * pull);
          };
          const leave = () => {
            xTo(0);
            yTo(0);
          };
          el.addEventListener('pointermove', move);
          el.addEventListener('pointerleave', leave);
          return () => {
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerleave', leave);
          };
        });
        const gx = gsap.quickTo(glow, 'x', { duration: 1.1, ease: 'power3' });
        const gy = gsap.quickTo(glow, 'y', { duration: 1.1, ease: 'power3' });
        const follow = (e: PointerEvent) => {
          const r = root.getBoundingClientRect();
          gx(e.clientX - r.left);
          gy(e.clientY - r.top);
        };
        root.addEventListener('pointermove', follow);
        return () => {
          offs.forEach((off) => off());
          root.removeEventListener('pointermove', follow);
        };
      });

      return () => {
        io.disconnect();
        seen.disconnect();
        window.removeEventListener('scroll', onScroll);
        cancelAnimationFrame(raf);
        mm.revert();
      };
    },
    { scope: ref },
  );

  return (
    <footer ref={ref} className="relative overflow-hidden bg-midnight text-white">
      {/* Glow (follows the mouse) and a lit top edge */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div data-ft="glow" className="absolute left-0 top-0 -ml-[18rem] -mt-[18rem] w-[36rem] h-[36rem] rounded-full bg-brand-blue/35 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#7fa6ff]/60 to-transparent" />
      </div>

      {/* The logo file, huge and faint, rising out of the bottom edge */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center translate-y-[30%]">
        <div data-ft="mark" className="w-[min(1500px,130%)] shrink-0 opacity-[0.06]">
          <Image src="/logo/logo-inta.png" alt="" width={774} height={322} sizes="100vw" className="w-full h-auto" />
        </div>
      </div>

      <div data-ft="inner" className="relative max-w-[1520px] mx-auto px-4 sm:px-6 pt-10 sm:pt-12 lg:pt-14 pb-5">
        {/* ---- Sign-off ---- */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 lg:gap-12">
          <div>
            <span data-ft="lead" className="inline-flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] uppercase font-bold text-[#9dbbff] mb-3 sm:mb-4">
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              Got an idea? // Let&apos;s talk
            </span>
            <Link href="/contact" data-ft="cta" aria-label="Let's build what's next: contact us" className="group/cta flex items-end gap-3 sm:gap-5 w-fit rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-[#7fa6ff]">
              <span aria-hidden="true" className="block font-display font-extrabold uppercase tracking-tight leading-[0.95] text-[length:clamp(2rem,4.8vw,4.6rem)]">
                {CTA.map((line, l) => (
                  <span key={line} className={`block ${l ? 'text-[#7fa6ff]' : 'text-white'}`}>
                    {line.split(' ').map((word) => (
                      <span key={word} className="inline-block overflow-hidden align-bottom pb-[0.05em] mr-[0.22em] last:mr-0">
                        {[...word].map((ch, c) => (
                          <span
                            key={c}
                            data-ft="ch"
                            className={`inline-block transition-[translate,color] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover/cta:-translate-y-[0.07em]
                              ${l ? 'group-hover/cta:text-white' : 'group-hover/cta:text-[#9dbbff]'}`}
                            style={{ transitionDelay: `${charIndex++ * 18}ms` }}
                          >
                            {ch}
                          </span>
                        ))}
                      </span>
                    ))}
                  </span>
                ))}
              </span>
              <span data-ft="mag" data-pull="0.3" className="shrink-0 mb-1 sm:mb-2">
                <span
                  data-ft="arrow"
                  className="flex w-11 h-11 sm:w-14 sm:h-14 lg:w-16 lg:h-16 items-center justify-center rounded-full bg-brand-blue text-white shadow-xl shadow-brand-blue/40
                    transition-[background-color,color,rotate] duration-500 group-hover/cta:bg-white group-hover/cta:text-midnight group-hover/cta:rotate-45"
                >
                  <Icon name="arrow_outward" className="text-[22px] sm:text-[26px] lg:text-[30px]" />
                </span>
              </span>
            </Link>
          </div>

          <div className="flex flex-col gap-1.5 sm:gap-2 lg:items-end lg:pb-2">
            <a data-ft="lead" href={`mailto:${EMAIL}`} className="group/roll inline-flex items-center gap-2.5 font-display font-bold text-base sm:text-xl">
              <Icon name="mail" className="text-[18px] sm:text-[20px] text-[#7fa6ff]" />
              <Roll>{EMAIL}</Roll>
            </a>
            <a data-ft="lead" href={PHONE.href} className="group/roll inline-flex items-center gap-2.5 font-display font-bold text-base sm:text-xl">
              <Icon name="call" className="text-[18px] sm:text-[20px] text-[#7fa6ff]" />
              <Roll>{PHONE.label}</Roll>
            </a>
          </div>
        </div>

        {/* ---- Columns ---- */}
        <div data-ft="cols" className="relative mt-8 lg:mt-10 pt-7 lg:pt-9">
          <span data-ft="rule" aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-white/15 origin-left" />
          <div className="grid grid-cols-2 lg:grid-cols-12 gap-x-6 gap-y-7 sm:gap-y-8">
            {/* Brand + live office status */}
            <div className="col-span-2 lg:col-span-4">
              <div data-ft="item">
                {/* The official logo file, shown as-is */}
                <Image src="/logo/logo-inta.png" alt="IN-TA Solutions" width={774} height={322} className="h-9 w-auto -ml-2.5" />
              </div>
              <p data-ft="item" className="mt-2 text-[13px] sm:text-sm text-white/65 leading-relaxed max-w-xs">
                Software, apps and AI for growing businesses, built by our team in Wayanad, Kerala.
              </p>
              <div data-ft="item" className="mt-4 inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 font-mono text-[10px] uppercase tracking-wider">
                <span className="relative flex h-2 w-2 shrink-0">
                  {isOpen && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7fa6ff] opacity-75" />}
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${isOpen ? 'bg-[#7fa6ff]' : 'bg-white/30'}`} />
                </span>
                <span className={isOpen ? 'text-[#9dbbff] font-bold' : 'text-white/60'}>{status ?? 'Mon–Sat · 9 AM–5 PM IST'}</span>
                <span aria-hidden="true" className="text-white/25">·</span>
                <span className="text-white/60 tabular-nums">
                  <IstClock />
                </span>
              </div>
            </div>

            <nav aria-label="Footer" className="lg:col-span-2">
              <h3 data-ft="item" className={HEAD}>Explore</h3>
              <ul className="space-y-2">
                {EXPLORE.map((l) => (
                  <li key={l.href} data-ft="item">
                    <Link href={l.href} className="group/roll inline-flex text-sm text-white/80">
                      <Roll>{l.name}</Roll>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="lg:col-span-3">
              <h3 data-ft="item" className={HEAD}>Services</h3>
              <ul className="space-y-2">
                {SERVICES.map((s) => (
                  <li key={s.slug} data-ft="item">
                    <Link href={`/services/${s.slug}`} className="group/roll inline-flex text-sm text-white/80">
                      <Roll>{s.name}</Roll>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-2 lg:col-span-3">
              <h3 data-ft="item" className={HEAD}>Visit us</h3>
              <a
                data-ft="item"
                href={MAP}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-2.5 text-sm text-white/80 leading-relaxed transition-colors duration-300 hover:text-[#9dbbff]"
              >
                <Icon name="location_on" className="text-[18px] mt-0.5 text-[#7fa6ff]" />
                <span>
                  Thonichal, Mananthavady,
                  <br />
                  Wayanad, Kerala 670645
                  <span className="ml-1.5 inline-flex align-middle opacity-0 -translate-x-1 transition-[opacity,translate] duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                    <Icon name="arrow_outward" className="text-[14px]" />
                  </span>
                </span>
              </a>
              <p data-ft="item" className="mt-2.5 flex items-center gap-2.5 text-sm text-white/60">
                <Icon name="schedule" className="text-[18px] text-[#7fa6ff]" />
                Mon–Sat · 9 AM – 5 PM IST
              </p>

              <h3 data-ft="item" className={`${HEAD} mt-6`}>Follow</h3>
              <ul className="flex flex-wrap gap-2">
                {SOCIALS.map((s) => (
                  <li key={s.name} data-ft="item">
                    <a
                      data-ft="mag"
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`IN-TA Solutions on ${s.name}`}
                      className="flex w-10 h-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-white/80
                        transition-[background-color,color,border-color] duration-300 hover:bg-white hover:text-midnight hover:border-white
                        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7fa6ff]"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                        {s.icon}
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ---- Bottom bar ---- */}
        <div className="relative mt-8 lg:mt-10 pt-4">
          <span data-ft="rule" aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-white/15 origin-left" />
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-white/50">
            <p>© {year} IN-TA Solutions Pvt Ltd. All rights reserved.</p>
            <div className="flex items-center gap-5 sm:gap-6">
              <Link href="/terms" className="group/roll inline-flex hover:text-white">
                <Roll>Terms</Roll>
              </Link>
              <Link href="/privacy" className="group/roll inline-flex hover:text-white">
                <Roll>Privacy</Roll>
              </Link>
              <Link href="/security" className="group/roll inline-flex hover:text-white">
                <Roll>Security</Roll>
              </Link>
              <button
                type="button"
                data-ft="mag"
                onClick={scrollToTop}
                aria-label="Back to top"
                className="group/top relative flex w-10 h-10 items-center justify-center rounded-full text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7fa6ff]"
              >
                {/* ring = how far down the page you are */}
                <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden="true">
                  <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1.5" />
                  <circle data-ft="ring" cx="24" cy="24" r="22" fill="none" stroke="#7fa6ff" strokeWidth="2" strokeLinecap="round" pathLength={100} strokeDasharray="100" strokeDashoffset="100" />
                </svg>
                <Icon name="arrow_upward" className="text-[16px] transition-transform duration-300 group-hover/top:-translate-y-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export default function Header1() {
  const [open, setOpen] = useState(false);
  const [headerH, setHeaderH] = useState(0);

  const headerRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const menuItemsRef = useRef<HTMLAnchorElement[]>([]);
  const menuTl = useRef<gsap.core.Timeline>();

  const logoDark = useRef<HTMLImageElement>(null);
  const logoLight = useRef<HTMLImageElement>(null);

  const top = useRef<SVGRectElement>(null);
  const mid = useRef<SVGRectElement>(null);
  const bot = useRef<SVGRectElement>(null);

  const links = ['Home', 'About', 'Services', 'Portfolio', 'Contact'];

  /* ---------------- Measure header height dynamically ---------------- */
  useLayoutEffect(() => {
    if (!headerRef.current) return;

    const update = () => {
      setHeaderH(headerRef.current!.getBoundingClientRect().height);
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  /* ---------------- Body lock (iOS safe) ---------------- */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [open]);

  /* ---------------- Close on REAL scroll intent (mobile only) ---------------- */
  useEffect(() => {
    if (!open) return;

    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      if (
        window.innerWidth < 768 &&
        Math.abs(y - lastY) > 14
      ) {
        setOpen(false);
      }
      lastY = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [open]);

  /* ---------------- Swipe down to close ---------------- */
  useEffect(() => {
    if (!open || window.innerWidth >= 768) return;

    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0].clientY - startY > 44) {
        setOpen(false);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [open]);

  /* ---------------- Header scroll animation ---------------- */
  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: '+=120',
        scrub: 0.5,
        onToggle: self => {
          open ? self.disable() : self.enable();
        },
      },
    });

    tl.to(overlayRef.current, { opacity: 1 }, 0)
      .to(
        headerRef.current,
        {
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 10px 20px rgba(0,0,0,.15)',
        },
        0
      )
      .to('.nav-link', { color: '#fff' }, 0)
      .to(logoDark.current, { opacity: 0 }, 0)
      .to(logoLight.current, { opacity: 1 }, 0);
  }, [open]);

  /* ---------------- Mobile menu animation ---------------- */
  useGSAP(() => {
    menuTl.current = gsap.timeline({ paused: true });

    menuTl.current
      .fromTo(
        menuRef.current,
        { y: -18, opacity: 0, scale: 0.97 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.45,
          ease: 'power3.out',
        }
      )
      .fromTo(
        menuItemsRef.current,
        { y: 16, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.06,
          duration: 0.35,
          ease: 'power3.out',
        },
        '-=0.22'
      )
      .to(top.current, { y: 7, rotate: 45, duration: 0.25 }, 0)
      .to(mid.current, { opacity: 0, duration: 0.2 }, 0)
      .to(bot.current, { y: -7, rotate: -45, duration: 0.25 }, 0);
  }, []);

  useEffect(() => {
    if (!menuTl.current) return;
    open ? menuTl.current.play() : menuTl.current.reverse();
  }, [open]);

  /* ---------------- Backdrop fade ---------------- */
  useEffect(() => {
    if (!backdropRef.current) return;
    gsap.to(backdropRef.current, {
      opacity: open ? 1 : 0,
      duration: 0.25,
      ease: 'power2.out',
      pointerEvents: open ? 'auto' : 'none',
    });
  }, [open]);

  return (
    <>
      {/* HEADER */}
      <header
        ref={headerRef}
        className="sticky top-0 z-50 bg-[#f8f6f1]"
      >
        <div
          ref={overlayRef}
          className="absolute inset-0 opacity-0 bg-gradient-to-r
                     from-[#071428] via-[#0b2a5f] to-[#13243a]
                     pointer-events-none"
        />

        <div className="relative z-10 max-w-[1320px] mx-auto
                        flex items-center justify-between
                        px-4 py-4">
          {/* Logo */}
          <Link href="/" className="relative w-[140px] h-[32px]">
            <Image
              ref={logoDark}
              src="/logo/logo-inta-dark.png"
              alt="INTA"
              fill
              priority
              className="object-contain"
            />
            <Image
              ref={logoLight}
              src="/logo/logo-inta-light.png"
              alt="INTA"
              fill
              priority
              className="object-contain opacity-0"
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <nav className="flex gap-8 font-medium">
              {links.map(l => (
                <Link
                  key={l}
                  href={l === 'Home' ? '/' : `/${l.toLowerCase()}`}
                  className="nav-link text-black hover:text-[#1f6fe6]"
                >
                  {l}
                </Link>
              ))}
            </nav>

            <Link
              href="/contact"
              className="rounded-full px-5 py-2.5
                         bg-gradient-to-r from-[#0b63d9] to-[#1f6fe6]
                         text-white font-semibold shadow-md"
            >
              Get a Quote
            </Link>
          </div>

          {/* Mobile button */}
          <button
            onClick={() => setOpen(v => !v)}
            className="md:hidden p-2"
            aria-label="Menu"
          >
            <svg width="22" height="16" viewBox="0 0 22 16">
              <rect ref={top} width="22" height="2" rx="1" />
              <rect ref={mid} y="7" width="22" height="2" rx="1" />
              <rect ref={bot} y="14" width="22" height="2" rx="1" />
            </svg>
          </button>
        </div>
      </header>

      {/* MOBILE MENU */}
      <div
        ref={menuRef}
        style={{ top: headerH }}
        className="md:hidden fixed inset-x-0 z-[9999]
                   opacity-0 pointer-events-none"
      >
        {/* Backdrop */}
        {/* <div
          ref={backdropRef}
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm opacity-0"
        /> */}

        {/* Menu Card */}
       <div
  className="relative z-10 mx-4 mt-4
             rounded-2xl bg-white
             shadow-2xl px-6 pt-6 pb-4 space-y-2
             overflow-y-auto"
  style={{
    maxHeight: `calc(100vh - ${headerH + 24}px)`,
    paddingBottom: `calc(1rem + env(safe-area-inset-bottom))`,
  }}
>

          {links.map((l, i) => (
            <Link
              key={l}
              ref={el => {
                if (el) menuItemsRef.current[i] = el;
              }}
              href={l === 'Home' ? '/' : `/${l.toLowerCase()}`}
              onClick={() => setOpen(false)}
              className="block py-3 text-lg font-semibold
                         text-[#0b2a5f] hover:text-[#1f6fe6]"
            >
              {l}
            </Link>
          ))}

          <Link
            href="/contact"
            onClick={() => setOpen(false)}
            className="block w-full mt-4 rounded-full py-3
                       text-center bg-gradient-to-r
                       from-[#0b63d9] to-[#1f6fe6]
                       text-white font-semibold shadow-lg"
          >
            Get a Quote
          </Link>
        </div>
      </div>
    </>
  );
}

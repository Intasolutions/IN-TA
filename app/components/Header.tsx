'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';
import MainNav, { type NavLink } from './MainNav';
import { useSite } from '../site/SiteContext';
import { coords, phoneHref } from '../site/site';

// Home is only offered away from the home page
const HOME_LINK: NavLink = { name: 'Home', href: '/' };
const NAV_LINKS: NavLink[] = [
  { name: 'Work', href: '/portfolio' },
  { name: 'Capabilities', href: '/services' },
  { name: 'About', href: '/about' },
  { name: 'Blog', href: '/blog' },
  { name: 'Contact', href: '/contact' },
];

// Own component so the ticking clock re-renders only itself, not the whole header
export function IstClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span>IST {time}</span>;
}

export default function Header() {
  const site = useSite();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const lastScrollY = useRef(0);

  // Hide on scroll down, reveal on scroll up (checked at most once per frame)
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (Math.abs(y - lastScrollY.current) < 4) return; // ignore tiny jitters
      setIsVisible(y < lastScrollY.current || y < 140);
      lastScrollY.current = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));
  const links = pathname === '/' ? NAV_LINKS : [HOME_LINK, ...NAV_LINKS];

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[60] bg-canvas border-b border-brand-blue/15 shadow-sm transition-transform duration-500
        ${isVisible || isMobileOpen ? 'translate-y-0' : '-translate-y-full'}`}
    >
      {/* TOP DATUM STRIP */}
      <div className="[@media(max-height:500px)_and_(orientation:landscape)]:hidden max-w-[1520px] mx-auto px-4 sm:px-6 h-11 flex items-center justify-between gap-3 text-[10px] sm:text-[11px] font-mono tracking-wider sm:tracking-widest text-midnight/70">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-brand-blue font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-blue" />
            </span>
            <span className="hidden lg:inline">SYS.RUNNING [{coords(site)}]</span>
            <span className="lg:hidden">SYS.RUNNING</span>
          </span>
          <span className="hidden xl:inline text-brand-blue/30">/</span>
          <span className="hidden xl:inline text-midnight font-medium">HQ: {[site.address.district, site.address.region].filter(Boolean).join(', ').toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <span className="hidden sm:flex items-center gap-1 text-brand-blue font-semibold tabular-nums">
            <Icon name="schedule" className="text-[13px]" />
            <IstClock />
          </span>
          <a className="hover:text-brand-blue transition-colors text-midnight font-semibold whitespace-nowrap" href={phoneHref(site.phone)}>
            {site.phone}
          </a>
        </div>
      </div>

      {/* PRIMARY NAVIGATION */}
      <header className="border-t border-brand-blue/10 bg-white">
        <div className="max-w-[1520px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          <Link
            href="/"
            onClick={() => setIsMobileOpen(false)}
            className="group flex items-center gap-3 sm:gap-4 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue"
            aria-label="IN-TA Solutions — home"
          >
            {/* Logo tile: dark navy glass with a soft blue glow, holding the official white INTA wordmark */}
            <span
              aria-hidden="true"
              className="relative flex items-center justify-center h-11 sm:h-12 px-1.5 sm:px-2 rounded-xl overflow-hidden
                bg-[linear-gradient(145deg,#01072b_0%,#06123f_55%,#0a1d5c_100%)]
                border border-brand-blue/40 ring-1 ring-inset ring-white/5
                shadow-[0_6px_20px_-6px_rgb(1_68_181/0.55)]
                group-hover:shadow-[0_10px_28px_-6px_rgb(1_68_181/0.75)] group-hover:border-brand-blue/70
                transition-[box-shadow,border-color] duration-500"
            >
              {/* The official logo file, shown as-is */}
              <Image
                src="/logo/logo-inta.png"
                alt=""
                width={774}
                height={322}
                priority
                className="h-10 sm:h-11 w-auto"
              />
            </span>
            <span
              aria-hidden="true"
              className="lg:hidden xl:inline font-display font-bold text-[15px] sm:text-base tracking-[0.06em] text-midnight whitespace-nowrap"
            >
              IN-TA SOLUTIONS
            </span>
          </Link>

          <MainNav links={links} current={links.findIndex((l) => isActive(l.href))} />

          <div className="flex items-center gap-3">
            <Link
              href="/contact"
              className="kinetic-cta-btn hidden sm:inline-flex items-center gap-2 whitespace-nowrap px-4 xl:px-5 py-2.5 rounded-lg bg-brand-blue hover:bg-midnight text-white font-mono text-[12px] font-semibold tracking-wider uppercase"
            >
              <span>Initialize Project</span>
              <Icon name="arrow_outward" className="text-[16px]" />
            </Link>
            <button
              type="button"
              onClick={() => setIsMobileOpen((o) => !o)}
              className="lg:hidden w-11 h-11 flex items-center justify-center rounded-lg border border-brand-blue/20 bg-canvas text-midnight hover:text-brand-blue transition-colors"
              aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileOpen}
              aria-controls="mobile-nav"
            >
              <Icon
                name={isMobileOpen ? 'close' : 'menu'}
                className={`text-[24px] transition-transform duration-500 ease-out ${isMobileOpen ? 'rotate-180' : 'rotate-0'}`}
              />
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        <nav
          id="mobile-nav"
          className={`lg:hidden overflow-hidden border-t border-brand-blue/10 transition-[max-height] duration-500 ease-out
            ${isMobileOpen ? 'max-h-[calc(100dvh_-_var(--header-h))] overflow-y-auto' : 'max-h-0 border-transparent'}`}
        >
          <div className="max-w-[1520px] mx-auto px-6 py-6 flex flex-col gap-1">
            {links.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileOpen(false)}
                aria-current={isActive(link.href) ? 'page' : undefined}
                // Links cascade in one after another when the menu opens
                style={{ transitionDelay: isMobileOpen ? `${120 + i * 60}ms` : '0ms' }}
                className={`flex items-center justify-between py-3 border-b border-brand-blue/10 font-display text-2xl font-bold uppercase tracking-tight
                  transition-[opacity,translate,color] duration-500 ease-out motion-reduce:transition-none
                  ${isMobileOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}
                  ${isActive(link.href) ? 'text-brand-blue' : 'text-midnight hover:text-brand-blue active:text-brand-blue'}`}
              >
                <span>{link.name}</span>
                <span className="font-mono text-[11px] text-brand-blue/60">0{i + 1}</span>
              </Link>
            ))}
            <Link
              href="/contact"
              onClick={() => setIsMobileOpen(false)}
              style={{ transitionDelay: isMobileOpen ? `${120 + links.length * 60}ms` : '0ms' }}
              className={`kinetic-cta-btn sm:hidden mt-6 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg bg-brand-blue text-white font-mono text-[12px] font-semibold tracking-wider uppercase active:scale-[0.97]
                ${isMobileOpen ? 'opacity-100' : 'opacity-0'}`}
            >
              <span>Initialize Project</span>
              <Icon name="arrow_outward" className="text-[16px]" />
            </Link>
          </div>
        </nav>
      </header>
    </div>
  );
}

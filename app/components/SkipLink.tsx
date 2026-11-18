'use client';

import { jumpToY } from './SmoothScroll';

/**
 * "Skip to content": the first thing Tab reaches on every page, so keyboard and screen-reader visitors can pass the
 * header straight to the page's own content. Hidden until focused. Every page's <main> has id="main", the link's
 * target without scripts; with them it also moves focus there and jumps past the smooth scrolling.
 */
export default function SkipLink() {
  const skip = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const main = document.querySelector('main');
    if (!main) return;
    e.preventDefault();
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
    main.focus({ preventScroll: true });
    jumpToY(main.getBoundingClientRect().top + window.scrollY);
  };

  return (
    <a
      href="#main"
      onClick={skip}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-brand-blue focus:px-4 focus:py-3 focus:font-mono focus:text-[12px] focus:font-semibold focus:uppercase focus:tracking-wider focus:text-white focus:outline-2 focus:outline-offset-2 focus:outline-midnight"
    >
      Skip to content
    </a>
  );
}

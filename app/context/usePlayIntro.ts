import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { useReveal } from './RevealContext';

const never = () => () => {};

/**
 * Whether the visitor could already see this page before the site's scripts took it over: a reload later in the visit
 * (no opening), or an opening that finished first, on a slow connection. A page entrance would then hide what they're
 * already reading and bring it back, so it's skipped and the page simply stays as it is. Only the page the visit
 * arrived on can be in that state: a page reached by a link is new, and its entrance plays.
 */
export function useShownOnArrival() {
  // true only while React takes over the HTML the server sent (it uses the server's answer then)
  const takingOver = useSyncExternalStore(never, () => false, () => true);
  const [shown] = useState(() => {
    if (!takingOver || typeof document === 'undefined') return false;
    const opening = document.documentElement.dataset.loader;
    return opening === 'seen' || opening === 'left';
  });
  return shown;
}

/**
 * Plays a page's opening once, when the loader or route mask has cleared the screen. Arriving by a link, the flag is
 * still true from the last page for a moment before the mask resets it, so it has to stay true briefly before it counts.
 * Returns whether the opening has played, for anything that rebuilds it later and must not show it again: the page
 * puts its entrance straight at the end when it's true as it's built (also when the page was on screen already).
 */
export function usePlayIntro(intro: RefObject<gsap.core.Timeline | null>) {
  const { isIntroReady } = useReveal();
  const shown = useShownOnArrival();
  const played = useRef(shown);
  useEffect(() => {
    if (!isIntroReady || played.current) return;
    const wait = window.setTimeout(() => {
      played.current = true;
      intro.current?.restart();
    }, 60);
    return () => window.clearTimeout(wait);
  }, [isIntroReady, intro]);
  return played;
}

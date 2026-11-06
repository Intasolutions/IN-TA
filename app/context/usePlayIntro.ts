import { useEffect, useRef, type RefObject } from 'react';
import { useReveal } from './RevealContext';

/**
 * Plays a page's opening once, when the loader or route mask has cleared the screen. Arriving by a link, the flag is
 * still true from the last page for a moment before the mask resets it, so it has to stay true briefly before it counts.
 * Returns whether the opening has played, for anything that rebuilds it later and must not show it again.
 */
export function usePlayIntro(intro: RefObject<gsap.core.Timeline | null>) {
  const { isIntroReady } = useReveal();
  const played = useRef(false);
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

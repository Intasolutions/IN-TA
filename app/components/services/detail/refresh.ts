import { ScrollTrigger } from 'gsap/ScrollTrigger';

let timer = 0;

/** Re-measures the page once things have stopped changing: pictures loading together only cost one measurement */
export function refreshSoon() {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => ScrollTrigger.refresh(), 180);
}

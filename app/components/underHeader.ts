/**
 * A ScrollTrigger start just under the fixed header (`top <header height + gap>px`), worked out at every refresh.
 * Page headings that drift away as the page scrolls start from here, so a heading at rest is never already fading,
 * whatever height the header has.
 */
export const underHeader = (gap = 8) => () =>
  `top ${(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 80) + gap}px`;

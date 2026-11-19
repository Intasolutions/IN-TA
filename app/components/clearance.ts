'use client';

// The floating buttons (WhatsApp bottom left, the robot's chat button bottom right) step aside only where they would
// really cover something that must stay usable: the hero's buttons, the footer's back-to-top row, the enquiry form's
// send button on phones. They used to hide whenever one of those was anywhere on screen, which hid them for the whole
// first screen of the home page.

type Zone = { left: number; top: number; right: number; bottom: number };

/** A fixed element's resting box on screen (offsetLeft/Top ignore its transforms: its hover lift, its tuck slide), grown by `pad` */
export function restingZone(el: HTMLElement | null, pad = 12, grow: Partial<Zone> = {}): Zone | null {
  if (!el || !el.offsetWidth) return null;
  return {
    left: el.offsetLeft - pad - (grow.left ?? 0),
    top: el.offsetTop - pad - (grow.top ?? 0),
    right: el.offsetLeft + el.offsetWidth + pad + (grow.right ?? 0),
    bottom: el.offsetTop + el.offsetHeight + pad + (grow.bottom ?? 0),
  };
}

/** Calls onChange(true) while an on-screen element matching `selector` (and `applies`) overlaps `zone`, false when none
 * does. Re-checked as the page scrolls and resizes, once per frame at most, and only while one is on screen. */
export function watchCover(
  selector: string,
  zone: () => Zone | null,
  onChange: (covered: boolean) => void,
  applies: (el: HTMLElement) => boolean = () => true,
) {
  const targets = [...document.querySelectorAll<HTMLElement>(selector)];
  onChange(false);
  if (!targets.length) return () => {};
  const seen = new Set<HTMLElement>();
  let raf = 0;
  let last = false;
  const check = () => {
    raf = 0;
    const z = seen.size ? zone() : null;
    // (a row of buttons is measured by its buttons, not by the row, which can run the full width with empty space)
    const covered = !!z && [...seen].some((el) => applies(el) && (el.children.length ? [...el.children] : [el]).some((part) => {
      const r = part.getBoundingClientRect();
      return r.width > 0 && r.left < z.right && r.right > z.left && r.top < z.bottom && r.bottom > z.top;
    }));
    if (covered !== last) { last = covered; onChange(covered); }
  };
  const soon = () => { if (!raf && (seen.size || last)) raf = requestAnimationFrame(check); };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? seen.add(e.target as HTMLElement) : seen.delete(e.target as HTMLElement)));
    if (!raf) raf = requestAnimationFrame(check);
  });
  targets.forEach((el) => io.observe(el));
  window.addEventListener('scroll', soon, { passive: true });
  window.addEventListener('resize', soon);
  return () => {
    io.disconnect();
    cancelAnimationFrame(raf);
    window.removeEventListener('scroll', soon);
    window.removeEventListener('resize', soon);
  };
}

'use client';

import { useRef, type RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * useGSAP for a section's scroll effects and entrance, set up when they're about to be needed rather than all at once
 * as the page starts.
 *
 * Setting up an entrance means GSAP reading the style of every element it will move. Done for every section of the
 * home page in the same moment, that was ~1,800 reads in one go and froze a phone for 1.5–4 s just as the page appeared.
 * Now a section is prepared when the browser is idle (one section per idle moment, top of the page first), or at once
 * if the visitor scrolls within half a screen of it first, or straight away if it's already on screen as the page
 * starts (a reload part-way down), so nothing ever shows and then hides.
 *
 * The setup runs inside the hook's GSAP context exactly as useGSAP's would: selectors are scoped, everything it makes
 * is reverted on unmount, and a function it returns is called then too.
 */
export function useGSAPWhenNear(
  setup: () => void | (() => void),
  { scope, dependencies = [], revertOnUpdate = false }: { scope: RefObject<HTMLElement | null>; dependencies?: unknown[]; revertOnUpdate?: boolean },
) {
  // a setup still waiting from before the dependencies changed is dropped: only the newest one runs
  const pending = useRef<(() => void) | null>(null);

  useGSAP(
    (context) => {
      pending.current?.();
      pending.current = null;
      const el = scope.current;
      if (!el) return;

      let io: IntersectionObserver | null = null;
      let done = false;
      const build = () => {
        if (done) return;
        done = true;
        io?.disconnect();
        unqueue(build);
        context.add(() => setup());
        // sections set up out of page order: keep ScrollTrigger measuring them top to bottom (pins push those below)
        ScrollTrigger.sort();
      };

      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        build();
        return;
      }

      io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) build();
      }, { rootMargin: '50% 0px' });
      io.observe(el);
      enqueue(build, el);

      const cancel = () => {
        done = true;
        io?.disconnect();
        unqueue(build);
      };
      pending.current = cancel;
      return cancel;
    },
    { scope, dependencies, revertOnUpdate },
  );
}

// ---- One section prepared per idle moment, in page order ----

type Job = { run: () => void; el: HTMLElement };
const queue: Job[] = [];
let waiting = false;

const whenIdle = (cb: () => void) => {
  // (Safari has no requestIdleCallback)
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(cb, { timeout: 2000 });
  else setTimeout(cb, 120);
};

function pump() {
  if (waiting || !queue.length) return;
  waiting = true;
  whenIdle(() => {
    waiting = false;
    // the highest on the page first: it's the one the visitor reaches first
    queue.sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    queue.shift()?.run();
    pump();
  });
}

function enqueue(run: () => void, el: HTMLElement) {
  queue.push({ run, el });
  pump();
}

function unqueue(run: () => void) {
  const i = queue.findIndex((job) => job.run === run);
  if (i >= 0) queue.splice(i, 1);
}

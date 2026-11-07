'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Icon from '../Icon';
import Avatar from './Avatar';
import { STATIC_GRADIENT, useTestimonials, type Testimonial } from './data';
import { useText } from '../../site/SiteContext';
import { accent } from '../../site/site';

gsap.registerPlugin(useGSAP);

const AUTOPLAY = 7; // seconds per card
const VISIBLE = 4; // cards visible in the stack

// Shorter quotes get bigger type so every card (all as tall as the longest quote) fills naturally
const quoteSize = (q: string) =>
  q.length < 260
    ? 'text-base sm:text-lg lg:text-xl font-medium leading-snug'
    : q.length < 440
      ? 'text-[15px] sm:text-base lg:text-[1.05rem] leading-relaxed'
      : 'text-sm sm:text-[15px] lg:text-base leading-relaxed';

// Resting pose of a card at a given depth in the stack (0 = top)
const pose = (depth: number) => ({
  x: 0,
  y: depth * 12,
  scale: 1 - depth * 0.045,
  rotate: depth === 0 ? 0 : (depth % 2 ? 1 : -1) * (1.5 + depth * 0.7),
});

/** Client testimonials as a stack of cards: drag / flick the top one away, or use the arrows and photos. */
export default function TestimonialDeck() {
  const t = useText();
  const [titlePlain, titleBright] = accent(t('home_voices_title'));
  const ref = useRef<HTMLElement>(null);
  const { items, failed } = useTestimonials();
  // The stack is the testimonials rotated by `rot`: order[0] is the card on top
  const [rot, setRot] = useState(0);
  const n = items?.length ?? 0;
  const order = n ? Array.from({ length: n }, (_, i) => (i + rot) % n) : [];
  const top = order[0];
  const throwing = useRef(false);
  const queued = useRef<0 | 1 | -1>(0); // a click that arrived mid-throw, run as soon as the throw lands
  const card = (idx: number) => ref.current?.querySelector<HTMLElement>(`[data-td-card="${idx}"]`) ?? null;
  const slot = (idx: number) => ref.current?.querySelector<HTMLElement>(`[data-td-slot="${idx}"]`) ?? null;
  const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Throw the top card off one side, then tuck it under the stack ----
  const next = (dir: 1 | -1 = 1) => {
    if (n < 2) return;
    if (throwing.current) {
      queued.current = 1;
      return;
    }
    const el = card(order[0]);
    if (!el) return;
    throwing.current = true;
    gsap.to(el, {
      x: dir * el.offsetWidth * 1.35,
      y: '-=50',
      rotate: dir * 22,
      autoAlpha: 0,
      duration: calm() ? 0.01 : 0.42,
      ease: 'power2.in',
      onComplete: () => {
        throwing.current = false;
        setRot((r) => (r + 1) % n);
      },
    });
  };
  // ---- Previous: the bottom card flies back in from the left onto the top ----
  const prev = () => {
    if (n < 2) return;
    if (throwing.current) {
      queued.current = -1;
      return;
    }
    const el = card(order[n - 1]);
    if (el && !calm()) gsap.set(el, { x: -el.offsetWidth * 1.35, y: -50, rotate: -22, autoAlpha: 0 });
    const sl = slot(order[n - 1]);
    if (sl) sl.style.zIndex = '60';
    setRot((r) => (r - 1 + n) % n);
  };
  // ---- Jump straight to a client (photo row / dots) ----
  const jump = (idx: number) => {
    if (throwing.current || idx === top) return;
    setRot(idx);
  };
  // latest handlers for listeners set up in effects
  const api = useRef({ next, prev });
  useEffect(() => { api.current = { next, prev }; });

  // ---- Header + deck reveal ----
  useGSAP(
    () => {
      const move = (v: number) => (calm() ? 0 : v);
      const tl = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-td="kicker"]', { y: move(10), autoAlpha: 0, duration: 0.7 }, 0)
        .from('[data-td="word"]', { yPercent: move(110), autoAlpha: calm() ? 0 : 1, duration: 1.1, stagger: 0.1 }, 0.1)
        .from('[data-td="copy"]', { y: move(16), autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.35)
        .from('[data-td="deck"]', { y: move(90), rotate: move(-5), autoAlpha: 0, duration: 1.2 }, 0.25);
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        tl.play();
        io.disconnect();
      }, { threshold: 0.2 });
      io.observe(ref.current!);
      return () => io.disconnect();
    },
    { scope: ref },
  );

  // ---- Lay the cards out as a fanned stack whenever the order changes ----
  useGSAP(
    () => {
      if (!n) return;
      order.forEach((idx, depth) => {
        const el = card(idx);
        if (!el) return;
        gsap.to(el, {
          ...pose(depth),
          autoAlpha: depth < VISIBLE ? 1 : 0,
          duration: calm() ? 0 : 0.75,
          ease: 'expo.out',
          overwrite: 'auto',
        });
        // the slot holds the stacking order and this card's place in the scroll fan-out
        const sl = slot(idx);
        if (sl) {
          sl.style.zIndex = String(50 - depth);
          sl.style.setProperty('--d', String(Math.min(depth, VISIBLE)));
          sl.style.setProperty('--s', depth % 2 ? '1' : '-1');
        }
        // cards further back get a soft tint for depth
        gsap.to(el.querySelector('[data-td="shade"]'), { opacity: Math.min(depth * 0.18, 0.55), duration: 0.5, overwrite: 'auto' });
      });
      // run a click that came in while the previous card was still flying
      if (queued.current) {
        const q = queued.current;
        queued.current = 0;
        requestAnimationFrame(() => (q === 1 ? api.current.next(1) : api.current.prev()));
      }
    },
    { scope: ref, dependencies: [rot, n] },
  );

  // ---- Drag / flick the top card (mouse or touch); the next card rises to meet it ----
  useGSAP(
    () => {
      if (top === undefined || n < 2) return;
      const el = card(top);
      const under = card(order[1]);
      if (!el) return;
      const rest = pose(1);
      let startX = 0;
      let startY = 0;
      let dx = 0;
      let lastX = 0;
      let lastT = 0;
      let vel = 0;
      let dragging = false;
      let axis: 'x' | 'y' | null = null;

      const down = (e: PointerEvent) => {
        if (e.button !== 0 || throwing.current) return;
        dragging = true;
        axis = null;
        startX = lastX = e.clientX;
        startY = e.clientY;
        lastT = performance.now();
        dx = 0;
        vel = 0;
        ref.current!.dataset.dragging = '1';
      };
      const move = (e: PointerEvent) => {
        if (!dragging) return;
        // decide once whether this is a sideways drag or the start of a page scroll
        if (!axis) {
          const ax = Math.abs(e.clientX - startX);
          const ay = Math.abs(e.clientY - startY);
          if (ax < 6 && ay < 6) return;
          axis = ax > ay ? 'x' : 'y';
          if (axis === 'x') el.setPointerCapture(e.pointerId);
        }
        if (axis !== 'x') return;
        dx = e.clientX - startX;
        const now = performance.now();
        vel = (e.clientX - lastX) / Math.max(1, now - lastT);
        lastX = e.clientX;
        lastT = now;
        gsap.set(el, { x: dx, rotate: dx * 0.05, y: Math.abs(dx) * -0.06 });
        if (under) {
          const p = Math.min(Math.abs(dx) / (el.offsetWidth * 0.4), 1);
          gsap.set(under, { y: rest.y * (1 - p), scale: rest.scale + (1 - rest.scale) * p, rotate: rest.rotate * (1 - p) });
        }
      };
      const up = () => {
        if (!dragging) return;
        dragging = false;
        delete ref.current!.dataset.dragging;
        if (axis !== 'x') return;
        if (Math.abs(dx) > el.offsetWidth * 0.25 || Math.abs(vel) > 0.55) {
          api.current.next(dx > 0 ? 1 : -1);
        } else {
          gsap.to(el, { x: 0, y: 0, rotate: 0, duration: 0.7, ease: 'elastic.out(1, 0.6)' });
          if (under) gsap.to(under, { ...rest, duration: 0.5, ease: 'power3.out' });
        }
      };
      el.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      return () => {
        el.removeEventListener('pointerdown', down);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      };
    },
    { scope: ref, dependencies: [top, n] },
  );

  // ---- Autoplay: a progress bar fills, then the next card; restarts after every move.
  //      Pauses on hover, while dragging, and off screen. ----
  useGSAP(
    () => {
      if (n < 2 || calm()) return;
      const root = ref.current!;
      const deck = root.querySelector<HTMLElement>('[data-td="deck"]')!;
      const fill = gsap.fromTo('[data-td="bar"]', { scaleX: 0 }, { scaleX: 1, duration: AUTOPLAY, ease: 'none', onComplete: () => api.current.next(1) });
      let hovering = false;
      let visible = false;
      const sync = () => (hovering || !visible || root.dataset.dragging ? fill.pause() : fill.resume());
      const enter = () => { hovering = true; sync(); };
      const leave = () => { hovering = false; sync(); };
      deck.addEventListener('pointerenter', enter);
      deck.addEventListener('pointerleave', leave);
      deck.addEventListener('pointerdown', enter);
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); });
      io.observe(deck);
      return () => {
        deck.removeEventListener('pointerenter', enter);
        deck.removeEventListener('pointerleave', leave);
        deck.removeEventListener('pointerdown', enter);
        io.disconnect();
      };
    },
    { scope: ref, dependencies: [rot, n], revertOnUpdate: true },
  );

  // ---- Scroll: the deck fans out like a hand of cards and tilts in 3D as it arrives, gathers into a neat stack
  //      in the middle of the screen, and tips away as it leaves. Text, photos and ghost text drift at their own pace. ----
  useGSAP(
    () => {
      if (!n || calm()) return;
      const root = ref.current!;
      const deck = root.querySelector<HTMLElement>('[data-td="deck"]');
      const tilt = root.querySelector('[data-td="tilt"]');
      if (!deck || !tilt) return;
      const small = () => window.innerWidth < 768; // gentler on phones
      const fan = { v: 1 };
      const setFan = () => deck.style.setProperty('--fan', fan.v.toFixed(3));
      gsap.set(tilt, { transformPerspective: 1200, transformOrigin: '50% 60%' });

      gsap
        .timeline({ scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true } })
        // fan out → neat stack → slight spread on the way out
        .fromTo(fan, { v: 1 }, { v: 0, ease: 'power2.out', duration: 0.45, onUpdate: setFan }, 0)
        .to(fan, { v: 0.5, ease: 'power1.in', duration: 0.35, onUpdate: setFan }, 0.65)
        // 3D tilt: leaning back → flat → tipping forward
        .fromTo(
          tilt,
          { rotationX: () => (small() ? 8 : 16), y: () => (small() ? 24 : 56), rotation: -3 },
          { rotationX: 0, y: 0, rotation: 0, ease: 'power2.out', duration: 0.45 },
          0,
        )
        .to(tilt, { rotationX: () => (small() ? -5 : -10), y: () => (small() ? -16 : -36), rotation: 2, ease: 'power1.in', duration: 0.35 }, 0.65)
        // text column drifts slower than the page; ghost text glides sideways; client photos ripple
        .fromTo('[data-td="par"]', { y: () => (small() ? 18 : 46) }, { y: () => (small() ? -18 : -46), ease: 'none', duration: 1 }, 0)
        .fromTo('[data-td="ghost"]', { xPercent: 0 }, { xPercent: -28, ease: 'none', duration: 1 }, 0)
        .fromTo('[data-td="ava"]', { y: (i: number) => Math.sin(i * 0.9) * 10 }, { y: (i: number) => -Math.sin(i * 0.9) * 10, ease: 'none', duration: 1 }, 0);
      setFan();
    },
    { scope: ref, dependencies: [n] },
  );

  const current: Testimonial | undefined = items?.[top];

  const controls = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Previous testimonial"
        onClick={() => prev()}
        className="w-11 h-11 rounded-full border border-brand-blue/30 bg-white text-brand-blue flex items-center justify-center shadow-sm transition-[background-color,color,scale] duration-300 hover:bg-brand-blue hover:text-white active:scale-90"
      >
        <Icon name="arrow_back" className="text-[18px]" />
      </button>
      <button
        type="button"
        aria-label="Next testimonial"
        onClick={() => next(1)}
        className="w-11 h-11 rounded-full border border-brand-blue/30 bg-white text-brand-blue flex items-center justify-center shadow-sm transition-[background-color,color,scale] duration-300 hover:bg-brand-blue hover:text-white active:scale-90"
      >
        <Icon name="arrow_forward" className="text-[18px]" />
      </button>
      {/* autoplay progress (transform only) */}
      <span className="relative h-0.5 flex-1 min-w-16 rounded-full bg-brand-blue/15 overflow-hidden">
        <span data-td="bar" className="absolute inset-0 origin-left bg-brand-blue" style={{ transform: 'scaleX(0)' }} />
      </span>
    </div>
  );

  return (
    <section ref={ref} id="testimonials" aria-labelledby="td-title" className="relative max-w-[1520px] mx-auto px-4 sm:px-6 pt-8 sm:pt-10 lg:pt-12 pb-12 sm:pb-14 lg:pb-16 overflow-x-clip">
      {/* Faint ghost text gliding behind the heading (laptop widths and up) */}
      <div aria-hidden="true" className="hidden lg:block pointer-events-none select-none absolute left-0 top-4 whitespace-nowrap">
        <div
          data-td="ghost"
          className="font-display font-extrabold uppercase leading-none tracking-tight text-[length:clamp(4rem,9vw,8rem)] text-transparent [-webkit-text-stroke:1.5px_rgb(1_68_181/0.07)]"
        >
          Client voices ✦ Client voices ✦ Client voices ✦ Client voices
        </div>
      </div>
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Text + (desktop) controls */}
        <div data-td="par" className="lg:col-span-5">
          <span data-td="kicker" className="inline-flex items-center gap-3 font-mono text-[11px] text-brand-blue tracking-[0.3em] uppercase font-bold mb-3">
            <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
            {t('home_voices_kicker')}
          </span>
          <h2 id="td-title" className="font-display font-extrabold text-[length:clamp(2.25rem,5vw,3.5rem)] leading-[1] text-midnight tracking-tight uppercase">
            <span className="inline-block overflow-hidden align-bottom pb-[0.06em]"><span data-td="word" className="inline-block">{titlePlain}</span></span>{' '}
            <span className="inline-block overflow-hidden align-bottom pb-[0.06em]"><span data-td="word" className={`inline-block pb-[0.06em] ${STATIC_GRADIENT}`}>{titleBright}</span></span>
          </h2>
          <p data-td="copy" className="mt-4 text-midnight/80 text-sm sm:text-base leading-relaxed max-w-md">
            {t('home_voices_text')}
          </p>

          {items && n > 1 && (
            <div data-td="copy" className="hidden lg:block mt-8">
              {/* client photos: jump straight to someone's card */}
              <div role="tablist" aria-label="Choose a client" className="flex flex-wrap items-center gap-2.5">
                {items.map((t, i) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    data-td="ava"
                    aria-selected={i === top}
                    aria-label={`${t.name}, ${t.subtitle}`}
                    onClick={() => jump(i)}
                    className={`rounded-full p-0.5 border-2 transition-[border-color,opacity,scale] duration-300
                      ${i === top ? 'border-brand-blue scale-110' : 'border-transparent opacity-60 grayscale hover:opacity-100 hover:grayscale-0'}`}
                  >
                    <Avatar t={t} className="block w-11 h-11" sizes="44px" />
                  </button>
                ))}
              </div>
              <div className="mt-5 max-w-sm">{controls}</div>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-midnight/65 font-semibold">Drag or flick the card</p>
            </div>
          )}
        </div>

        {/* Deck */}
        <div className="lg:col-span-7">
          {failed ? (
            <p className="text-midnight/70">Testimonials are taking a moment to load.</p>
          ) : (
            <div
              data-td="deck"
              tabIndex={0}
              aria-roledescription="carousel"
              aria-label={current ? `Testimonial from ${current.name}. Use the arrow keys for more.` : 'Testimonials'}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') { e.preventDefault(); next(1); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
              }}
              className="relative mx-auto w-full max-w-[560px] pb-4 rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-brand-blue"
            >
              {/* glow behind the stack */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-8 sm:-inset-12 -z-10"
                style={{ background: 'radial-gradient(closest-side, rgb(1 68 181 / 0.12), transparent)' }}
              />
              {/* every card shares one grid cell, so the deck is as tall as its longest quote */}
              <div data-td="tilt" className="grid [&>*]:col-start-1 [&>*]:row-start-1">
                {(items ?? [null]).map((t, i) =>
                  t ? (
                    // slot: stacking order + the scroll fan-out (spread grows with depth, alternating sides)
                    <div
                      key={t.id}
                      data-td-slot={i}
                      className="grid"
                      style={{
                        transform:
                          'translateX(calc(var(--d, 0) * var(--s, 1) * var(--fan, 0) * 24px)) rotate(calc(var(--d, 0) * var(--s, 1) * var(--fan, 0) * 4deg))',
                      }}
                    >
                    <article
                      data-td-card={i}
                      aria-hidden={i !== top}
                      className="relative flex flex-col select-none touch-pan-y cursor-grab active:cursor-grabbing rounded-3xl bg-white border border-brand-blue/15
                        shadow-[0_20px_50px_-22px_rgb(1_68_181/0.35)] p-5 sm:p-7 overflow-hidden will-change-transform"
                      style={{ visibility: 'hidden' }}
                    >
                      <span aria-hidden="true" className="absolute top-0 inset-x-10 h-0.5 rounded-full bg-linear-to-r from-transparent via-brand-blue to-transparent" />
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-6 right-4 sm:right-6 font-serif leading-none text-[7rem] sm:text-[8.5rem] text-transparent [-webkit-text-stroke:2px_rgb(1_68_181/0.1)]"
                      >
                        &rdquo;
                      </span>
                      <p className={`relative text-midnight/85 ${quoteSize(t.quote)}`}>{t.quote}</p>
                      <div className="relative mt-auto pt-5 sm:pt-6">
                        <div className="pt-4 border-t border-brand-blue/10 flex items-center gap-3">
                          <Avatar t={t} className="w-10 h-10 sm:w-11 sm:h-11" />
                          <div className="min-w-0">
                            <p className="font-display font-bold uppercase tracking-tight text-midnight truncate">{t.name}</p>
                            <p className="font-mono text-[11px] uppercase tracking-wider text-brand-blue font-semibold">{t.subtitle}</p>
                          </div>
                        </div>
                      </div>
                      {/* soft tint on cards further back in the stack */}
                      <span data-td="shade" aria-hidden="true" className="pointer-events-none absolute inset-0 bg-canvas opacity-0" />
                    </article>
                    </div>
                  ) : (
                    <div key="sk" className="h-80 rounded-3xl bg-brand-blue/10 animate-pulse" aria-busy="true" />
                  ),
                )}
              </div>
            </div>
          )}

          {/* Phones / tablets: controls under the deck */}
          {items && n > 1 && (
            <div data-td="copy" className="lg:hidden mx-auto w-full max-w-[560px] mt-7">
              {controls}
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex gap-1.5" role="tablist" aria-label="Choose a client">
                  {items.map((t, i) => (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={i === top}
                      aria-label={`${t.name}, ${t.subtitle}`}
                      onClick={() => jump(i)}
                      className="py-2"
                    >
                      <span className={`block h-1.5 rounded-full transition-all duration-500 ${i === top ? 'w-6 bg-brand-blue' : 'w-1.5 bg-brand-blue/25'}`} />
                    </button>
                  ))}
                </div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-midnight/65 font-semibold">Swipe the card</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Icon from '../Icon';
import ProjectForm from './ProjectForm';
import { BlogHead, Cover, PostsFallback, ViewAll, shimmer } from './parts';
import { calm, playOnView, usePosts } from './data';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const COUNT = 4;
// Floating cover that follows the cursor: only with a mouse and room for it
// (must match the pointer-fine:lg: classes in the markup)
const FLOAT_QUERY = '(pointer: fine) and (min-width: 1024px)';

/** Home page blog: the latest posts as big title rows (with a mouse, a cover floats after the cursor), then the enquiry band. */
export default function BlogSection() {
  const ref = useRef<HTMLElement>(null);
  const { posts, failed } = usePosts();
  const list = posts?.slice(0, COUNT) ?? [];
  // No posts in the admin: only the enquiry band stays
  const none = posts?.length === 0;

  // ---- Heading + enquiry band reveal (independent of the posts, which can take a while on a cold API) ----
  useGSAP(
    () => {
      const move = (v: number) => (calm() ? 0 : v);
      const tl = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-bh="kicker"]', { y: move(10), autoAlpha: 0, duration: 0.7 }, 0)
        .from('[data-bh="word"]', { yPercent: move(110), autoAlpha: calm() ? 0 : 1, duration: 1.1, stagger: 0.1 }, 0.1)
        .from('[data-bh="copy"]', { y: move(16), autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.35);
      const band = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-pf="box"]', { y: move(70), scale: calm() ? 1 : 0.96, autoAlpha: 0, duration: 1.2 })
        .from('[data-pf="in"]', { y: move(22), autoAlpha: 0, duration: 0.9, stagger: 0.07 }, 0.2);
      if (!calm()) {
        gsap.fromTo(
          '[data-bl="ghost"]',
          { xPercent: 0 },
          { xPercent: -28, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: 0.6 } },
        );
      }
      const a = playOnView(ref.current, tl);
      const b = playOnView(ref.current!.querySelector('[data-pf="box"]'), band);
      return () => {
        a?.();
        b?.();
      };
    },
    { scope: ref },
  );

  // ---- Rows: rules draw across, titles rise out of their masks; on scroll the rows ease in from alternate sides ----
  useGSAP(
    () => {
      if (!list.length) return;
      const still = calm();
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
      if (!still) {
        tl.from('[data-bl="rule"]', { scaleX: 0, duration: 1.2, stagger: 0.1 }, 0)
          .from('[data-bl="t"]', { yPercent: 105, duration: 1.1, stagger: 0.1 }, 0.1)
          .from('[data-bl="thumb"]', { scale: 0.6, duration: 1, stagger: 0.1 }, 0.1);
      }
      tl.from('[data-bl="fade"]', { autoAlpha: 0, duration: 0.8, stagger: 0.04 }, 0.25);
      const cleanup = playOnView(ref.current!.querySelector('[data-bl="list"]'), tl);

      if (!still) {
        gsap.utils.toArray<HTMLElement>('[data-bl="slide"]').forEach((row, i) => {
          gsap.fromTo(
            row,
            { xPercent: i % 2 ? 6 : -6 },
            { xPercent: 0, ease: 'power2.out', scrollTrigger: { trigger: row, start: 'top bottom', end: 'top 65%', scrub: 0.6 } },
          );
        });
      }
      return cleanup;
    },
    { scope: ref, dependencies: [list.length] },
  );

  // ---- Floating cover: follows the cursor with a little lag, leans into the movement, swaps image per row ----
  useGSAP(
    () => {
      if (!list.length) return;
      const root = ref.current!;
      const mm = gsap.matchMedia();
      mm.add(FLOAT_QUERY, () => {
        const ul = root.querySelector<HTMLElement>('[data-bl="list"]');
        const float = root.querySelector<HTMLElement>('[data-bl="float"]');
        if (!ul || !float) return;
        const imgs = gsap.utils.toArray<HTMLElement>('[data-bl-img]', root);
        const still = calm();
        gsap.set(float, { xPercent: -50, yPercent: -50, scale: 0.4, autoAlpha: 0 });
        gsap.set(imgs, { autoAlpha: 0 });
        const xTo = gsap.quickTo(float, 'x', { duration: still ? 0.01 : 0.6, ease: 'power3' });
        const yTo = gsap.quickTo(float, 'y', { duration: still ? 0.01 : 0.6, ease: 'power3' });
        const rTo = gsap.quickTo(float, 'rotation', { duration: 0.7, ease: 'power3' });
        const half = () => float.offsetWidth / 2;
        // sits to the right of the cursor (left of it near the screen edge) so the title stays readable
        const place = (cx: number) => (cx + 40 + half() * 2 > window.innerWidth ? cx - 40 - half() : cx + 40 + half());
        let shown = -1;
        let lastX = 0;
        let settle: gsap.core.Tween | null = null;

        const show = (i: number) => {
          if (i === shown) return;
          shown = i;
          imgs.forEach((im, k) =>
            gsap.to(im, { autoAlpha: k === i ? 1 : 0, scale: k === i ? 1 : 1.12, duration: still ? 0 : 0.5, ease: 'power3.out', overwrite: 'auto' }),
          );
        };
        const onEnter = (e: PointerEvent) => {
          if (e.pointerType !== 'mouse') return;
          gsap.set(float, { x: place(e.clientX), y: e.clientY });
          xTo(place(e.clientX));
          yTo(e.clientY);
          lastX = e.clientX;
          gsap.to(float, { autoAlpha: 1, scale: 1, duration: still ? 0 : 0.55, ease: 'back.out(1.6)', overwrite: 'auto' });
        };
        const onMove = (e: PointerEvent) => {
          if (e.pointerType !== 'mouse') return;
          xTo(place(e.clientX));
          yTo(e.clientY);
          if (still) return;
          rTo(gsap.utils.clamp(-12, 12, (e.clientX - lastX) * 0.5));
          lastX = e.clientX;
          settle?.kill();
          settle = gsap.delayedCall(0.12, () => rTo(0));
        };
        const onOver = (e: PointerEvent) => {
          const row = (e.target as Element).closest<HTMLElement>('[data-bl-i]');
          if (row) show(Number(row.dataset.blI));
        };
        const onLeave = () => {
          gsap.to(float, { autoAlpha: 0, scale: 0.4, rotation: 0, duration: still ? 0 : 0.35, ease: 'power3.in', overwrite: 'auto' });
        };
        ul.addEventListener('pointerenter', onEnter);
        ul.addEventListener('pointermove', onMove);
        ul.addEventListener('pointerover', onOver);
        ul.addEventListener('pointerleave', onLeave);
        return () => {
          settle?.kill();
          ul.removeEventListener('pointerenter', onEnter);
          ul.removeEventListener('pointermove', onMove);
          ul.removeEventListener('pointerover', onOver);
          ul.removeEventListener('pointerleave', onLeave);
        };
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [list.length] },
  );

  return (
    <section ref={ref} id="blog" aria-labelledby={none ? undefined : 'blog-title'} className="relative max-w-[1520px] mx-auto px-4 sm:px-6 pt-8 sm:pt-10 lg:pt-12 pb-12 sm:pb-14 lg:pb-16 overflow-x-clip">
      {/* The floating cover (mouse + large screens only) */}
      {list.length > 0 && (
        <div
          data-bl="float"
          aria-hidden="true"
          className="hidden pointer-fine:lg:block pointer-events-none fixed left-0 top-0 z-30 w-[250px] xl:w-[280px] aspect-[3/2] overflow-hidden rounded-2xl bg-midnight shadow-2xl shadow-midnight/30 ring-1 ring-white/20 invisible"
        >
          {list.map((p, i) =>
            p.image ? (
              <span key={p.id} data-bl-img={i} className="absolute inset-0">
                <Image src={p.image} alt="" fill sizes="280px" className="object-cover scale-125 blur-xl saturate-150" />
                <Image src={p.image} alt="" fill sizes="280px" className="object-contain" />
              </span>
            ) : (
              <span key={p.id} data-bl-img={i} className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-midnight via-[#0a2a80] to-brand-blue">
                <Icon name="article" className="text-[44px] text-white/25" />
              </span>
            ),
          )}
        </div>
      )}

      {/* Faint ghost text gliding behind the heading (laptop widths and up) */}
      <div aria-hidden="true" className={`${none ? 'hidden' : 'hidden lg:block'} pointer-events-none select-none absolute left-0 top-4 whitespace-nowrap`}>
        <div
          data-bl="ghost"
          className="font-display font-extrabold uppercase leading-none tracking-tight text-[length:clamp(4rem,9vw,8rem)] text-transparent [-webkit-text-stroke:1.5px_rgb(1_68_181/0.07)]"
        >
          Latest writing ✦ Latest writing ✦ Latest writing ✦ Latest writing
        </div>
      </div>

      <div className="relative">
        {!none && <BlogHead id="blog-title" action={<span className="hidden lg:inline-flex"><ViewAll /></span>} />}

        <div className={none ? 'hidden' : 'mt-6 lg:mt-8'}>
          <PostsFallback failed={failed}>
            <ul data-bl="list" className="relative border-b border-brand-blue/15">
              {(posts ? list : [0, 1, 2, 3]).map((p, i) =>
                typeof p === 'number' ? (
                  <li key={i} aria-hidden="true" className="flex items-center gap-4 sm:gap-6 py-4 sm:py-5 border-t border-brand-blue/10">
                    <div className={`w-20 sm:w-28 aspect-[3/2] rounded-lg shrink-0 pointer-fine:lg:hidden ${shimmer}`} />
                    <div className={`hidden lg:block w-44 xl:w-52 h-3 rounded shrink-0 ${shimmer}`} />
                    <div className="flex-1 space-y-3">
                      <div className={`lg:hidden h-3 w-32 rounded ${shimmer}`} />
                      <div className={`h-5 sm:h-7 w-11/12 rounded-lg ${shimmer}`} />
                    </div>
                  </li>
                ) : (
                  <li key={p.id} className="relative">
                    <span data-bl="rule" aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-brand-blue/15 origin-left" />
                    <Link
                      href={p.href}
                      data-bl-i={i}
                      className="group relative flex items-center gap-4 sm:gap-6 py-4 sm:py-5 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                    >
                      {/* hover wash rising from the bottom rule */}
                      <span aria-hidden="true" className="absolute inset-y-0 -inset-x-3 rounded-2xl bg-brand-blue/[0.05] origin-bottom scale-y-0 transition-transform duration-500 ease-out group-hover:scale-y-100" />
                      <span data-bl="slide" className="relative flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
                        <span data-bl="fade" className="hidden pointer-fine:lg:block w-8 shrink-0 font-mono text-xs font-bold text-brand-blue/50 transition-colors duration-300 group-hover:text-brand-blue">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {/* touch screens and smaller widths get a thumbnail instead of the floating cover */}
                        <span data-bl="thumb" className="relative w-20 sm:w-28 aspect-[3/2] shrink-0 overflow-hidden rounded-lg bg-midnight pointer-fine:lg:hidden">
                          <Cover post={p} sizes="112px" />
                        </span>
                        {/* wide screens: tag, date and reading time get their own column */}
                        <span data-bl="fade" className="hidden lg:flex w-44 xl:w-52 shrink-0 flex-col gap-1 font-mono text-[11px] uppercase tracking-wider">
                          <span className="font-bold text-brand-blue truncate">{p.tag}</span>
                          <span className="text-midnight/50">
                            <time dateTime={p.iso}>{p.date}</time> · {p.minutes} min read
                          </span>
                        </span>
                        <span className="min-w-0 flex-1 transition-transform duration-500 ease-out pointer-fine:group-hover:translate-x-2">
                          <span data-bl="fade" className="lg:hidden flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider">
                            <span className="font-bold text-brand-blue truncate max-w-[60%]">{p.tag}</span>
                            <span aria-hidden="true" className="text-midnight/30">·</span>
                            <time dateTime={p.iso} className="text-midnight/50">{p.date}</time>
                            <span aria-hidden="true" className="hidden sm:inline text-midnight/30">·</span>
                            <span className="hidden sm:inline text-midnight/50">{p.minutes} min read</span>
                          </span>
                          <span className="block overflow-hidden mt-1 lg:mt-0 pb-[0.08em]">
                            <span
                              data-bl="t"
                              className="block font-display font-bold text-midnight tracking-tight leading-[1.2] text-[15px] sm:text-lg lg:text-[1.3rem] xl:text-[1.45rem] line-clamp-2 transition-colors duration-300 group-hover:text-brand-blue"
                            >
                              {p.title}
                            </span>
                          </span>
                        </span>
                      </span>
                      <span
                        data-bl="fade"
                        className="relative hidden sm:flex shrink-0 w-10 h-10 items-center justify-center rounded-full border border-brand-blue/25 text-brand-blue
                          transition-[background-color,color,border-color,rotate] duration-300 group-hover:bg-brand-blue group-hover:border-brand-blue group-hover:text-white group-hover:-rotate-45"
                      >
                        <Icon name="arrow_forward" className="text-[18px]" />
                      </span>
                    </Link>
                  </li>
                ),
              )}
            </ul>
            <div className="lg:hidden mt-6">
              <ViewAll />
            </div>
          </PostsFallback>
        </div>

        <div className={none ? undefined : 'mt-10 lg:mt-12'}>
          <ProjectForm />
        </div>
      </div>
    </section>
  );
}

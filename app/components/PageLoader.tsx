'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { LOADER_SEEN } from '../site/loader';
import { INTRO_FIRST_FRAME } from './introFirstFrame';

/*
 * The opening, on a visit's first page: the brand's logo animation (2 s), on its own background colour, then the
 * page. The files in /public/intro come from the brand video (media/brand/IMG_3137.MOV, kept out of git):
 *   ffmpeg -i IMG_3137.MOV -an -vf "crop=900:500:90:698,scale=720:400:flags=lanczos,format=yuv420p"
 *     -c:v libx264 -preset veryslow -crf 23 -profile:v high -tune animation -movflags +faststart intro.mp4
 *   (the same with -c:v libvpx-vp9 -crf 33 -b:v 0 for intro.webm; intro-still.jpg is its last frame)
 * The crop keeps the area the animation uses; everything outside it is the plain background, BACKDROP.
 */
const BACKDROP = '#fefefe';
/** If the video hasn't started this long after the page arrived, the finished logo shows instead (a slow connection) */
const START_WITHIN_MS = 1500;
/** Whatever happens, the opening never holds the page longer than this after it arrived */
const HARD_STOP_MS = 4000;

// Plain HTML, so it's in the page before any of the site's scripts load. Browsers hold back `autoplay` until the whole
// page has loaded (every image), so the one-line script right after the video starts it the moment it's parsed. Its
// first frame shows meanwhile, so the screen is never blank. A visitor who has seen the opening doesn't download it.
// (React wouldn't put `muted` into server-rendered HTML, and browsers only let muted video play on its own.)
const VIDEO_HTML = `<video muted playsinline preload="none" width="720" height="400" aria-hidden="true" poster="${INTRO_FIRST_FRAME}"
  style="display:block;width:100%;height:auto;background:${BACKDROP}">
  <source src="/intro/intro.webm" type="video/webm"><source src="/intro/intro.mp4" type="video/mp4"></video>
<script>(function(){var v=document.currentScript&&document.currentScript.previousElementSibling;if(!v)return;try{
if(document.documentElement.dataset.loader==='seen'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
v.dataset.asked=String(Math.round(performance.now()));
v.addEventListener('playing',function(){v.dataset.started=String(Math.round(performance.now()))},{once:true});
v.preload='auto';var p=v.play();if(p&&p.catch)p.catch(function(){})}catch(e){}})();</script>`;
// One object for every render: a new one makes React rewrite the HTML, which would restart the video
const VIDEO = { __html: VIDEO_HTML };

/**
 * Plays the brand's logo animation, then fades away once both the animation has finished and the page is ready.
 * If the video can't start in time (a slow connection, or a phone that won't play video in Low Power Mode) it shows
 * the finished logo instead; with reduced motion it shows that still briefly. Later pages of the visit don't show it
 * at all (see site/loader.ts).
 */
export default function PageLoader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const stillImg = useRef<HTMLImageElement>(null);
  const done = useRef(onDone);
  const [still, setStill] = useState(false);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const finish = () => requestAnimationFrame(() => done.current());
    if (document.documentElement.dataset.loader === 'seen') {
      finish();
      return;
    }
    const video = slot.current?.querySelector('video') ?? null;
    let left = false;
    let fade: gsap.core.Tween | null = null;
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, Math.max(0, ms)));

    const leave = () => {
      if (left) return;
      left = true;
      try {
        sessionStorage.setItem(LOADER_SEEN, '1');
      } catch {
        // private browsing: the opening simply plays again next time
      }
      fade = gsap.to(root.current, {
        autoAlpha: 0,
        duration: 0.45,
        ease: 'power2.out',
        onComplete: () => {
          finish();
        },
      });
    };
    let stillShown = false;
    // The still is in the page from the start, so it's usually ready; the video (or its first frame) stays until it is
    const showStill = () => {
      if (stillShown || left) return;
      stillShown = true;
      video?.pause();
      const img = stillImg.current;
      const swap = () => {
        setStill(true);
        later(650, leave);
      };
      if (!img || (img.complete && img.naturalWidth > 0)) swap();
      else {
        img.addEventListener('load', swap, { once: true });
        img.addEventListener('error', leave, { once: true });
      }
    };
    const started = () => !!video && (video.dataset.started !== undefined || (!video.paused && video.currentTime > 0));
    // the page's own clock from when the video was asked to play (when its HTML arrived), not from the click
    const asked = Number(video?.dataset.asked ?? performance.now());

    if (!video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      showStill();
    } else if (video.ended) {
      leave();
    } else {
      video.addEventListener('ended', leave, { once: true });
      if (!started()) {
        if (performance.now() >= asked + START_WITHIN_MS) showStill();
        else {
          later(asked + START_WITHIN_MS - performance.now(), () => {
            if (!started()) showStill();
          });
          // in case the early script couldn't start it
          if (video.paused) video.play()?.catch(showStill);
        }
      }
      later(asked + HARD_STOP_MS - performance.now(), leave);
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      fade?.kill();
    };
  }, []);

  return (
    <div ref={root} className="page-loader fixed inset-0 z-[99999] flex items-center justify-center" style={{ background: BACKDROP }}>
      <div className="relative w-[min(560px,86vw)]">
        <div ref={slot} className={still ? 'invisible' : undefined} dangerouslySetInnerHTML={VIDEO} suppressHydrationWarning />
        {/* the video's last frame, shown instead of it when it can't play; loaded with the page so it's ready */}
        {/* eslint-disable-next-line @next/next/no-img-element -- already sized for the video's box */}
        <img
          ref={stillImg}
          src="/intro/intro-still.jpg"
          alt={still ? 'IN-TA Solutions' : ''}
          width={720}
          height={400}
          loading="eager"
          className={`absolute inset-0 h-auto w-full ${still ? '' : 'opacity-0'}`}
        />
      </div>
    </div>
  );
}

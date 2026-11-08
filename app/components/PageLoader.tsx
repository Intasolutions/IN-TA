'use client';

import { useEffect, useRef } from 'react';
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
/** How long the finished logo shows when it stands in for the video */
const STILL_MS = 650;
/** Whatever happens, the opening never holds the page longer than this after it arrived */
const HARD_STOP_MS = 4000;
/** The fade at the end (globals.css, .page-loader) */
const FADE_MS = 450;

// Plain HTML with its own script, so the opening keeps time from the moment the page arrives, without waiting for the
// site's scripts: on a slow phone those can take many seconds, and the page is there to read long before. The script
// asks for the video at high priority (a <video> on its own is fetched last, after the page's scripts, and on a phone
// would miss its moment), starts it (browsers hold back `autoplay` until every image has loaded), shows the finished
// logo if it can't start in time, and ends the opening by marking <html data-loader="left">, which fades it out in CSS
// (on the compositor, so a busy phone can't stall it). A visitor who has seen the opening doesn't download any of it.
// (React wouldn't put `muted` into server-rendered HTML, and browsers only let muted video play on its own.)
const OPENING_HTML = `<img class="page-loader-still absolute inset-0 h-auto w-full" src="/intro/intro-still.jpg" width="720" height="400" alt="">
<video class="page-loader-video" muted playsinline preload="none" width="720" height="400" poster="${INTRO_FIRST_FRAME}"
  style="display:block;width:100%;height:auto;background:${BACKDROP}">
  <source src="/intro/intro.webm" type="video/webm"><source src="/intro/intro.mp4" type="video/mp4"></video>
<script>(function(){var v=document.currentScript&&document.currentScript.previousElementSibling,h=document.documentElement;
if(!v||h.dataset.loader==='seen')return;var box=v.closest('.page-loader'),img=box&&box.querySelector('img'),left=false,still=false;
v.dataset.asked=String(Math.round(performance.now()));
function leave(){if(left)return;left=true;try{sessionStorage.setItem('${LOADER_SEEN}','1')}catch(e){}
h.dataset.loaderLeft=String(Math.round(performance.now()));h.dataset.loader='left';try{window.dispatchEvent(new Event('inta:opening-left'))}catch(e){}}
function showStill(){if(still||left)return;still=true;try{v.pause()}catch(e){}
var swap=function(){if(left)return;box.setAttribute('data-still','');setTimeout(leave,${STILL_MS})};
if(!img||(img.complete&&img.naturalWidth>0))swap();else{img.addEventListener('load',swap,{once:true});img.addEventListener('error',leave,{once:true})}}
try{setTimeout(leave,${HARD_STOP_MS});
if(matchMedia('(prefers-reduced-motion: reduce)').matches){showStill();return}
v.addEventListener('playing',function(){v.dataset.started=String(Math.round(performance.now()))},{once:true});
v.addEventListener('ended',leave,{once:true});
setTimeout(function(){if(!v.dataset.started)showStill()},${START_WITHIN_MS});
var go=function(){if(left||still)return;v.preload='auto';var p=v.play();if(p&&p.catch)p.catch(showStill)};
var file=v.canPlayType('video/webm; codecs="vp9"')?'/intro/intro.webm':'/intro/intro.mp4';
if(window.fetch&&window.URL&&URL.createObjectURL)fetch(file,{priority:'high'}).then(function(r){if(!r.ok)throw 0;return r.blob()})
.then(function(b){if(left||still)return;v.src=URL.createObjectURL(b);go()}).catch(go);else go()}catch(e){leave()}})();</script>`;
// One object for every render: a new one makes React rewrite the HTML, which would restart the video
const OPENING = { __html: OPENING_HTML };

/**
 * The opening runs itself (above); this tells the site when it's over, so the page's entrance plays as it clears.
 * If the opening ended before the site's scripts arrived, the visitor has been reading the page already and its
 * entrance is skipped (see context/usePlayIntro). Later pages of the visit don't show it at all (see site/loader.ts).
 */
export default function PageLoader({ onDone }: { onDone: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const html = document.documentElement;
    let timer = 0;
    // once the fade has finished, so the opening isn't cut off halfway
    const afterFade = () => {
      const leftAt = Number(html.dataset.loaderLeft) || performance.now();
      timer = window.setTimeout(() => done.current(), Math.max(0, leftAt + FADE_MS - performance.now()));
    };
    if (html.dataset.loader === 'seen') {
      const frame = requestAnimationFrame(() => done.current());
      return () => cancelAnimationFrame(frame);
    }
    if (html.dataset.loader === 'left') afterFade();
    else if (!box.current?.querySelector('video')?.dataset.asked) {
      // its script didn't run (it always should): end the opening here rather than leave it over the page
      try {
        sessionStorage.setItem(LOADER_SEEN, '1');
      } catch {
        // private browsing: the opening simply plays again next time
      }
      html.dataset.loaderLeft = String(Math.round(performance.now()));
      html.dataset.loader = 'left';
      afterFade();
    } else window.addEventListener('inta:opening-left', afterFade, { once: true });
    return () => {
      window.removeEventListener('inta:opening-left', afterFade);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={box} aria-hidden="true" className="page-loader fixed inset-0 z-[99999] flex items-center justify-center" style={{ background: BACKDROP }} suppressHydrationWarning>
      {/* the logo animation, and its last frame to stand in when it can't play */}
      <div className="relative w-[min(560px,86vw)]" dangerouslySetInnerHTML={OPENING} suppressHydrationWarning />
    </div>
  );
}

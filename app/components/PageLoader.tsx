'use client';

import { useEffect, useMemo, useRef } from 'react';
import { getImageProps } from 'next/image';
import { LOADER_SEEN } from '../site/loader';
import { openingLines } from '../site/opening';
import { useSite } from '../site/SiteContext';

/*
 * The opening, on a visit's first page: a short start-up screen. A few lines are typed out (real figures from the admin:
 * the services, the projects, the office), a line fills, the INTA tile appears in the middle and glides up into its
 * place in the header as the page clears. 2.8 seconds, all of it CSS animation (globals.css, .boot), so it runs on the
 * compositor and plays in full even while a slow phone is still starting the page.
 */
/** The whole opening; globals.css (.boot, --boot-t) runs on the same clock */
const T_MS = 2800;
/** At 80% the white starts to clear (globals.css, boot-veil) and the tile is on its way to the header */
const LEAVING_MS = 2240;
/** With reduced motion: the lines, still, then the page */
const STILL_T_MS = 1400;
const STILL_LEAVING_MS = 1000;
/** The page's own entrance starts this long after the white starts to clear, when most of it has */
const READY_AFTER_MS = 250;
/** The last fade (globals.css, html[data-loader='left'] .boot) */
const FADE_MS = 250;

// The official logo, sized for the tile in the middle of the screen (up to 380 px wide)
const { props: logo } = getImageProps({ src: '/logo/logo-inta.png', alt: '', width: 774, height: 322, sizes: '(max-width: 640px) 260px, 360px' });
const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

// Its own script, in the HTML, so the opening keeps time from the moment the page arrives without waiting for the site's
// scripts. It measures where the header's tile is (the glide's end), ends the opening by marking <html data-loader>
// ("leaving" as the white clears, "left" at the end, which fades it out in CSS) and remembers for this tab that it has
// played. In a tab opened in the background it waits until the tab is looked at, so it's never over before it's seen.
const SCRIPT = `(function(){var s=document.currentScript,b=s&&s.parentNode,h=document.documentElement;
if(!b||h.dataset.loader==='seen')return;b.dataset.asked='1';
var still=false;try{still=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
var T=still?${STILL_T_MS}:${T_MS},L=still?${STILL_LEAVING_MS}:${LEAVING_MS},going=false,gone=false,began=false;
function now(){return String(Math.round(performance.now()))}
function tell(n){try{window.dispatchEvent(new Event(n))}catch(e){}}
function leave(){if(going)return;going=true;try{sessionStorage.setItem('${LOADER_SEEN}','1')}catch(e){}
h.dataset.loaderLeaving=now();if(h.dataset.loader!=='left')h.dataset.loader='leaving';tell('inta:opening-left')}
function end(){if(gone)return;leave();gone=true;h.dataset.loaderLeft=now();h.dataset.loader='left';tell('inta:opening-done')}
function place(){try{var t=document.querySelector('[data-logo-tile]'),c=b.querySelector('.boot-tile');if(!c)return;
var W=b.clientWidth,H=b.clientHeight,r=t&&t.getBoundingClientRect(),ok=!!r&&r.width>0&&r.bottom>4&&r.top<H,st=b.style;
st.setProperty('--gx',ok?(r.left+r.width/2-W/2).toFixed(1)+'px':'0px');st.setProperty('--gy',ok?(r.top+r.height/2-H/2).toFixed(1)+'px':'0px');
st.setProperty('--sx',ok?(r.width/c.offsetWidth).toFixed(4):'1');st.setProperty('--sy',ok?(r.height/c.offsetHeight).toFixed(4):'1')}catch(e){}}
function begin(){if(began)return;began=true;setTimeout(place,L-140);setTimeout(leave,L);setTimeout(end,T)}
function start(){b.removeAttribute('data-wait');place();if(still){begin();return}
b.addEventListener('animationstart',begin,{once:true});setTimeout(begin,400)}
try{if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',place,{once:true});
if(document.visibilityState==='hidden'){b.setAttribute('data-wait','');var v=function(){if(document.visibilityState==='hidden')return;
document.removeEventListener('visibilitychange',v);start()};document.addEventListener('visibilitychange',v)}else start()}catch(e){end()}})();`;

/**
 * The opening runs itself (above); this tells the site when the page's entrance may play (as the white clears) and
 * removes the opening once it has faded. If the opening ended before the site's scripts arrived, the visitor has been
 * reading the page already and its entrance is skipped (see context/usePlayIntro). Later pages of the visit don't show
 * it at all (see site/loader.ts); a page that takes long to arrive shows the short version (components/NavProgress).
 */
export default function PageLoader({ onReady, onGone }: { onReady: () => void; onGone: () => void }) {
  const site = useSite();
  const box = useRef<HTMLDivElement>(null);
  const ready = useRef(onReady);
  const gone = useRef(onGone);
  useEffect(() => {
    ready.current = onReady;
    gone.current = onGone;
  }, [onReady, onGone]);

  // One object per site: a new string would make React rewrite the HTML and restart the opening
  const opening = useMemo(() => {
    const lines = openingLines(site);
    const gap = Math.min(0.29, 1.15 / Math.max(1, lines.length - 1));
    const cols = Math.max(12, ...lines.map((l) => l.chars)) + 1;
    const typed = lines
      .map((l, i) => `<span class="boot-ln" style="--n:${l.chars};--d:${(0.05 + i * gap).toFixed(2)}s">${l.html}</span>`)
      .join('');
    return {
      __html:
        `<div class="boot" style="--cols:${cols};--type:${Math.min(0.28, gap).toFixed(2)}s"><div class="boot-veil"></div>` +
        `<div class="boot-term">${typed}<span class="boot-bar"></span></div>` +
        `<div class="boot-tile"><img src="${attr(logo.src)}" srcset="${attr(logo.srcSet ?? '')}" sizes="${attr(logo.sizes ?? '')}" width="774" height="322" alt="" decoding="async"></div>` +
        `<script>${SCRIPT}</script></div>`,
    };
  }, [site]);

  useEffect(() => {
    const html = document.documentElement;
    const timers: number[] = [];
    const at = (fn: () => void, time: number) => timers.push(window.setTimeout(fn, Math.max(0, time - performance.now())));
    let readied = false;
    let removed = false;
    const play = () => {
      if (readied) return;
      readied = true;
      ready.current();
    };
    const remove = () => {
      if (removed) return;
      removed = true;
      gone.current();
    };
    const leaving = () => at(play, (Number(html.dataset.loaderLeaving) || performance.now()) + READY_AFTER_MS);
    const left = () => {
      leaving();
      at(remove, (Number(html.dataset.loaderLeft) || performance.now()) + FADE_MS);
    };

    if (html.dataset.loader === 'seen') {
      const frame = requestAnimationFrame(() => {
        play();
        remove();
      });
      return () => cancelAnimationFrame(frame);
    }
    window.addEventListener('inta:opening-left', leaving);
    window.addEventListener('inta:opening-done', left);
    if (html.dataset.loader === 'left') left();
    else if (html.dataset.loader === 'leaving') leaving();
    else if (!box.current?.querySelector<HTMLElement>('.boot')?.dataset.asked) {
      // its script didn't run (it always should): the opening plays anyway, in CSS, and ends here on time
      const mark = (state: 'leaving' | 'left') => {
        try {
          sessionStorage.setItem(LOADER_SEEN, '1');
        } catch {
          // private browsing: the opening simply plays again next time
        }
        html.dataset[state === 'left' ? 'loaderLeft' : 'loaderLeaving'] = String(Math.round(performance.now()));
        html.dataset.loader = state;
        if (state === 'left') left();
        else leaving();
      };
      at(() => mark('leaving'), LEAVING_MS);
      at(() => mark('left'), T_MS);
    }
    return () => {
      window.removeEventListener('inta:opening-left', leaving);
      window.removeEventListener('inta:opening-done', left);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return <div ref={box} aria-hidden="true" className="page-loader fixed inset-0 z-[99999]" dangerouslySetInnerHTML={opening} suppressHydrationWarning />;
}

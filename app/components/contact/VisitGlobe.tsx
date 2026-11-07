'use client';

import { useEffect, useRef, useState } from 'react';
import { createGlobe, type Globe } from '../about/globe';
import { smooth, viewOf, TARGET } from '../about/mapCanvas';
import Icon from '../Icon';
import { useSite } from '../../site/SiteContext';
import { coords } from '../../site/site';

const SPIN_FROM = TARGET.lon + 70;
const FINAL_ZOOM = 0.72;
const SECONDS = 3.4;
const TURNED = 0.34; // on the camera's own scale, when it has finished turning to face the office

/** The earth from the About page, turning to face Wayanad and closing in on it each time this line is plugged in */
export default function VisitGlobe({ active }: { active: boolean }) {
  const site = useSite();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);
  const waitRef = useRef<HTMLParagraphElement>(null);
  const globeRef = useRef<Globe | null>(null);
  const drawRef = useRef<() => void>(() => {});
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!active || !canvas) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!globeRef.current) {
      globeRef.current = createGlobe(canvas, window.innerWidth < 768, () => drawRef.current());
      if (!globeRef.current) {
        queueMicrotask(() => setFailed(true));
        return;
      }
    }
    const globe = globeRef.current;
    const lost = () => setFailed(true);
    canvas.addEventListener('webglcontextlost', lost);

    let w = 1;
    let h = 1;
    const fit = () => {
      w = canvas.clientWidth || 1;
      h = canvas.clientHeight || 1;
      globe.resize(w, h, Math.min(window.devicePixelRatio || 1, 1.5));
      drawRef.current();
    };
    const sized = new ResizeObserver(fit);
    sized.observe(canvas);

    let raf = 0;
    let began = -1;
    const paint = (now: number) => {
      if (!globe.isReady()) {
        globe.clear();
        return false;
      }
      if (began < 0) began = now;
      if (waitRef.current) waitRef.current.style.opacity = '0';
      const t = still ? 1 : Math.min(1, (now - began) / (SECONDS * 1000));
      const z = t * FINAL_ZOOM;
      const radius0 = Math.min(w * 0.4, h * 0.42);
      const middle: [number, number] = [w / 2, h / 2];
      const v = viewOf({ w, z, radius0, start: middle, center: middle, spinLon: SPIN_FROM, spinLat: 8 });
      globe.draw({ cx: v.cx, cy: v.cy, R: v.R, lon0: v.lon0, lat0: v.lat0, fov: v.fov, time: now / 1000, fade: 0 });
      if (markerRef.current) markerRef.current.style.opacity = String(smooth(TURNED, TURNED + 0.12, z));
      return t < 1;
    };
    const loop = (now: number) => {
      raf = 0;
      if (paint(now) || !globe.isReady()) raf = requestAnimationFrame(loop);
    };
    drawRef.current = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    fit();
    drawRef.current();

    return () => {
      cancelAnimationFrame(raf);
      drawRef.current = () => {};
      sized.disconnect();
      canvas.removeEventListener('webglcontextlost', lost);
      globe.sleep();
    };
  }, [active]);

  useEffect(
    () => () => {
      globeRef.current?.destroy();
      globeRef.current = null;
    },
    [],
  );

  return (
    <div data-line className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-white/12 bg-[#01072b] sm:aspect-[2/1]">
      {failed ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <Icon name="location_on" className="text-[32px] text-[#9dbbff]" />
          <p className="font-mono text-[11px] uppercase tracking-wider text-white/70">{coords(site)}</p>
        </div>
      ) : (
        <>
          <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-500 data-[drawn]:opacity-100" />
          <p ref={waitRef} aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.2em] text-[#9dbbff] transition-opacity duration-500 sm:text-[11px]">Finding {site.address.district || 'us'}</p>
          {/* the office, once the earth has turned to face it */}
          <span ref={markerRef} aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 opacity-0">
            <span className="patch-ping absolute -left-2 -top-2 h-4 w-4 rounded-full border-2 border-[#9dbbff]" />
            <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-white shadow-[0_0_10px_2px_#5b8cff]" />
            <span className="absolute left-4 top-[-0.7em] whitespace-nowrap rounded bg-[#01072b]/85 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white sm:text-[11px]">IN-TA Solutions</span>
          </span>
        </>
      )}
    </div>
  );
}

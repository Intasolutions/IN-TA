'use client';

import { useEffect, useRef, useState } from 'react';

const SAMPLES = 5;
const INTERVAL_MS = 4000;

// Times a HEAD request for a tiny static file served from the frontend's edge (Vercel CDN).
// Deliberately not the Django API: it sleeps on Render's free tier and would show huge cold-start numbers.
async function ping(): Promise<number | null> {
  const start = performance.now();
  try {
    const res = await fetch('/ping.txt', { method: 'HEAD', cache: 'no-store' });
    return res.ok ? performance.now() - start : null;
  } catch {
    return null;
  }
}

/** Live round-trip time from the visitor's browser to our edge, with a sparkline of recent samples. */
export default function EdgePing() {
  const ref = useRef<HTMLDivElement>(null);
  const [samples, setSamples] = useState<number[]>([]);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const tick = async () => {
      const el = ref.current;
      // Only measure while the badge is actually on screen and the tab is visible
      const onScreen =
        el && el.offsetParent !== null && el.getBoundingClientRect().bottom > 0 && document.visibilityState === 'visible';
      if (onScreen) {
        const ms = await ping();
        if (cancelled) return;
        if (ms === null) {
          setOffline(true);
        } else {
          setOffline(false);
          setSamples((s) => [...s.slice(-(SAMPLES - 1)), ms]);
        }
      }
      timer = setTimeout(tick, INTERVAL_MS);
    };

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const latest = samples.at(-1);
  const max = Math.max(...samples, 1);
  const bars = Array.from({ length: SAMPLES }, (_, i) => samples[i - (SAMPLES - samples.length)]);

  return (
    <div ref={ref} className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3 font-mono text-[10px]">
        <span className="text-midnight/60 uppercase font-bold tracking-wider">EDGE PING · LIVE</span>
        <span className="relative flex h-2 w-2">
          {!offline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75" />}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${offline ? 'bg-midnight/30' : 'bg-brand-blue'}`} />
        </span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-mono text-xs font-bold text-brand-blue tabular-nums">
          {offline ? 'OFFLINE' : latest === undefined ? 'MEASURING…' : `${Math.round(latest)}ms`}
        </span>
        <span className="font-mono text-[10px] text-midnight/50">| YOUR CONNECTION</span>
      </div>
      {/* Sparkline of the last few real samples */}
      <div className="flex items-end gap-1 h-5 pt-1 mt-1 border-t border-brand-blue/10">
        {bars.map((v, i) => (
          <span
            key={i}
            className={`w-1.5 rounded-t-sm transition-[height] duration-500 ease-out ${
              v === undefined ? 'bg-brand-blue/20' : i === SAMPLES - 1 ? 'bg-brand-blue' : 'bg-brand-blue/60'
            }`}
            style={{ height: v === undefined ? '15%' : `${25 + (75 * v) / max}%` }}
          />
        ))}
      </div>
    </div>
  );
}

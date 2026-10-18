'use client';

import { useCallback, useEffect, useRef } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/<>[]+*';

/**
 * Text that decodes from random glyphs like a terminal readout.
 * Plays whenever `playKey` changes, and again on hover. The real text is
 * server-rendered, so it's always readable without JS.
 */
export default function Scramble({
  text,
  playKey = 0,
  duration = 700,
  className = '',
}: {
  text: string;
  playKey?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const raf = useRef(0);

  const play = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    const start = performance.now();

    const frame = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const settled = Math.floor(progress * text.length);
      let out = '';
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        out += i < settled || ch === ' ' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (progress < 1) raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
  }, [text, duration]);

  useEffect(() => {
    if (playKey > 0) play();
  }, [playKey, play]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <span ref={ref} onMouseEnter={play} className={className}>
      {text}
    </span>
  );
}

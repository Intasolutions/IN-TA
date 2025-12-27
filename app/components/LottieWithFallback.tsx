'use client';

import React, { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

type Props = {
  jsonPath: string;            // e.g. "/animations/service-bubble.json"
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  ariaLabel?: string;
  fallback?: React.ReactNode;
};

export default function LottieWithFallback({
  jsonPath,
  className,
  loop = true,
  autoplay = true,
  ariaLabel = 'Decorative animation',
  fallback,
}: Props) {
  const [data, setData] = useState<any | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // fetch the json at runtime to keep bundle small
    fetch(jsonPath)
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then((j) => {
        if (!cancelled) setData(j);
      })
      .catch(() => {
        if (!cancelled) setErrored(true);
      });
    return () => {
      cancelled = true;
    };
  }, [jsonPath]);

  // simple inline SVG fallback (small & accessible)
  const InlineSvgFallback = (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
      <circle cx="50" cy="50" r="28" fill="#0b2a5f" />
      <path d="M40 45 L50 55 L60 45" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );

  return (
    <div className={className} role="img" aria-label={ariaLabel}>
      {!errored && data ? (
        <Lottie animationData={data} loop={loop} autoplay={autoplay} />
      ) : (
        fallback ?? InlineSvgFallback
      )}

      {/* noscript: shows a static PNG if JS is disabled. Create this file optionally at same path .png */}
      <noscript>
        <img src={jsonPath.replace('.json', '.png')} alt={ariaLabel} style={{ width: '100%', height: 'auto' }} />
      </noscript>
    </div>
  );
}

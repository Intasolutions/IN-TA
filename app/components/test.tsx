// frontend/components/LottieWithFallback.tsx
'use client';

import React, { useState } from 'react';
import Lottie from 'lottie-react';

type Props = {
  src: string;                 // path to /public JSON; e.g. "/animations/service-icon.json"
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  alt?: string;                // accessible label
  fallbackSvg?: React.ReactNode; // optional inline SVG fallback
};

export default function LottieWithFallback({
  src,
  className,
  loop = true,
  autoplay = true,
  alt = 'Decorative animation',
  fallbackSvg,
}: Props) {
  const [hasError, setHasError] = useState(false);

  // Minimal accessible wrapper: role + aria-hidden when decorative
  return (
    <div className={className} role="img" aria-label={alt}>
      {!hasError ? (
        // try to render Lottie JSON
        <React.Suspense fallback={fallbackSvg ?? <InlineFallback />}>
          <Lottie
            animationData={require(`../../public${src}`).default} // Next.js: you can also import statically instead of require
            loop={loop}
            autoplay={autoplay}
            onError={() => setHasError(true)}
            style={{ width: '100%', height: '100%' }}
          />
        </React.Suspense>
      ) : (
        // when Lottie failed, show fallback
        fallbackSvg ?? <InlineFallback />
      )}

      {/* noscript: for users with JS disabled, show a static image */}
      <noscript>
        <img src={src.replace('.json', '.png')} alt={alt} style={{ width: '100%', height: 'auto' }} />
      </noscript>
    </div>
  );
}

/* tiny inline fallback SVG — replace with your brand mark or static icon */
function InlineFallback() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#0b2a5f" />
      <path d="M8 10l4 4 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

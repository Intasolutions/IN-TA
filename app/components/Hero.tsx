'use client';

import React from 'react';

export default function Hero() {
  return (
    <section aria-label="Hero video" className="relative">
      <div className="relative h-[100vh] min-h-[520px] flex w-full overflow-hidden">
        {/* Global Continuous Video Background */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none">
          <video
            className="w-full h-full object-cover"
            src="/hero/web.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
          />
        </div>
      </div>
    </section>
  );
}
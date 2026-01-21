'use client';

import React, { useEffect, useRef } from 'react';

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // 1. Force video to play programmatically on mount
    // This fixes issues where "autoPlay" attribute is ignored by some mobile browsers
    const videoElement = videoRef.current;
    
    if (videoElement) {
      // Ensure it's muted programmatically before playing (safeguard for strict browsers)
      videoElement.muted = true;
      
      const playPromise = videoElement.play();
      
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log("Auto-play was prevented:", error);
          // Optional: Show a "Play" button UI here if autoplay fails (e.g. Low Power Mode)
        });
      }
    }
  }, []);

  return (
    <section aria-label="Hero video" className="relative">
      <div className="relative h-[100vh] min-h-[520px] flex w-full overflow-hidden">
        {/* Global Continuous Video Background */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            src="/hero/web.mp4"
            /* poster="/hero/poster.jpg"  <-- HIGHLY RECOMMENDED: Add a static image fallback 
              for Low Power Mode on iPhone where video autoplay is strictly disabled.
            */
            autoPlay
            loop
            muted
            playsInline // Critical for iOS: prevents video from going fullscreen automatically
            preload="auto"
          />
        </div>
      </div>
    </section>
  );
}
'use client';

import React, { useEffect, useRef } from 'react';

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.muted = true;
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log("Auto-play prevented:", error);
        });
      }
    }
  }, []);

  return (
    <section aria-label="Hero" className="relative">

      <div className="relative h-[100vh] min-h-[520px] flex w-full overflow-hidden bg-black">
        {/* Global Continuous Video Background */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            src="/hero/web.mp4"
            poster="/hero-bg.png"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          />
          <div className="absolute inset-0 bg-black/50 z-10" />
        </div>

        {/* Polished SEO-Focused Content Overlay */}
        {/* Adjusted padding: lifted it away from the bottom curve */}
        <div className="relative z-20 w-full h-full flex items-end justify-start p-8 pb-28 md:p-16 md:pb-20 lg:p-24 lg:pb-28">
          <div className="max-w-4xl">
            {/* Softened the font weight and adjusted the gradient */}
            <h1 className="text-[36px] md:text-[52px] font-bold text-white leading-[1.15] tracking-tight drop-shadow-md overflow-hidden pb-2">
              <span className="block" data-reveal="mask-up">
                Engineering Digital<br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-indigo-400">
                  Excellence in Wayanad
                </span>
              </span>
            </h1>

            {/* Removed uppercase, made it lighter and more readable */}
            <p className="text-base md:text-xl text-gray-200 font-light mt-5 max-w-2xl leading-relaxed" data-reveal="cascade">
              Software development & mobile app solutions for Kerala's growing digital economy.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
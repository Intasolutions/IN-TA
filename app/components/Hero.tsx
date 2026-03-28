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
            preload="auto"
            // @ts-ignore - fetchPriority is a newer attribute
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-black/50 z-10" />
        </div>

        {/* SEO-Focused Content Overlay */}
        <div className="relative z-20 w-full h-full flex items-end justify-start p-8 md:p-30 ">
          <div className="max-w-4xl">
            {/* Keep it as H1. 
      Use 'text-3xl' (approx 30px) but keep font-bold 
      to ensure it still looks like a 'Heading' to crawlers.
    */}
            <h1 className="text-[30px] md:text-[56px] font-black text-white leading-[1.1] tracking-tighter drop-shadow-lg">
              Engineering Digital<br />
              <span className="text-[#1f6fe6] italic">Excellence in Wayanad</span>
            </h1>

            <p className="text-sm md:text-lg text-blue-100/70 font-medium uppercase mt-4 max-w-xl">
              Software Development & Mobile App Solutions for Kerala's Growing Digital Economy
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';

export default function PageLoader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({
      defaults: { ease: 'power4.out' },
      onComplete: () => { requestAnimationFrame(onDone); },
    });

    tl.from('.logo', {
      opacity: 0,
      scale: 0.9,
      duration: 0.8,
    })
      .from(
        '.loader-line',
        { scaleX: 0, duration: 1 },
        '-=0.2'
      )
      .to('.logo', {
        opacity: 0,
        y: -16,
        duration: 0.4,
      })
      .to(root.current, {
        yPercent: -100,
        duration: 0.9,
        ease: 'power4.inOut',
        clearProps: 'all',
      });
  }, [onDone]);

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[99999] bg-black flex items-center justify-center"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="logo">
          <Image
            src="/logo/logo-inta-light.png"
            alt="INTA"
            width={140}
            height={32}
            priority
          />
        </div>

        <div className="w-[180px] h-[2px] bg-white/20 overflow-hidden">
          <div className="loader-line h-full bg-white origin-left" />
        </div>
      </div>
    </div>
  );
}

// frontend/components/TechStack.tsx
'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReveal } from '../context/RevealContext';

gsap.registerPlugin(ScrollTrigger);

type Tool = {
  id: string;
  name: string;
  logo?: string;
  accent?: string;
};

const tools: Tool[] = [
  { id: 'python', name: 'Python', logo: '/logos/python.svg', accent: '#3776AB' },
  { id: 'openai', name: 'OpenAI', logo: '/logos/openai.svg', accent: '#10A37F' },
  { id: 'pytorch', name: 'PyTorch', logo: '/logos/pytorch.svg', accent: '#EE4C2C' },
  { id: 'tensorflow', name: 'TensorFlow', logo: '/logos/tensorflow.svg', accent: '#FF6F00' },
  { id: 'react', name: 'React', logo: '/logo/React.svg', accent: '#61dafb' },
  { id: 'next', name: 'Next.js', logo: '/next.svg', accent: '#000000' },
  { id: 'node', name: 'Node.js', logo: '/logo/node.svg', accent: '#83CD29' },
  { id: 'ts', name: 'TypeScript', logo: '/logo/typescript.svg', accent: '#2f74c0' },
  { id: 'figma', name: 'Figma', logo: '/logos/figma.svg', accent: '#f24e1e' },
  { id: 'aws', name: 'AWS', logo: '/logos/aws.svg', accent: '#ff9900' },
  { id: 'docker', name: 'Docker', logo: '/logos/docker.svg', accent: '#2496ed' },
  { id: 'tailwind', name: 'Tailwind', logo: '/logos/tailwind.svg', accent: '#06b6d4' },
];

export default function TechStack() {
  const containerRef = useRef<HTMLElement>(null);
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);
  const { isRevealed } = useReveal();

  useEffect(() => {
    if (!isRevealed || !containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. Reveal the section
      gsap.fromTo('.marquee-content',
        { autoAlpha: 0, y: 30 },
        { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1 }
      );

      // 2. Infinite Marquee Animation
      // Row 1: Left
      if (row1Ref.current) {
        // Clone is handled in render, we just animate the container
        const width = row1Ref.current.scrollWidth / 2; // Assuming double content
        gsap.to(row1Ref.current, {
          x: -width,
          duration: 30, // Speed control: Lower = Faster
          ease: 'none',
          repeat: -1,
        });
      }

      // Row 2: Right
      if (row2Ref.current) {
        const width = row2Ref.current.scrollWidth / 2;
        // Start from -width and go to 0 to simulate right movement
        gsap.fromTo(row2Ref.current,
          { x: -width },
          { x: 0, duration: 35, ease: 'none', repeat: -1 }
        );
      }

    }, containerRef);

    return () => ctx.revert();
  }, [isRevealed]);

  // Pause on hover handlers
  const onEnter = (ref: React.RefObject<HTMLDivElement>) => {
    gsap.to(ref.current, { timeScale: 0.2, duration: 0.5, overwrite: true }); // Slow down instead of full pause for smoother feel
  };
  const onLeave = (ref: React.RefObject<HTMLDivElement>) => {
    gsap.to(ref.current, { timeScale: 1, duration: 0.5, overwrite: true });
  };

  return (
    <section ref={containerRef} className="py-24 bg-[#fbf9f5] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-60">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-50 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10 px-6 md:px-20 mb-16 text-center marquee-content">
        <span className="text-sm font-bold tracking-wider text-[#0b2a5f] uppercase mb-3 block">Our Arsenal</span>
        {/* CORRECTED HEADING COLOR */}
        <h2 className="text-4xl md:text-5xl font-extrabold text-[#0b2a5f] mb-6">
          Powered by modern <br /> <span className=" text-[#0b2a5f] bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">engineering standards</span>
        </h2>

      </div>

      {/* Marquee Rows */}
      <div className="relative w-full overflow-hidden marquee-content space-y-8">
        {/* Row 1 (Left) */}
        <div
          className="flex w-max space-x-6"
          ref={row1Ref}
          onMouseEnter={() => gsap.globalTimeline.timeScale(0.5)} // simpler global slow for effect
          onMouseLeave={() => gsap.globalTimeline.timeScale(1)}
        >
          {[...tools, ...tools, ...tools].map((tool, i) => (
            <MarqueeCard key={`${tool.id}-1-${i}`} tool={tool} />
          ))}
        </div>

        {/* Row 2 (Right) */}
        <div
          className="flex w-max space-x-6"
          ref={row2Ref}
          onMouseEnter={() => gsap.globalTimeline.timeScale(0.5)}
          onMouseLeave={() => gsap.globalTimeline.timeScale(1)}
        >
          {[...tools, ...tools, ...tools].reverse().map((tool, i) => (
            <MarqueeCard key={`${tool.id}-2-${i}`} tool={tool} />
          ))}
        </div>

        {/* Side Fades for Premium Look */}
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#fbf9f5] to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#fbf9f5] to-transparent z-20 pointer-events-none" />
      </div>

    </section>
  );
}

function MarqueeCard({ tool }: { tool: Tool }) {
  return (
    <div className="group relative w-60 h-24 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-4 px-6 transition-all duration-300 hover:shadow-lg hover:border-blue-100 hover:-translate-y-1">
      {/* Acccent bar */}
      <div className="absolute left-0 inset-y-4 w-1 rounded-r-full bg-slate-100 group-hover:bg-[var(--accent)] transition-colors duration-300" style={{ '--accent': tool.accent } as any} />

      <div className="relative w-10 h-10 shrink-0">
        {tool.logo ? (
          <Image src={tool.logo} alt={tool.name} fill className="object-contain" unoptimized />
        ) : (
          <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-400">{tool.name[0]}</div>
        )}
      </div>
      <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">{tool.name}</span>
    </div>
  );
}
// app/components/WhatsAppButton.tsx
'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

// Register extra GSAP plugins if needed (though not strictly required for this specific set, it's good practice)
gsap.registerPlugin(ScrollTrigger);

export default function WhatsAppButton() {
    const containerRef = useRef<HTMLDivElement>(null);
    const btnWrapperRef = useRef<HTMLDivElement>(null); // Wrapper for clipping sheen
    const btnRef = useRef<HTMLAnchorElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const textTitleRef = useRef<HTMLParagraphElement>(null);
    const textSubRef = useRef<HTMLSpanElement>(null);
    const arrowRef = useRef<HTMLSpanElement>(null);
    const sheenRef = useRef<HTMLDivElement>(null); // Ref for light sweep
    const rippleRef = useRef<HTMLDivElement>(null); // Ref for hover ripple

    const xTo = useRef<gsap.QuickToFunc | null>(null);
    const yTo = useRef<gsap.QuickToFunc | null>(null);
    const hoverTl = useRef<gsap.core.Timeline | null>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // 1. Setup Magnetic Physics
            if (btnWrapperRef.current) {
                xTo.current = gsap.quickTo(btnWrapperRef.current, "x", { duration: 0.4, ease: "power3.out" });
                yTo.current = gsap.quickTo(btnWrapperRef.current, "y", { duration: 0.4, ease: "power3.out" });
            }

            // 2. Entrance Animation (Pop in)
            gsap.fromTo(btnWrapperRef.current,
                { scale: 0, opacity: 0 },
                { scale: 1, opacity: 1, duration: 1, ease: "elastic.out(1, 0.5)", delay: 0.5 }
            );

            // 3. Idle Animation: "The Sheen Sweep"
            // Sweeps light across the button every 5 seconds
            const sheenTl = gsap.timeline({ repeat: -1, delay: 2, repeatDelay: 5 });
            sheenTl.fromTo(sheenRef.current,
                { xPercent: -150, skewX: -20 },
                { xPercent: 150, skewX: -20, duration: 1.5, ease: "power2.inOut" }
            );


            // 4. Define Hover Timeline
            hoverTl.current = gsap.timeline({ paused: true });
            hoverTl.current
                // Tooltip Slide Out
                .to(tooltipRef.current, {
                    x: -75, opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.5)"
                }, "start")
                // Button Reacts & Intensifies Glow
                .to(btnRef.current, {
                    scale: 1.1,
                    // Deeper, more intense green shadow on hover
                    boxShadow: "0 25px 50px -12px rgba(37,211,102,0.5)",
                    duration: 0.3
                }, "start")
                // The "Ripple" Outward Effect
                .fromTo(rippleRef.current,
                    { scale: 0.8, opacity: 0.6 },
                    { scale: 1.6, opacity: 0, duration: 0.6, ease: "power1.out" },
                    "start"
                )
                // Text Stagger
                .fromTo([textTitleRef.current, textSubRef.current],
                    { y: 5, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.3, stagger: 0.05, ease: "power2.out" },
                    "-=0.2"
                )
                // Arrow Nudge
                .fromTo(arrowRef.current,
                    { x: -5, opacity: 0 },
                    { x: 0, opacity: 1, duration: 0.3 },
                    "-=0.2"
                );

        }, containerRef);

        return () => ctx.revert();
    }, []);

    // --- Event Handlers ---
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!btnWrapperRef.current) return;
        const { left, top, width, height } = btnWrapperRef.current.getBoundingClientRect();
        // Calculate distance from center of the button wrapper
        const x = e.clientX - (left + width / 2);
        const y = e.clientY - (top + height / 2);
        xTo.current?.(x * 0.25); // Slightly stronger magnetic pull
        yTo.current?.(y * 0.25);
    };

    const handleMouseEnter = () => {
        hoverTl.current?.restart(); // Use restart so the ripple fires every time
    };

    const handleMouseLeave = () => {
        hoverTl.current?.reverse();
        xTo.current?.(0);
        yTo.current?.(0);
    };

    return (
        <div
            ref={containerRef}
            className="fixed bottom-8 right-8 z-[9999] flex items-center justify-end pointer-events-none"
        >
            {/* Mouse interaction zone with padding */}
            <div
                className="relative p-8 pointer-events-auto"
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {/* TOOLTIP */}
                <div
                    ref={tooltipRef}
                    // Changed z-index to -1 so it's truly behind the button wrapper
                    className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-3 bg-white/80 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.1)] pl-5 pr-10 py-3 rounded-2xl opacity-0 scale-95 origin-right transition-colors hover:bg-white/90 cursor-pointer z-[-1]"
                    onClick={() => window.open('https://wa.me/919447595381', '_blank')}
                >
                    <div className="flex flex-col items-start min-w-[120px]">
                        <p ref={textTitleRef} className="text-[15px] font-bold text-slate-800 leading-none mb-1">
                            Need help?
                        </p>
                        <span ref={textSubRef} className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            Chat with support
                        </span>
                    </div>
                    <span ref={arrowRef} className="text-green-500">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </span>
                </div>

                {/* BUTTON WRAPPER (Handles Magnetic Movement & Clipping) */}
                <div ref={btnWrapperRef} className="relative rounded-full overflow-hidden">

                    {/* The Hover Ripple Effect (Behind main button) */}
                    <div
                        ref={rippleRef}
                        className="absolute inset-0 rounded-full bg-green-400/30 blur-md z-0"
                    />

                    {/* MAIN BUTTON LINK */}
                    <a
                        ref={btnRef}
                        href="https://wa.me/919447595381"
                        target="_blank"
                        rel="noopener noreferrer"
                        // Added a default subtle green glow shadow
                        className="relative z-10 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] shadow-[0_15px_35px_-5px_rgba(37,211,102,0.4)]"
                        aria-label="Chat on WhatsApp"
                    >
                        {/* Base Gradient */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#34e773] to-[#128C7E] opacity-100" />

                        {/* IDLE ANIMATION: The Sheen Sweep Layer */}
                        <div
                            ref={sheenRef}
                            className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -skew-x-12 pointer-events-none mix-blend-overlay"
                        />

                        {/* Glassy Top Reflection (Static polished look) */}
                        <div className="absolute inset-x-3 top-1 h-/5 bg-gradient-to-b from-white/30 to-transparent rounded-t-full pointer-events-none" />

                        {/* WhatsApp Icon */}
                        <svg
                            className="w-[30px] h-[30px] text-white relative z-20 drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                    </a>
                </div>
            </div>
        </div>
    );
}
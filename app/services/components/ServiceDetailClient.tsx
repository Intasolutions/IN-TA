'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import CTA from '../../components/CTA';
import Link from 'next/link';

gsap.registerPlugin(ScrollTrigger);

interface Feature {
    name: string;
    slug: string;
}

interface Technology {
    name: string;
    slug: string;
}

interface Benefit {
    title: string;
    description: string;
}

interface Service {
    slug: string;
    title: string;
    long_description: string;
    short_description: string;
    image: string | null;
    icon_path: string | null;
    color: string;
    features: Feature[];
    technologies: Technology[];
    benefits: Benefit[];
    image_alt?: string;
}

const SERVICE_DEEP_DIVE: Record<string, string[]> = {
    'web-development': [
        "In the rapidly evolving digital landscape, a website is more than just a digital business card; it's the core of your digital identity. At INTA Solutions, our web engineering team in Kerala focuses on building high-performance, scalable, and secure web applications that drive business growth. We leverage modern frameworks like Next.js and React to deliver seamless user experiences that convert visitors into loyal customers.",
        "Our approach to web development is rooted in performance and scalability. We understand that every millisecond counts, which is why we optimize our codebeds for lightning-fast load times. Whether you need a sophisticated enterprise portal, a dynamic e-commerce platform, or a sleek corporate website, our architects in Wayanad ensure that your digital presence is built on a robust foundation capable of handling high traffic and complex interactions.",
        "Security is paramount in everything we build. We implement industry-leading security protocols to protect your data and your users' privacy. From SSL encryption to advanced threat protection, our web solutions are designed to be resilient against modern cyber threats. Furthermore, we prioritize accessibility and responsive design, ensuring your website provides an optimal experience across all devices, from desktops to smartphones.",
        "Continuous integration and continuous deployment (CI/CD) are integral to our development lifecycle. This allows us to push updates and new features quickly and reliably, keeping your web application ahead of the competition. By choosing INTA Solutions for your web development needs in Kerala, you are partnering with a team that values long-term stability and technological excellence."
    ],
    'mobile-app-development': [
        "Mobile applications have become the primary touchpoint for users interacting with brands. Our mobile engineering team specializes in crafting premium iOS and Android applications that stand out in the crowded app marketplace. We focus on creating intuitive, high-performance apps that leverage the latest mobile technologies to provide exceptional value to your users.",
        "We believe in a user-centric design philosophy. Every button, transition, and animation is carefully thought out to ensure a fluid and engaging user journey. Our design team works closely with our engineers in Wayanad to bridge the gap between aesthetics and functionality, resulting in mobile apps that are as beautiful as they are powerful.",
        "Performance is at the heart of our mobile solutions. We optimize our apps to ensure smooth performance even on lower-end devices and in varying network conditions. Whether we are building native apps or using cross-platform frameworks like React Native or Flutter, we prioritize native-like speed and responsiveness to provide the best possible experience for your customers.",
        "Beyond development, we offer comprehensive app store optimization (ASO) and deployment strategy services. We help you navigate the complexities of the App Store and Google Play, ensuring your app reaches its target audience effectively. With INTA Solutions, you get a mobile partner in Kerala dedicated to your app's success from initial concept to global launch."
    ],
    'ai-integration': [
        "Artificial Intelligence is no longer a futuristic concept; it's a powerful tool available today to drive operational efficiency and create new business opportunities. At INTA Solutions, we help businesses in Kerala and beyond integrate advanced AI and machine learning models into their existing ecosystems to automate complex tasks and gain deeper insights into their data.",
        "Our AI integration services range from natural language processing (NLP) and computer vision to predictive analytics and generative AI. We work with you to identify the areas of your business where AI can have the most significant impact, whether it's enhancing customer support with intelligent chatbots or optimizing supply chain operations through machine learning.",
        "We prioritize data privacy and ethics in all our AI projects. We ensure that the models we integrate are unbiased, transparent, and compliant with global data protection regulations. Our team in Wayanad is experienced in handling large datasets and training custom models tailored to your specific industry needs.",
        "The goal of our AI strategy is to empower your team, not replace them. By automating repetitive tasks, we free up your human talent to focus on high-value creative and strategic work. Partnering with us for AI integration means staying at the forefront of the technological revolution with a reliable and expert engineering team in Kerala."
    ]
};

export default function ServiceDetailClient({ service }: { service: Service }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const themeColor = service.color || '#1f6fe6'; // Your Dynamic Accent
    const brandNavy = '#0b2a5f'; // Your Core Navy
    const [relatedServices, setRelatedServices] = React.useState<any[]>([]);

    useEffect(() => {
        const fetchRelated = async () => {
            try {
                const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
                const res = await fetch(`${apiBase}/api/services/`);
                if (res.ok) {
                    const data = await res.json();
                    setRelatedServices(data.filter((s: any) => s.slug !== service.slug).slice(0, 3));
                }
            } catch (e) {
                console.error('Error fetching related services', e);
            }
        };
        fetchRelated();
    }, [service.slug]);

    useEffect(() => {
        if (!containerRef.current) return;

        console.log('Service Data:', service);

        const ctx = gsap.context(() => {
            // 1. Initial Hero Entrances
            gsap.from('.reveal-text', {
                y: 40,
                autoAlpha: 0,
                duration: 1.2,
                stagger: 0.1,
                ease: 'power3.out'
            });

            gsap.from('.hero-image-wrap', {
                scale: 1.05,
                autoAlpha: 0,
                duration: 1.8,
                ease: 'power2.out'
            });

            // 2. Scroll-Triggered Sections
            // We use fromTo for the opacity to ensure transparency is cleared if triggered quickly
            
            const bentoItems = gsap.utils.toArray('.bento-item');
            if (bentoItems.length > 0) {
                gsap.fromTo(bentoItems, 
                    { y: 50, opacity: 0 },
                    { 
                        y: 0, 
                        opacity: 1,
                        stagger: 0.1,
                        duration: 0.8,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: '.bento-container',
                            start: 'top 80%',
                            toggleActions: 'play none none none'
                        }
                    }
                );
            }

            const benefitItems = gsap.utils.toArray('.benefit-item');
            if (benefitItems.length > 0) {
                gsap.fromTo(benefitItems,
                    { x: -30, opacity: 0 },
                    {
                        x: 0,
                        opacity: 1,
                        stagger: 0.15,
                        duration: 1,
                        ease: 'power2.out',
                        scrollTrigger: {
                            trigger: '.impact-container',
                            start: 'top 75%'
                        }
                    }
                );
            }

            const techItems = gsap.utils.toArray('.tech-item');
            if (techItems.length > 0) {
                gsap.fromTo(techItems,
                    { y: 20, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        stagger: 0.05,
                        duration: 0.5,
                        scrollTrigger: {
                            trigger: '.tech-container',
                            start: 'top 85%'
                        }
                    }
                );
            }

            // Sync ScrollTrigger with potential resize/layout shifts
            const refreshST = () => ScrollTrigger.refresh();
            window.addEventListener('load', refreshST);
            setTimeout(refreshST, 1000); // Delayed refresh for safety

        }, containerRef);

        return () => ctx.revert();
    }, [service]);

    return (
        <main ref={containerRef} className="bg-[#fbf9f5] selection:bg-[#0b2a5f] selection:text-white">

            {/* 1. HERO SECTION: Editorial Minimalism */}
            <section className="relative min-h-screen flex flex-col justify-center px-6 pt-20">
                <div className="max-w-7xl mx-auto w-full">
                    <div className="grid lg:grid-cols-12 gap-12 items-center">

                        <div className="lg:col-span-8 z-10">
                            <div className="overflow-hidden mb-6">
                                <span className="reveal-text block text-sm font-bold tracking-[0.3em] uppercase text-slate-400">
                                    Premium Solutions / 01
                                </span>
                            </div>
                            <div className="overflow-hidden">
                                <h1 className="reveal-text text-[clamp(2.5rem,6vw,5.5rem)] font-black leading-[0.9] tracking-tighter text-[#0b2a5f]">
                                    {service.title} Services <br />
                                    <span className="text-xl md:text-2xl font-bold tracking-normal opacity-50 block mt-4">| INTA Solutions</span>
                                </h1>
                            </div>
                            <div className="mt-12 overflow-hidden">
                                <p className="reveal-text text-xl md:text-2xl text-slate-600 font-light max-w-2xl leading-relaxed">
                                    {service.long_description || service.short_description}
                                </p>
                            </div>
                            <div className="mt-12 flex flex-wrap gap-6 reveal-text">
                                <Link
                                    href="/contact"
                                    className="px-10 py-5 bg-[#0b2a5f] text-white rounded-full font-bold hover:scale-105 transition-transform shadow-2xl"
                                    style={{ boxShadow: `0 20px 40px -10px ${brandNavy}40` }}
                                >
                                    Get Started
                                </Link>
                                <Link href="/portfolio" className="px-10 py-5 border-2 border-[#0b2a5f]/10 text-[#0b2a5f] rounded-full font-bold hover:bg-white transition-colors">
                                    View Projects
                                </Link>
                            </div>
                        </div>

                        <div className="lg:col-span-4 relative">
                            <div className="hero-image-wrap relative aspect-[3/4] rounded-[40px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)]">
                                <img
                                    src={service.image || service.icon_path || '/api/placeholder/600/800'}
                                    alt={`${service.title} - Expertise by INTA Solutions Kerala`}
                                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0b2a5f]/60 to-transparent" />
                            </div>
                            {/* Floating Branding Element */}
                            <div className="absolute -bottom-6 -left-6 bg-white p-8 rounded-3xl shadow-xl hidden md:block border border-slate-100">
                                <div className="w-12 h-1 w-full mb-4" style={{ backgroundColor: themeColor }} />
                                <p className="text-[#0b2a5f] font-black text-xl italic tracking-tighter">INTA.</p>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* 2. CAPABILITIES: The Bento Architecture */}
            <section className="py-32 bg-white bento-container px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-20">
                        <h2 className="text-sm font-bold tracking-[0.5em] text-slate-300 uppercase mb-4">Core Framework</h2>
                        <h3 className="text-4xl md:text-6xl font-black text-[#0b2a5f] tracking-tight">Capabilities & Features</h3>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6">
                        {service.features && service.features.length > 0 ? (
                            service.features.map((f: Feature, i: number) => (
                                <div
                                    key={i}
                                    className={`bento-item p-10 rounded-[32px] border border-slate-100 hover:shadow-2xl transition-all duration-500 group
                                        ${i === 0 ? 'md:col-span-2 md:row-span-2 bg-[#fbf9f5]' : 'bg-white'}
                                    `}
                                >
                                    <div
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 group-hover:rotate-[10deg] transition-transform"
                                        style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <h4 className="text-2xl font-bold text-[#0b2a5f] mb-4">{f.name}</h4>
                                    <p className="text-slate-500 font-light leading-relaxed">
                                        Enterprise-grade implementation of {f.name.toLowerCase()} designed for maximum scalability.
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="md:col-span-4 p-20 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
                                <p className="text-slate-400 font-medium italic">Features are currently being curated for this service. Please check back soon.</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* 3. IMPACT: Deep Navy Immersion */}
            <section className="py-32 px-6 impact-container">
                <div className="max-w-7xl mx-auto rounded-[60px] bg-[#0b2a5f] p-8 md:p-24 overflow-hidden relative shadow-2xl">
                    <div className="relative z-10 grid lg:grid-cols-2 gap-20 items-center">
                        <div>
                            <h2 className="text-4xl md:text-7xl font-bold text-white mb-12 leading-[1.1] tracking-tighter">
                                Strategic <br /><span style={{ color: themeColor }}>Benefits.</span>
                            </h2>
                            <div className="space-y-10">
                                {service.benefits && service.benefits.length > 0 ? (
                                    service.benefits.map((b: Benefit, i: number) => (
                                        <div key={i} className="flex gap-6 items-start group benefit-item">
                                            <span className="text-white/20 font-black text-4xl group-hover:text-white transition-colors duration-500">0{i + 1}</span>
                                            <div>
                                                <h4 className="text-xl font-bold text-white mb-2">{b.title}</h4>
                                                <p className="text-blue-100/60 font-light">{b.description || 'Driving measurable growth and operational efficiency through custom-tailored strategies.'}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-10 border border-white/10 rounded-3xl bg-white/5">
                                        <p className="text-blue-100/40 italic">We are finalizing the strategic impact points for this solution. Contact us for a detailed brief.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="hidden lg:flex justify-center">
                            <div className="w-80 h-80 rounded-full border border-white/10 flex items-center justify-center relative animate-spin-slow">
                                <div className="absolute inset-4 border border-white/5 rounded-full" />
                                <div
                                    className="w-4 h-4 rounded-full absolute top-0 left-1/2 -translate-x-1/2"
                                    style={{ backgroundColor: themeColor }}
                                />
                                <span className="text-white font-black text-5xl italic tracking-tighter opacity-40">INTA</span>
                            </div>
                        </div>
                    </div>
                    {/* Decorative Blur */}
                    <div className="absolute top-0 right-0 w-96 h-96 blur-[120px] opacity-20 -mr-20 -mt-20" style={{ backgroundColor: themeColor }} />
                </div>
            </section>

            {/* 4. TECH STACK: Sophisticated Cleanliness */}
            <section className="py-24 px-6 border-b border-slate-100 tech-container">
                <div className="max-w-7xl mx-auto text-center">
                    <p className="text-xs font-bold tracking-[0.4em] text-slate-400 uppercase mb-16">Technology Ecosystem</p>
                    <div className="flex flex-wrap justify-center gap-4">
                        {service.technologies && service.technologies.length > 0 ? (
                            service.technologies.map((tech: Technology, i: number) => (
                                <div key={i} className="tech-item px-10 py-5 bg-white border border-slate-100 rounded-2xl text-[#0b2a5f] font-bold hover:border-[#0b2a5f] transition-all cursor-default shadow-sm">
                                    {tech.name}
                                </div>
                            ))
                        ) : (
                            <div className="px-10 py-5 bg-slate-50/50 rounded-2xl text-slate-400 italic">
                                Technology stack details coming soon.
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* NEW: 4.5 DEEP DIVE CONTENT */}
            <section className="py-32 px-6 bg-white overflow-hidden">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-sm font-bold tracking-[0.5em] text-slate-300 uppercase mb-8">In-Depth Expertise</h2>
                    <h3 className="text-3xl md:text-5xl font-black text-[#0b2a5f] mb-12 leading-tight">
                        Advancing {service.title} for the <span className="text-blue-600">Modern Enterprise.</span>
                    </h3>
                    <div className="prose prose-lg max-w-none text-slate-600 space-y-8 font-light leading-relaxed">
                        {SERVICE_DEEP_DIVE[service.slug] ? (
                            SERVICE_DEEP_DIVE[service.slug].map((para, i) => (
                                <p key={i}>{para}</p>
                            ))
                        ) : (
                            <>
                                <p>
                                    Our commitment to excellence in {service.title} is driven by a passion for delivering measurable results. 
                                    We understand that in today's digital-first economy, the quality of your technological infrastructure is 
                                    a critical differentiator. Our team of specialized engineers in Kerala works tirelessly to ensure that 
                                    every solution we deploy is optimized for reliability, performance, and long-term scalability.
                                </p>
                                <p>
                                    From high-performance web ecosystems to complex AI-driven data pipelines, we provide the technical 
                                    depth required to navigate contemporary business challenges. Our holistic approach ensures that 
                                    we don't just build software; we build robust digital foundations that empower your organization 
                                    to innovate and lead in your respective industry.
                                </p>
                                <p>
                                    As a leading software development company in Kerala, INTA Solutions combines global expertise with 
                                    local dedication. We pride ourselves on our transparent communication and our ability to translate 
                                    complex technical requirements into successful business outcomes. Whether you're a burgeoning startup 
                                    or a global enterprise, we have the specialized talent to elevate your digital presence.
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* NEW: 4.6 RELATED SERVICES */}
            {relatedServices.length > 0 && (
                <section className="py-32 px-6 bg-[#fbf9f5]">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-16">
                            <h2 className="text-sm font-bold tracking-[0.5em] text-slate-300 uppercase mb-4">Internal Synergies</h2>
                            <h3 className="text-3xl md:text-5xl font-black text-[#0b2a5f] tracking-tight">Related Solutions</h3>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            {relatedServices.map((rs, i) => (
                                <Link 
                                    key={i} 
                                    href={`/services/${rs.slug}`}
                                    className="group bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500"
                                >
                                    <div className="mb-8 overflow-hidden rounded-2xl aspect-video">
                                        <img 
                                            src={rs.image || rs.icon_path || '/api/placeholder/400/225'} 
                                            alt={`${rs.title} solutions Kerala`}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                    </div>
                                    <h4 className="text-2xl font-bold text-[#0b2a5f] mb-4 group-hover:text-blue-600 transition-colors">
                                        {rs.title}
                                    </h4>
                                    <p className="text-slate-500 font-light text-sm leading-relaxed mb-6">
                                        {rs.short_description}
                                    </p>
                                    <span className="text-xs font-bold text-[#0b2a5f] flex items-center gap-2">
                                        Exploration Link
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* 5. FINAL CTA: Massive Impact */}
            <section className="max-w-7xl mx-auto px-6 py-32">
                <div className="relative rounded-[50px] overflow-hidden bg-slate-50 border border-slate-100 p-12 md:p-32 text-center group">
                    <div className="relative z-10">
                        <h2 className="text-5xl md:text-8xl font-black text-[#0b2a5f] uppercase tracking-tighter mb-10">
                            Let's Build <br /> The Future<span style={{ color: themeColor }}>_</span>
                        </h2>
                        <Link
                            href="/contact"
                            className="inline-block px-14 py-6 bg-[#0b2a5f] text-white rounded-full text-xl font-bold hover:scale-105 transition-transform shadow-2xl"
                        >
                            Consult with our Experts
                        </Link>
                    </div>
                </div>
            </section>

        </main>
    );
}
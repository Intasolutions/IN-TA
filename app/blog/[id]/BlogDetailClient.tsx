'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type Blog = {
    id: string;
    title: string;
    date: string;
    tag?: string;
    image?: string;
    content?: string;
    image_alt?: string;
};

function fixImageUrl(img: string | null | undefined, apiBase: string): string {
    if (!img) return '/images/blog-placeholder.jpg';
    if (img.startsWith('/')) return `${apiBase}${img}`;
    if (img.includes('localhost') || img.includes('127.0.0.1')) {
        try {
            const url = new URL(img);
            return `${apiBase}${url.pathname}${url.search}`;
        } catch { }
    }
    return img;
}

export default function BlogDetailClient() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [blog, setBlog] = useState<Blog | null>(null);
    const [related, setRelated] = useState<Blog[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // Refs for GSAP animations
    const heroRef = useRef<HTMLDivElement>(null);
    const heroImgRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const metaRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const relatedRef = useRef<HTMLDivElement>(null);
    const breadcrumbRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function fetchData() {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            try {
                // Fetch the specific post and all posts in parallel
                const [postRes, allRes] = await Promise.all([
                    fetch(`${apiBase}/api/blog/posts/${id}/`),
                    fetch(`${apiBase}/api/blog/posts/`),
                ]);

                if (!postRes.ok) {
                    setNotFound(true);
                    return;
                }

                const postData = await postRes.json();
                const allData = await allRes.json();

                const mapBlog = (item: Record<string, unknown>): Blog => ({
                    id: String(item.id),
                    title: item.title as string,
                    date: item.date as string,
                    tag: (item.tag as string) || 'Update',
                    image: fixImageUrl(item.image as string | null, apiBase),
                    content: (item.content as string) || '',
                    image_alt: (item.image_alt as string) || '',
                });

                setBlog(mapBlog(postData));

                if (Array.isArray(allData)) {
                    const others = allData
                        .filter((item: Record<string, unknown>) => String(item.id) !== id)
                        .slice(0, 3)
                        .map(mapBlog);
                    setRelated(others);
                }
            } catch (err) {
                console.error('Error fetching blog:', err);
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        }

        if (id) fetchData();
    }, [id]);

    // GSAP entry animations once blog is loaded
    useEffect(() => {
        if (!blog) return;
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

            tl.fromTo(breadcrumbRef.current, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.5 });
            tl.fromTo(heroImgRef.current, { scale: 1.12, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, ease: 'power2.out' }, '-=0.2');
            tl.fromTo(titleRef.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7 }, '-=0.6');
            tl.fromTo(metaRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, '-=0.4');
            tl.fromTo(contentRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.3');

            // Scroll-trigger for related section
            if (relatedRef.current) {
                gsap.fromTo(
                    relatedRef.current.querySelectorAll('.related-card'),
                    { opacity: 0, y: 60 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.7,
                        stagger: 0.15,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: relatedRef.current,
                            start: 'top 85%',
                        },
                    }
                );
            }
        });

        return () => ctx.revert();
    }, [blog]);

    // Parallax on hero image
    useEffect(() => {
        if (!heroImgRef.current) return;
        const onScroll = () => {
            if (!heroImgRef.current) return;
            const y = window.scrollY * 0.35;
            gsap.set(heroImgRef.current, { y });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [blog]);

    if (loading) {
        return (
            <main className="min-h-screen bg-[#05071a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    <p className="text-slate-400 text-sm tracking-wide">Loading article…</p>
                </div>
            </main>
        );
    }

    if (notFound || !blog) {
        return (
            <main className="min-h-screen bg-[#05071a] flex flex-col items-center justify-center gap-6">
                <p className="text-2xl font-bold text-white">Article not found</p>
                <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors text-sm">
                    ← Back to home
                </Link>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#05071a] text-white">
            {/* ─── AMBIENT BACKGROUND GLOWS ─────────────── */}
            <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[480px] h-[480px] rounded-full bg-blue-700/20 blur-[120px]" />
                <div className="absolute top-[40%] left-[-8%] w-[360px] h-[360px] rounded-full bg-indigo-800/15 blur-[100px]" />
                <div className="absolute bottom-[5%] right-[10%] w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-[90px]" />
            </div>

            {/* ─── BREADCRUMB NAV ──────────────────────── */}
            <div ref={breadcrumbRef} className="max-w-5xl mx-auto px-6 pt-28 pb-6 opacity-0">
                <nav className="flex items-center gap-2 text-sm text-slate-400">
                    <Link href="/" className="hover:text-blue-400 transition-colors">Home</Link>
                    <span className="text-slate-600">/</span>
                    <span className="text-white/60">Blog</span>
                    <span className="text-slate-600">/</span>
                    <span className="text-white/80 line-clamp-1 max-w-[200px]">{blog.title}</span>
                </nav>
            </div>

            {/* ─── HERO IMAGE ──────────────────────────── */}
            <div ref={heroRef} className="max-w-5xl mx-auto px-6 mb-8">
                <div className="relative w-full h-64 md:h-96 lg:h-[460px] rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/30">
                    <div ref={heroImgRef} className="absolute inset-0 scale-110 opacity-0">
                        <Image
                            src={blog.image || '/images/blog-placeholder.jpg'}
                            alt={blog.image_alt || `Blog post hero image: ${blog.title}`}
                            fill
                            className="object-cover"
                            priority
                            unoptimized
                        />
                        {/* Luminous overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#05071a]/90 via-[#05071a]/20 to-transparent" />
                    </div>

                    {/* Tag badge over hero */}
                    <div className="absolute top-6 left-6 z-10">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/90 backdrop-blur-sm text-xs font-bold text-white tracking-wide shadow-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            {blog.tag}
                        </span>
                    </div>
                </div>
            </div>

            {/* ─── ARTICLE HEADER ──────────────────────── */}
            <div className="max-w-3xl mx-auto px-6 mb-10">
                <div ref={metaRef} className="flex items-center gap-3 mb-5 text-slate-400 text-sm opacity-0">
                    {/* Calendar icon (inline SVG) */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-400 flex-shrink-0">
                        <rect x="3" y="4" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <time>{blog.date}</time>
                    <span className="text-slate-700">•</span>
                    <span className="text-blue-400 font-semibold">{blog.tag}</span>
                </div>

                <h1
                    ref={titleRef}
                    className="heading-page text-white opacity-0 mb-6"
                    style={{ textShadow: '0 2px 40px rgba(59,130,246,0.18)' }}
                >
                    {blog.title}
                </h1>

                {/* Decorative divider */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-px flex-1 bg-gradient-to-r from-blue-800/60 to-transparent" />
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <div className="h-px flex-1 bg-gradient-to-l from-blue-800/60 to-transparent" />
                </div>
            </div>

            {/* ─── ARTICLE CONTENT ─────────────────────── */}
            <div ref={contentRef} className="max-w-3xl mx-auto px-6 mb-20 opacity-0">
                <div
                    className="prose-blog"
                    style={{
                        // Inline base styles avoid any CSS module dependency
                        color: '#cbd5e1',
                        lineHeight: '1.9',
                        fontSize: '1.0625rem',
                        fontWeight: 400,
                    }}
                >
                    {blog.content ? (
                        blog.content.split('\n\n').map((para, i) => (
                            <p key={i} style={{ marginBottom: '1.5rem' }}>
                                {para}
                            </p>
                        ))
                    ) : (
                        <p className="text-slate-500 italic">No content available for this post.</p>
                    )}
                </div>

                {/* Back button */}
                <div className="mt-12 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="group inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm text-sm font-semibold text-white/80 hover:text-white transition-all duration-300"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="group-hover:-translate-x-1 transition-transform">
                            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Back
                    </button>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-300"
                    >
                        Go to Home
                    </Link>
                </div>
            </div>

            {/* ─── MORE LIKE THIS ───────────────────────── */}
            {related.length > 0 && (
                <section className="relative py-20 px-6 border-t border-white/5">
                    {/* Section glow */}
                    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-700/40 to-transparent" />
                    </div>

                    <div className="max-w-5xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
                            <div>
                                <p className="text-xs font-bold tracking-[0.2em] text-blue-400 uppercase mb-2">Continue Reading</p>
                                <h2 className="heading-section text-white">More Like This</h2>
                            </div>
                            <Link
                                href="/"
                                className="self-start md:self-auto inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors group"
                            >
                                View all posts
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="group-hover:translate-x-1 transition-transform">
                                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </Link>
                        </div>

                        <div ref={relatedRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {related.map((post) => (
                                <Link
                                    href={`/blog/${post.id}`}
                                    key={post.id}
                                    className="related-card group block rounded-2xl overflow-hidden border border-white/8 bg-white/3 hover:bg-white/6 hover:border-blue-500/30 transition-all duration-500 backdrop-blur-sm opacity-0"
                                    style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        backdropFilter: 'blur(12px)',
                                        boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
                                    }}
                                >
                                    {/* Image */}
                                    <div className="relative h-44 overflow-hidden">
                                        <Image
                                            src={post.image || '/images/blog-placeholder.jpg'}
                                            alt={post.image_alt || `Related blog post: ${post.title}`}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                                            unoptimized
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#05071a]/80 to-transparent" />
                                        <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-blue-600/80 backdrop-blur-sm text-[10px] font-bold tracking-wide text-white">
                                            {post.tag}
                                        </span>
                                    </div>

                                    {/* Body */}
                                    <div className="p-5">
                                        <time className="text-xs text-slate-500 mb-2 block">{post.date}</time>
                                        <h3 className="heading-sub text-white line-clamp-2 mb-3 group-hover:text-blue-300 transition-colors">
                                            {post.title}
                                        </h3>
                                        {post.content && (
                                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{post.content}</p>
                                        )}
                                        <div className="mt-4 flex items-center gap-1 text-blue-400 text-xs font-semibold group-hover:gap-2 transition-all">
                                            Read more
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <style>{`
        * { -webkit-font-smoothing: antialiased; }
        .border-white\/8 { border-color: rgba(255,255,255,0.08); }
        .bg-white\/3 { background: rgba(255,255,255,0.03); }
        .bg-white\/6 { background: rgba(255,255,255,0.06); }
      `}</style>
        </main>
    );
}

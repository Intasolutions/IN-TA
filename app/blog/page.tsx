import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../components/Header';
import Footer from '../components/Footer';

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export const metadata: Metadata = {
    title: 'Insights & Stories | INTA Solutions Blog',
    description: 'Expert perspectives on custom software development, AI integration, and digital transformation from the team at INTA Solutions.',
};

async function getBlogs() {
    try {
        const res = await fetch(`${apiBase}/api/blog/posts/`, {
            next: { revalidate: 3600 }
        });
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error('Error fetching blogs:', error);
        return [];
    }
}

function fixImageUrl(img: string | null | undefined): string {
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

export default async function BlogPage() {
    const blogs = await getBlogs();

    return (
        <div className="bg-[#fbfaf8] min-h-screen selection:bg-[#0b2a5f] selection:text-white">


            <main className="pt-32 pb-20 px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Hero Section */}
                    <div className="mb-20 text-center lg:text-left">
                        <h1 className="text-5xl md:text-7xl font-black text-[#0b2a5f] tracking-tighter mb-6">
                            Insights<span className="text-blue-600">.</span> Stories<span className="text-blue-600">.</span> Updates
                        </h1>
                        <p className="text-xl text-slate-600 max-w-2xl font-light leading-relaxed">
                            Practical case studies and deep-dive articles on software engineering, design, and digital transformation.
                        </p>
                    </div>

                    {/* Blog Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {blogs.length > 0 ? (
                            blogs.map((blog: any) => (
                                <article
                                    key={blog.id}
                                    className="group bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
                                >
                                    <Link href={`/blog/${blog.id}`} className="block relative aspect-[16/10] overflow-hidden">
                                        <Image
                                            src={fixImageUrl(blog.image)}
                                            alt={blog.image_alt || blog.title}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                                            unoptimized
                                        />
                                        <div className="absolute top-4 left-4">
                                            <span className="px-4 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold text-[#0b2a5f] shadow-sm">
                                                {blog.tag || 'Update'}
                                            </span>
                                        </div>
                                    </Link>

                                    <div className="p-8 pb-10">
                                        <div className="flex items-center gap-3 mb-4 text-xs font-medium text-slate-400">
                                            <time>{new Date(blog.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>
                                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                                            <span>5 min read</span>
                                        </div>

                                        <h2 className="text-2xl font-bold text-[#0b2a5f] leading-snug mb-4 group-hover:text-blue-600 transition-colors">
                                            <Link href={`/blog/${blog.id}`}>
                                                {blog.title}
                                            </Link>
                                        </h2>

                                        <p className="text-slate-500 font-light line-clamp-3 mb-8 text-sm leading-relaxed">
                                            {blog.content?.replace(/<[^>]+>/g, '') || 'No description available for this post.'}
                                        </p>

                                        <Link
                                            href={`/blog/${blog.id}`}
                                            className="inline-flex items-center gap-2 text-sm font-bold text-[#0b2a5f] group/link"
                                        >
                                            Read More
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover/link:translate-x-1 transition-transform">
                                                <path d="M5 12h14M12 5l7 7-7 7" />
                                            </svg>
                                        </Link>
                                    </div>
                                </article>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center">
                                <p className="text-slate-400 font-medium italic">We are currently preparing more insightful articles. Stay tuned!</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>


        </div>
    );
}

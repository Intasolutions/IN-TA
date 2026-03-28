import { Metadata, ResolvingMetadata } from 'next';
import BlogDetailClient from './BlogDetailClient';

type Props = {
    params: Promise<{ id: string }>
};

type Blog = {
    id: string;
    title: string;
    date: string;
    tag?: string;
    image?: string;
    content?: string;
    meta_title?: string;
    meta_description?: string;
    focus_keyword?: string;
    image_alt?: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

function fixImageUrl(img: string | null | undefined): string {
    if (!img) return `${apiBase}/images/blog-placeholder.jpg`;
    if (img.startsWith('/')) return `${apiBase}${img}`;
    if (img.includes('localhost') || img.includes('127.0.0.1')) {
        try {
            const url = new URL(img);
            return `${apiBase}${url.pathname}${url.search}`;
        } catch { }
    }
    return img;
}

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { id } = await params;

    try {
        const res = await fetch(`${apiBase}/api/blog/posts/${id}/`);
        if (!res.ok) {
            return {
                title: 'Blog Post Not Found | In-Ta',
            };
        }

        const post: Blog = await res.json();
        const imageUrl = fixImageUrl(post.image);
        
        // Custom fields from API
        const customTitle = post.meta_title;
        const customDescription = post.meta_description;
        
        // Fallbacks
        const plainTextContent = (post.content || '').replace(/<[^>]+>/g, '');
        const fallbackDescription = plainTextContent.slice(0, 160) + (plainTextContent.length > 160 ? '...' : '');

        const finalTitle = customTitle ? `${customTitle} | In-Ta` : `${post.title} | In-Ta`;
        const finalDescription = customDescription || fallbackDescription || 'Read the latest insights and stories from In-Ta.';

        return {
            title: finalTitle,
            description: finalDescription,
            alternates: {
                canonical: `/blog/${id}`,
            },
            openGraph: {
                title: finalTitle,
                description: finalDescription,
                images: [
                    {
                        url: imageUrl,
                        width: 1200,
                        height: 630,
                        alt: post.image_alt || `Cover image for ${post.title}`,
                    },
                ],
                type: 'article',
                publishedTime: post.date ? new Date(post.date).toISOString() : undefined,
                tags: post.tag ? [post.tag] : undefined,
            },
            twitter: {
                card: 'summary_large_image',
                title: finalTitle,
                description: finalDescription,
                images: [imageUrl],
            },
        };
    } catch (error) {
        return {
            title: 'Blog Post | In-Ta',
        };
    }
}

export default async function Page({ params }: Props) {
    const { id } = await params;
    let post: Blog | null = null;
    let jsonLd = null;

    try {
        const res = await fetch(`${apiBase}/api/blog/posts/${id}/`);
        if (res.ok) {
            post = await res.json();
            
            if (post) {
                const imageUrl = fixImageUrl(post.image);
                const description = (post.content || '').replace(/<[^>]+>/g, '').slice(0, 160);
                
                jsonLd = {
                    '@context': 'https://schema.org',
                    '@type': 'BlogPosting',
                    headline: post.title,
                    image: [imageUrl],
                    datePublished: post.date ? new Date(post.date).toISOString() : undefined,
                    author: {
                        '@type': 'Organization',
                        name: 'In-Ta',
                        url: apiBase 
                    },
                    publisher: {
                        '@type': 'Organization',
                        name: 'In-Ta',
                        logo: {
                            '@type': 'ImageObject',
                            url: `${apiBase}/logo.png` 
                        }
                    },
                    description: description || 'In-Ta Blog Post'
                };
            }
        }
    } catch (e) {
        console.error("Error fetching blog for JSON-LD", e);
    }

    return (
        <>
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            )}
            <BlogDetailClient />
        </>
    );
}

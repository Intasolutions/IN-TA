import { Metadata } from 'next';
import { getSite } from '../site/server';
import { textOf } from '../site/site';
import { absolute, pageMetadata } from '../site/seo';
import { organizationRef } from '../site/schema';
import BlogIndex from '../components/blog/BlogIndex';
import { apiBase, toPost, type ApiPost, type Post } from '../components/blog/posts';
import { API_TAG } from '../site/cache';


export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return pageMetadata({ title: textOf(site, 'seo_blog_title'), description: textOf(site, 'seo_blog_description'), path: '/blog' });
}

async function getPosts(): Promise<Post[]> {
  try {
    const res = await fetch(`${apiBase()}/api/blog/posts/`, { next: { revalidate: 3600, tags: [API_TAG] }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const data = await res.json();
    return ((Array.isArray(data) ? data : data.results ?? []) as ApiPost[]).map(toPost);
  } catch {
    return []; // the page asks again from the browser
  }
}

export default async function Page() {
  const posts = await getPosts();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'INTA Solutions Blog',
    url: absolute('/blog'),
    publisher: organizationRef(),
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: absolute(p.href),
      datePublished: p.iso,
      description: p.excerpt,
      ...(p.image ? { image: p.image } : {}),
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <BlogIndex initial={posts} />
    </>
  );
}

import { Metadata } from 'next';
import BlogIndex from '../components/blog/BlogIndex';
import { apiBase, toPost, type ApiPost, type Post } from '../components/blog/posts';

const SITE = 'https://www.in-tasolutions.com';

export const metadata: Metadata = {
  title: 'Insights & Stories | INTA Solutions Blog',
  description: 'Expert perspectives on custom software development, AI integration, and digital transformation from the team at INTA Solutions.',
  alternates: {
    canonical: '/blog',
  },
};

async function getPosts(): Promise<Post[]> {
  try {
    const res = await fetch(`${apiBase()}/api/blog/posts/`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(12000) });
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
    url: `${SITE}/blog`,
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `${SITE}${p.href}`,
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

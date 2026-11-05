import { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArticlePage, { type Article } from '../../components/blog/ArticlePage';
import { articleHtml } from '../../components/blog/body.server';
import { apiBase, plainText, relatedTo, serviceSlugOf, toPost, type ApiPost, type Post } from '../../components/blog/posts';

const SITE = 'https://www.in-tasolutions.com';
const RELATED = 3;

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * A post, or null if there's no such post. If the API can't answer (it can be asleep) this throws rather than saying
 * the post doesn't exist: the error page keeps trying, and that failure is never kept as the page.
 */
const getPost = cache(async (id: string): Promise<ApiPost | null> => {
  if (!/^\d+$/.test(id)) return null;
  const res = await fetch(`${apiBase()}/api/blog/posts/${id}/`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(12000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`The blog API answered ${res.status}`);
  return res.json();
});

async function getPosts(): Promise<Post[]> {
  try {
    const res = await fetch(`${apiBase()}/api/blog/posts/`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const data = await res.json();
    return ((Array.isArray(data) ? data : data.results ?? []) as ApiPost[]).map(toPost);
  } catch {
    return []; // the article still works, without its suggestions
  }
}

async function getService(slug: string | null) {
  if (!slug) return null;
  try {
    const res = await fetch(`${apiBase()}/api/services/${slug}/`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const service = await res.json();
    return { slug, title: String(service.title).trim() };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  let api: ApiPost | null = null;
  try {
    api = await getPost(id);
  } catch {
    return { title: 'Blog | INTA Solutions' };
  }
  if (!api) return { title: 'Article not found | INTA Solutions' };

  const post = toPost(api);
  const title = `${api.meta_title?.trim() || post.title} | INTA Solutions`;
  const description = api.meta_description?.trim() || plainText(api.content ?? '').slice(0, 160);
  const images = post.image ? [{ url: post.image, alt: post.alt || post.title }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: post.href },
    openGraph: { title, description, images, type: 'article', publishedTime: post.iso, tags: post.tags, url: `${SITE}${post.href}` },
    twitter: { card: images ? 'summary_large_image' : 'summary', title, description, images: images?.map((i) => i.url) },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const api = await getPost(id);
  if (!api) notFound();

  const post = toPost(api);
  const [posts, service] = await Promise.all([getPosts(), getService(serviceSlugOf(api.link))]);
  const article: Article = { ...post, html: articleHtml(api.content ?? ''), url: `${SITE}${post.href}`, service };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    url: article.url,
    datePublished: post.iso,
    description: post.excerpt,
    ...(post.image ? { image: [post.image] } : {}),
    author: { '@type': 'Organization', name: 'INTA Solutions', url: SITE },
    publisher: { '@type': 'Organization', name: 'INTA Solutions', logo: { '@type': 'ImageObject', url: `${SITE}/logo/logo-inta.png` } },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <ArticlePage article={article} related={relatedTo(post, posts, RELATED)} />
    </>
  );
}

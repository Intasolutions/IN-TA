import { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArticlePage, { type Article } from '../../components/blog/ArticlePage';
import { articleHtml } from '../../components/blog/body.server';
import { apiBase, plainText, relatedTo, serviceSlugOf, toPost, type ApiPost, type Post } from '../../components/blog/posts';

import { absolute, pageMetadata } from '../../site/seo';
import { breadcrumbs, jsonLdHtml, organizationRef } from '../../site/schema';
import { API_TAG } from '../../site/cache';

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
  const res = await fetch(`${apiBase()}/api/blog/posts/${id}/`, { next: { revalidate: 3600, tags: [API_TAG] }, signal: AbortSignal.timeout(12000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`The blog API answered ${res.status}`);
  return res.json();
});

async function getPosts(): Promise<Post[]> {
  try {
    const res = await fetch(`${apiBase()}/api/blog/posts/`, { next: { revalidate: 3600, tags: [API_TAG] }, signal: AbortSignal.timeout(12000) });
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
    const res = await fetch(`${apiBase()}/api/services/${slug}/`, { next: { revalidate: 3600, tags: [API_TAG] }, signal: AbortSignal.timeout(8000) });
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
  return pageMetadata({
    title,
    description,
    path: post.href,
    image: post.image ? { url: post.image, alt: post.alt || post.title } : null,
    type: 'article',
    publishedTime: post.iso,
    modifiedTime: api.updated_at ?? undefined,
    tags: post.tags,
  });
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const api = await getPost(id);
  if (!api) notFound();

  const post = toPost(api);
  const [posts, service] = await Promise.all([getPosts(), getService(serviceSlugOf(api.link))]);
  const article: Article = { ...post, html: articleHtml(api.content ?? ''), url: absolute(post.href), service };

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      url: article.url,
      mainEntityOfPage: { '@type': 'WebPage', '@id': article.url },
      datePublished: post.iso,
      ...(api.updated_at ? { dateModified: api.updated_at } : {}),
      description: post.excerpt,
      ...(post.tag ? { articleSection: post.tag, keywords: post.tags.join(', ') } : {}),
      wordCount: plainText(api.content ?? '').split(/\s+/).filter(Boolean).length,
      ...(post.image ? { image: [post.image] } : {}),
      inLanguage: 'en-IN',
      author: organizationRef(),
      publisher: organizationRef(),
      ...(service ? { about: { '@type': 'Service', name: service.title, url: absolute(`/services/${service.slug}`) } } : {}),
    },
    breadcrumbs([{ name: 'Blog', path: '/blog' }, { name: post.title, path: post.href }]),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      <ArticlePage article={article} related={relatedTo(post, posts, RELATED)} />
    </>
  );
}

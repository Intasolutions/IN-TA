import type { MetadataRoute } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const SITE = 'https://www.in-tasolutions.com';

// Rebuilt hourly, like the pages, so a new post or service is listed without a redeploy
export const revalidate = 3600;

type ApiService = { slug: string; updated_at?: string };
type ApiPost = { id: number; date?: string };

async function list<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { next: { revalidate }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.results ?? [];
  } catch (e) {
    console.error(`Sitemap: could not load ${path}`, e);
    return [];
  }
}

/** A date from the API, or now when it's missing or unreadable */
const when = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = ['', '/about', '/blog', '/contact', '/portfolio', '/services', '/security', '/terms'].map((route) => ({
    url: `${SITE}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  const [services, posts] = await Promise.all([list<ApiService>('/api/services/'), list<ApiPost>('/api/blog/posts/')]);

  return [
    ...routes,
    ...services.map((s) => ({
      url: `${SITE}/services/${s.slug}`,
      lastModified: when(s.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    ...posts.map((p) => ({
      url: `${SITE}/blog/${p.id}`,
      lastModified: when(p.date),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}

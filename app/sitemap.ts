import type { MetadataRoute } from 'next';
import { LEGAL_UPDATED } from './components/legal/updated';
import { getSite } from './site/server';
import { absolute } from './site/seo';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Rebuilt hourly, like the pages, so a new post or service is listed without a redeploy
export const revalidate = 3600;

type Dated = { updated_at?: string | null };
type ApiService = Dated & { slug: string; is_active?: boolean };
type ApiPost = Dated & { id: number; date?: string };
type ApiProject = Dated & { is_active?: boolean };

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

/** A real date from the data, or nothing: a page is better left undated than given today's date on every build */
const dateOf = (value?: string | null) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/** The latest of several dates, if any */
const latest = (...dates: (Date | undefined)[]) =>
  dates.reduce<Date | undefined>((a, b) => (!b ? a : !a || b > a ? b : a), undefined);

const entry = (path: string, lastModified?: Date): MetadataRoute.Sitemap[number] => ({ url: absolute(path), ...(lastModified ? { lastModified } : {}) });

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [site, services, posts, projects] = await Promise.all([
    getSite(),
    list<ApiService>('/api/services/'),
    list<ApiPost>('/api/blog/posts/'),
    list<ApiProject>('/api/portfolio/projects/'),
  ]);
  const live = services.filter((s) => s.is_active !== false);
  const postDate = (p: ApiPost) => dateOf(p.updated_at) ?? dateOf(p.date);

  // A list page changes when its wording (Site settings) or anything listed on it does
  const settings = dateOf(site.updatedAt);
  const servicesChanged = latest(...live.map((s) => dateOf(s.updated_at)));
  const postsChanged = latest(...posts.map(postDate));
  const projectsChanged = latest(...projects.filter((p) => p.is_active !== false).map((p) => dateOf(p.updated_at)));

  return [
    entry('/', latest(settings, servicesChanged, postsChanged, projectsChanged)),
    entry('/about', latest(settings, servicesChanged)),
    entry('/services', latest(settings, servicesChanged)),
    entry('/portfolio', latest(settings, projectsChanged)),
    entry('/blog', latest(settings, postsChanged)),
    entry('/contact', settings),
    entry('/terms', dateOf(LEGAL_UPDATED.terms.iso)),
    entry('/privacy', dateOf(LEGAL_UPDATED.privacy.iso)),
    entry('/security', dateOf(LEGAL_UPDATED.security.iso)),
    ...live.map((s) => entry(`/services/${s.slug}`, dateOf(s.updated_at))),
    ...posts.map((p) => entry(`/blog/${p.id}`, postDate(p))),
  ];
}

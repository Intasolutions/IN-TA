import { MetadataRoute } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.in-tasolutions.com';

  // Static routes
  const routes = [
    '',
    '/about',
    '/blog',
    '/contact',
    '/portfolio',
    '/services',
    '/security',
    '/terms',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Dynamic services
  let serviceRoutes: any[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/services/`);
    if (res.ok) {
      const services = await res.json();
      serviceRoutes = services.map((s: any) => ({
        url: `${baseUrl}/services/${s.slug}`,
        lastModified: new Date(s.updated_at || new Date()),
        changeFrequency: 'weekly' as const,
        priority: 0.9,
      }));
    }
  } catch (e) {
    console.error('Failed to fetch services for sitemap', e);
  }

  // Dynamic blogs
  let blogRoutes: any[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/blog/posts/`);
    if (res.ok) {
      const blogs = await res.json();
      blogRoutes = blogs.map((b: any) => ({
        url: `${baseUrl}/blog/${b.id}`, // or slug if implemented
        lastModified: new Date(b.updated_at || new Date()),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch (e) {
    console.error('Failed to fetch blogs for sitemap', e);
  }

  return [...routes, ...serviceRoutes, ...blogRoutes];
}

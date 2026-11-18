// /llms.txt: the site in plain text for AI assistants and answer engines (llmstxt.org), made from the same admin data as
// the pages: the company's own description, its details, every page, every service and every article.
import { API_TAG } from '../site/cache';
import { getSite } from '../site/server';
import { absolute, SITE_NAME } from '../site/seo';
import { addressLines, FAQ_PAGES, textOf } from '../site/site';
import { postPath } from '../components/blog/posts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Rebuilt hourly like the sitemap, and at once when something is saved in the admin (the API tag)
export const revalidate = 3600;

type ApiService = { slug: string; title: string; short_description?: string | null; is_active?: boolean; faqs?: { question: string; answer: string }[] };
type ApiPost = { id: number; slug?: string | null; title: string; meta_description?: string | null };

async function list<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { next: { revalidate, tags: [API_TAG] }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.results ?? [];
  } catch (e) {
    console.error(`llms.txt: could not load ${path}`, e);
    return [];
  }
}

/** One line of Markdown text: no line breaks, no stray link syntax */
const plain = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').replace(/[[\]]/g, '').trim();
const item = (title: string, path: string, note?: string | null) => `- [${plain(title)}](${absolute(path)})${plain(note) ? `: ${plain(note)}` : ''}`;

export async function GET() {
  const [site, services, posts] = await Promise.all([getSite(), list<ApiService>('/api/services/'), list<ApiPost>('/api/blog/posts/')]);
  const [street, region] = addressLines(site);
  const live = services.filter((s) => s.is_active !== false && s.slug && s.title);
  // every question once, wherever it is shown (Questions & answers in the admin)
  const seen = new Set<string>();
  const questions = [...FAQ_PAGES.flatMap((page) => site.questions[page]), ...live.flatMap((s) => (s.faqs ?? []).map((f) => ({ q: f.question, a: f.answer })))]
    .filter((f) => f.q && f.a && !seen.has(f.q.toLowerCase()) && seen.add(f.q.toLowerCase()));

  const text = [
    `# ${SITE_NAME}`,
    '',
    `> ${plain(textOf(site, 'seo_business_description'))}`,
    '',
    `Office: ${plain(`${street} ${region}`)}, India. Phone: ${site.phone}. Email: ${site.email}.`,
    '',
    '## Pages',
    '',
    item('Home', '/', textOf(site, 'seo_home_description')),
    item('Services', '/services', textOf(site, 'seo_services_description')),
    item('Work', '/portfolio', textOf(site, 'seo_portfolio_description')),
    item('About', '/about', textOf(site, 'seo_about_description')),
    item('Blog', '/blog', textOf(site, 'seo_blog_description')),
    item('Contact', '/contact', textOf(site, 'seo_contact_description')),
    ...(live.length ? ['', '## Services', '', ...live.map((s) => item(s.title, `/services/${s.slug}`, s.short_description))] : []),
    ...(posts.length ? ['', '## Articles', '', ...posts.filter((p) => p.title).map((p) => item(p.title, postPath(p), p.meta_description))] : []),
    ...(questions.length ? ['', '## Questions and answers', '', ...questions.map((f) => `- **${plain(f.q)}** ${plain(f.a)}`)] : []),
    '',
    '## Optional',
    '',
    item('Terms', '/terms'),
    item('Privacy', '/privacy'),
    item('Security', '/security'),
    item('Sitemap', '/sitemap.xml'),
    '',
  ].join('\n');

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

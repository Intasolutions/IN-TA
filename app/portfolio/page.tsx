import { Metadata } from 'next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PortfolioPage from '../components/portfolio/PortfolioPage';
import { toWork, type ApiProject, type ApiSite } from '../components/portfolio/data';

export const metadata: Metadata = {
  title: 'Our Portfolio | Showcase of Digital Innovation | INTA Solutions',
  description: 'Explore the diverse portfolio of INTA Solutions, featuring custom software, web and mobile apps, and enterprise platforms we have built.',
  alternates: {
    canonical: '/portfolio',
  },
};

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

async function getList<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(`${apiBase}${path}`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.results ?? [];
  } catch {
    return []; // the page asks again from the browser
  }
}

/** Whether a site answers: visitors are only sent to the ones that do */
async function answers(url: string) {
  try {
    const res = await fetch(url, { method: 'HEAD', next: { revalidate: 3600 }, signal: AbortSignal.timeout(3000) });
    return res.status < 500 && res.status !== 404;
  } catch {
    return false;
  }
}

export default async function Page() {
  const [projects, sites] = await Promise.all([getList<ApiProject>('/api/portfolio/projects/'), getList<ApiSite>('/api/portfolio/gallery/')]);
  const urls = [...projects.map((p) => p.external_url?.trim() ?? ''), ...sites.map((s) => s.href?.trim() ?? '')].filter(Boolean);
  const results = await Promise.all(urls.map(answers));
  const work = toWork(projects, sites, apiBase, new Set(urls.filter((_, i) => results[i])));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Work by IN-TA Solutions',
    url: 'https://www.in-tasolutions.com/portfolio',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: [...work.projects.map((p) => ({ name: p.title, description: p.summary, url: p.url, image: p.hero })), ...work.sites.map((s) => ({ name: s.title, description: s.sub, url: s.url, image: s.image }))].map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: { '@type': 'CreativeWork', name: item.name, ...(item.description ? { description: item.description } : {}), ...(item.url ? { url: item.url } : {}), ...(item.image ? { image: item.image } : {}), creator: { '@type': 'Organization', name: 'IN-TA Solutions' } },
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <Header />
      <PortfolioPage initial={work} />
      <Footer />
    </>
  );
}

import { Metadata } from 'next';
import { getSite } from '../site/server';
import { textOf } from '../site/site';
import { absolute, pageMetadata } from '../site/seo';
import { organizationRef } from '../site/schema';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ServiceChip, { type ChipService } from '../components/services/ServiceChip';
import { partOf } from '../components/services/floorplan';
import { API_TAG } from '../site/cache';

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return pageMetadata({ title: textOf(site, 'seo_services_title'), description: textOf(site, 'seo_services_description'), path: '/services' });
}

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

type ApiService = {
  title: string;
  slug: string;
  short_description?: string | null;
  order?: number;
  is_active?: boolean;
  features?: ({ name?: string } | string)[];
  board_part?: string;
  board_label?: string;
};

async function getServices(): Promise<ChipService[]> {
  try {
    const res = await fetch(`${apiBase}/api/services/`, { next: { revalidate: 3600, tags: [API_TAG] }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    const list: ApiService[] = Array.isArray(data) ? data : data.results ?? [];
    return list
      .filter((s) => s.is_active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((s) => ({
        slug: s.slug,
        title: s.title.trim(),
        description: s.short_description?.trim() ?? '',
        features: (s.features ?? []).map((f) => (typeof f === 'string' ? f : f.name ?? '')).filter(Boolean),
        part: partOf(s.board_part),
        label: s.board_label?.trim() || null,
      }));
  } catch {
    return []; // the page still works: the board keeps the services it always had
  }
}

export default async function Page() {
  const services = await getServices();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Services by IN-TA Solutions',
    itemListElement: services.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Service',
        name: s.title,
        description: s.description,
        url: absolute(`/services/${s.slug}`),
        provider: organizationRef(),
      },
    })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <ServiceChip services={services} />
      <Footer />
    </>
  );
}

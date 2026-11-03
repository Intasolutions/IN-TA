import { Metadata } from 'next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ServiceChip, { type ChipService } from '../components/services/ServiceChip';

export const metadata: Metadata = {
  title: 'Our Services | Professional IT Solutions | INTA Solutions',
  description: 'Comprehensive software development services including web development, mobile app development, AI integration, and digital marketing. Transform your business with INTA Solutions.',
  alternates: {
    canonical: '/services',
  },
};

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

type ApiService = {
  title: string;
  slug: string;
  short_description?: string | null;
  order?: number;
  is_active?: boolean;
  features?: ({ name?: string } | string)[];
};

async function getServices(): Promise<ChipService[]> {
  try {
    const res = await fetch(`${apiBase}/api/services/`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
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
      }));
  } catch {
    return []; // the page still works, with the service names it already knows
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
        url: `https://www.in-tasolutions.com/services/${s.slug}`,
        provider: { '@type': 'Organization', name: 'IN-TA Solutions' },
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

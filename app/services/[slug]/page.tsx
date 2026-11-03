import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ServiceDetail from '../../components/services/detail/ServiceDetail';
import { toDetail, type ApiService, type RelatedService } from '../../components/services/detail/types';

const LOCAL_API = 'http://127.0.0.1:8000';
const apiBase = process.env.NEXT_PUBLIC_API_URL || LOCAL_API;

type ServiceResponse = ApiService & { meta_title?: string | null; meta_description?: string | null; focus_keyword?: string | null; icon_path?: string | null };

type Props = {
    params: Promise<{ slug: string }>;
};

/** While developing, a backend running on this machine answers first, so new content can be tried before it goes live */
async function fromLocal(path: string) {
    if (process.env.NODE_ENV !== 'development' || apiBase === LOCAL_API) return null;
    try {
        const res = await fetch(`${LOCAL_API}${path}`, { cache: 'no-store', signal: AbortSignal.timeout(1500) });
        return res.ok ? res.json() : null;
    } catch {
        return null;
    }
}

async function getService(slug: string): Promise<ServiceResponse | null> {
    const local = await fromLocal(`/api/services/${slug}/`);
    if (local) return local;
    try {
        const res = await fetch(`${apiBase}/api/services/${slug}/`, {
            next: { revalidate: 3600 } // Revalidate every hour
        });
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error('Error fetching service:', error);
        return null;
    }
}

async function getRelated(): Promise<RelatedService[]> {
    try {
        let data = await fromLocal('/api/services/');
        if (!data) {
            const res = await fetch(`${apiBase}/api/services/`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
            if (!res.ok) return [];
            data = await res.json();
        }
        const list: (ApiService & { is_active?: boolean })[] = Array.isArray(data) ? data : data.results ?? [];
        return list
            .filter((s) => s.is_active !== false)
            .map((s) => ({ slug: s.slug, title: s.title.trim(), short: s.short_description?.trim() ?? '' }));
    } catch {
        return []; // the page still works, without its links to the other parts
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const service = await getService(slug);

    if (!service) {
        return {
            title: 'Service Not Found | INTA Solutions',
        };
    }

    const title = service.meta_title || `${service.title} Services | INTA Solutions`;
    const description = service.meta_description || service.short_description || `Professional ${service.title} services by INTA Solutions.`;
    const keywords = service.focus_keyword || '';

    return {
        title,
        description,
        keywords,
        alternates: {
            canonical: `/services/${slug}`,
        },
        openGraph: {
            title,
            description,
            type: 'website',
            url: `https://in-tasolutions.com/services/${slug}`,
            images: [
                {
                    url: service.image || service.icon_path || 'https://in-tasolutions.com/og-image.jpg',
                    width: 1200,
                    height: 630,
                    alt: service.image_alt || service.title,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [service.image || service.icon_path || 'https://in-tasolutions.com/og-image.jpg'],
        },
    };
}

export async function generateStaticParams() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${apiBase}/api/services/`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) return [];
        const services = await res.json();
        return services.map((s: { slug: string }) => ({
            slug: s.slug,
        }));
    } catch (error) {
        console.error('Error generating static params:', error);
        return [];
    }
}

export default async function Page({ params }: Props) {
    const { slug } = await params;
    const [api, related] = await Promise.all([getService(slug), getRelated()]);

    if (!api) {
        notFound();
    }

    const service = toDetail(api);
    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: service.title,
            description: service.short,
            url: `https://www.in-tasolutions.com/services/${service.slug}`,
            provider: { '@type': 'Organization', name: 'IN-TA Solutions' },
            ...(service.image ? { image: service.image } : {}),
        },
        ...(service.faqs.length
            ? [{
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: service.faqs.map((f) => ({
                    '@type': 'Question',
                    name: f.question,
                    acceptedAnswer: { '@type': 'Answer', text: f.answer },
                })),
            }]
            : []),
    ];

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
            <Header />
            <ServiceDetail service={service} related={related} />
            <Footer />
        </>
    );
}

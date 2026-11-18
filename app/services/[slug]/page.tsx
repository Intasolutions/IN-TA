import { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ServiceDetail from '../../components/services/detail/ServiceDetail';
import { toDetail, type ApiService, type RelatedService } from '../../components/services/detail/types';
import { partOf } from '../../components/services/floorplan';
import { absolute, brandedTitle, pageMetadata } from '../../site/seo';
import { breadcrumbs, jsonLdHtml, organizationRef } from '../../site/schema';
import { API_TAG } from '../../site/cache';

const LOCAL_API = 'http://127.0.0.1:8000';
const apiBase = process.env.NEXT_PUBLIC_API_URL || LOCAL_API;

type ServiceResponse = ApiService & { meta_title?: string | null; meta_description?: string | null; focus_keyword?: string | null };

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

/**
 * A service, or null if there's no such service. If the API can't answer (it can be asleep on Render) this throws
 * rather than saying the service doesn't exist: a "not found" would be kept as the page for an hour and tell search
 * engines the page is gone. A failed render is never kept: visitors get the last good version, or the error page.
 */
const getService = cache(async (slug: string): Promise<ServiceResponse | null> => {
    if (!/^[\w-]+$/.test(slug)) return null;
    const local = await fromLocal(`/api/services/${slug}/`);
    if (local) return local;
    const res = await fetch(`${apiBase}/api/services/${slug}/`, {
        next: { revalidate: 3600, tags: [API_TAG] },
        signal: AbortSignal.timeout(12000),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`The services API answered ${res.status}`);
    return res.json();
});

async function getRelated(): Promise<RelatedService[]> {
    try {
        let data = await fromLocal('/api/services/');
        if (!data) {
            const res = await fetch(`${apiBase}/api/services/`, { next: { revalidate: 3600, tags: [API_TAG] }, signal: AbortSignal.timeout(8000) });
            if (!res.ok) return [];
            data = await res.json();
        }
        const list: (ApiService & { is_active?: boolean })[] = Array.isArray(data) ? data : data.results ?? [];
        return list
            .filter((s) => s.is_active !== false)
            .map((s) => ({ slug: s.slug, title: s.title.trim(), short: s.short_description?.trim() ?? '', part: partOf(s.board_part), label: s.board_label?.trim() || null }));
    } catch {
        return []; // the page still works, without its links to the other parts
    }
}

/**
 * The service at this address, also when it's typed in other capitals (/services/marketing for /services/Marketing).
 * Such an address shows the same page, and its canonical address names the real one. It deliberately doesn't
 * redirect: two addresses that differ only in capitals can share one entry in the page cache (they do on Windows),
 * and a redirect kept there in place of the real page would send the real address round in a loop.
 */
const findService = cache(async (slug: string): Promise<ServiceResponse | null> => {
    const exact = await getService(slug);
    if (exact) return exact;
    const same = (await getRelated()).find((s) => s.slug.toLowerCase() === slug.toLowerCase() && s.slug !== slug);
    return same ? getService(same.slug) : null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    let service: ServiceResponse | null = null;
    try {
        service = await findService(slug);
    } catch {
        return { title: 'Services | IN-TA Solutions' };
    }

    if (!service) {
        return {
            title: 'Service Not Found | IN-TA Solutions',
        };
    }

    const title = brandedTitle(service.meta_title?.trim() || `${service.title.trim()} Services`);
    const description = service.meta_description?.trim() || service.short_description?.trim() || `Professional ${service.title} services by IN-TA Solutions.`;
    return {
        ...pageMetadata({
            title,
            description,
            path: `/services/${service.slug || slug}`,
            image: service.image ? { url: service.image, alt: service.image_alt || service.title } : null,
        }),
        ...(service.focus_keyword ? { keywords: service.focus_keyword } : {}),
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
    const [api, related] = await Promise.all([findService(slug), getRelated()]);

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
            url: absolute(`/services/${service.slug}`),
            serviceType: service.title,
            provider: organizationRef(),
            areaServed: [{ '@type': 'State', name: 'Kerala' }, { '@type': 'Country', name: 'India' }],
            ...(service.image ? { image: service.image } : {}),
        },
        // only the questions whose main page this is: a question on several pages is marked up on one of them
        ...(service.faqs.some((f) => f.main)
            ? [{
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: service.faqs.filter((f) => f.main).map((f) => ({
                    '@type': 'Question',
                    name: f.question,
                    acceptedAnswer: { '@type': 'Answer', text: f.answer },
                })),
            }]
            : []),
        breadcrumbs([{ name: 'Services', path: '/services' }, { name: service.title, path: `/services/${service.slug}` }]),
    ];

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
            <Header />
            <ServiceDetail service={service} related={related} />
            <Footer />
        </>
    );
}

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header1 from '../../components/Header1';
import Footer1 from '../../components/Footersecond';
import SmoothScroll from '../../components/SmoothScroll';
import ServiceDetailClient from '../components/ServiceDetailClient';

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

type Props = {
    params: Promise<{ slug: string }>;
};

async function getService(slug: string) {
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
        return services.map((s: any) => ({
            slug: s.slug,
        }));
    } catch (error) {
        console.error('Error generating static params:', error);
        return [];
    }
}

export default async function Page({ params }: Props) {
    const { slug } = await params;
    const service = await getService(slug);

    if (!service) {
        notFound();
    }

    return (
        <SmoothScroll>
            <Header1 />
            <ServiceDetailClient service={service} />
            <Footer1 />
        </SmoothScroll>
    );
}

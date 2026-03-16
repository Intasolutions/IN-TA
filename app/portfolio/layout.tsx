import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Our Portfolio | Innovative Solutions Built by INTA Solutions',
    description: 'Explore our latest projects in web development, mobile apps, and enterprise software. See how we help businesses in Kerala and globally achieve digital transformation.',
    openGraph: {
        title: 'INTA Solutions Portfolio | Software Excellence in Wayanad',
        description: 'A showcase of our best work in custom software and digital engineering.',
        url: 'https://in-tasolutions.com/portfolio',
    }
};

export default function PortfolioLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}

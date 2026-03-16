import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'About Us | Engineering Digital Excellence at INTA Solutions',
    description: 'Learn about INTA Solutions, a premier software development company in Kerala. Our team of architects and developers is dedicated to building scalable, high-performance digital products.',
    openGraph: {
        title: 'About INTA Solutions | Leading IT Company in Wayanad',
        description: 'Discover our journey, our values, and our commitment to engineering excellence in Kerala.',
        url: 'https://in-tasolutions.com/about',
    }
};

export default function AboutLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}

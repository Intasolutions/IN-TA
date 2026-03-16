import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Contact Us | Start Your Project with INTA Solutions Kerala',
    description: 'Get in touch with the best IT company in Wayanad, Kerala. Contact us for custom software development, web engineering, and AI integration services.',
    openGraph: {
        title: 'Contact INTA Solutions | Web & Software Experts in Kerala',
        description: 'Ready to build something great? Reach out to our team in Wayanad for a consultation.',
        url: 'https://in-tasolutions.com/contact',
    }
};

export default function ContactLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}

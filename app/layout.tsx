import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import ClientLayout from './ClientLayout';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Custom Software Development Company in Kerala | INTA Solutions',
  description: 'INTA Solutions is a software development company in Wayanad, Kerala providing web development, AI integration, mobile apps, and enterprise software solutions.',
  keywords: 'software development company kerala, IT company in Wayanad, web development company Kerala, mobile app development India, custom software development company, AI integration services, enterprise web solutions',
  authors: [{ name: 'INTA Solutions Pvt Ltd' }],
  robots: 'index, follow',
  icons: {
    icon: '/logo/logo.png',
  },
  openGraph: {
    title: 'INTA Solutions | Engineering Digital Excellence',
    description: 'Custom software development, web development, mobile applications, AI integration and enterprise digital solutions.',
    type: 'website',
    url: 'https://in-tasolutions.com',
    images: [
      {
        url: 'https://in-tasolutions.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'INTA Solutions | Engineering Digital Excellence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'INTA Solutions | Software Development Company Kerala',
    description: 'Build scalable digital products with INTA Solutions — web development, mobile apps, AI integration and enterprise systems.',
    images: ['https://in-tasolutions.com/og-image.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

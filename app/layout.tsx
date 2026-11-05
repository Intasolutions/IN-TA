import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import ClientLayout from './ClientLayout';

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  style: ['normal', 'italic'],
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

// Material Symbols, limited to the icons the site uses (keeps the font tiny).
// Add new icon names here — the list must stay in alphabetical order.
const MATERIAL_ICONS = [
  'arrow_outward', 'close', 'developer_board', 'location_on', 'menu',
  'north_east', 'schedule', 'travel_explore', 'design_services', 'terminal',
  'neurology', 'code', 'domain', 'devices', 'speed', 'lock',
  'arrow_back', 'arrow_forward', 'south', 'mouse', 'article', 'check', 'arrow_upward', 'call', 'mail', 'add', 'east', 'west', 'open_in_full', 'search',
].sort().join(',');

export const metadata: Metadata = {
  metadataBase: new URL('https://www.in-tasolutions.com'),
  title: 'Top IT Company in Wayanad | Mobile App Development Team | INTA Solutions',
  description: 'INTA Solutions is the #1 software development company in Wayanad, Kerala. We provide expert mobile app development, AI integration, and custom enterprise software solutions.',
  keywords: 'software development company kerala, IT company in Wayanad, web development company Kerala, mobile app development India, custom software development company, AI integration services, enterprise web solutions',
  authors: [{ name: 'INTA Solutions Pvt Ltd' }],
  robots: 'index, follow',
  icons: {
    icon: '/logo/logo.png',
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'INTA Solutions | Engineering Digital Excellence',
    description: 'Custom software development, web development, mobile applications, AI integration and enterprise digital solutions.',
    type: 'website',
    url: 'https://www.in-tasolutions.com',
    images: [
      {
        url: 'https://www.in-tasolutions.com/og-image.jpg',
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
    images: ['https://www.in-tasolutions.com/og-image.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="dns-prefetch" href="http://127.0.0.1:8000" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=${MATERIAL_ICONS}&display=block`}
        />
      </head>
      <body
        className={`${jakarta.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

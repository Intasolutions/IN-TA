import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import 'lenis/dist/lenis.css';
import './globals.css';
import ClientLayout from './ClientLayout';
import { LOADER_SCRIPT } from './site/loader';
import { getSite } from './site/server';
import { withoutDocuments } from './components/legal/document';
import { textOf } from './site/site';
import { pageMetadata, SITE_NAME, SITE_URL } from './site/seo';

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

const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? '').origin;
  } catch {
    return null;
  }
})();

// A phone browser's bar takes the header's white
export const viewport: Viewport = { themeColor: '#ffffff' };

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: SITE_NAME,
    authors: [{ name: 'IN-TA Solutions Pvt Ltd', url: SITE_URL }],
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    ...pageMetadata({ title: textOf(site, 'seo_home_title'), description: textOf(site, 'seo_home_description'), path: '/' }),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const site = await getSite();
  return (
    // the opening's script below may mark <html> before React takes over the page
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOADER_SCRIPT }} />
        {/* without scripts the opening could never end: the page shows straight away */}
        <noscript dangerouslySetInnerHTML={{ __html: '<style>.page-loader{display:none}</style>' }} />
        {/* Pages ask the API for their content from the browser too: opening the connection early saves that first wait */}
        {API_ORIGIN && <link rel="preconnect" href={API_ORIGIN} crossOrigin="anonymous" />}
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
        <ClientLayout site={{ ...site, text: withoutDocuments(site.text) }}>{children}</ClientLayout>
      </body>
    </html>
  );
}

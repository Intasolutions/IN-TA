// What each page tells search engines and social media: its own title, description, address and preview image.
// Next.js merges metadata one level deep, so a page that doesn't set its own openGraph shows the home page's
// title and address when it's shared. Every page goes through pageMetadata() so that never happens.
import type { Metadata } from 'next';

/** The one address of the site: the bare domain and http both redirect here */
export const SITE_URL = 'https://www.in-tasolutions.com';
export const SITE_NAME = 'IN-TA Solutions';

/** The preview shown when a page without a picture of its own is shared */
export const SHARE_IMAGE = { url: `${SITE_URL}/og-image.jpg`, width: 1200, height: 630, alt: 'IN-TA Solutions: Engineering Digital Excellence' };

type Image = { url: string; width?: number; height?: number; alt?: string };

/** A full address on the site, from a path like /services/web-development */
export const absolute = (path: string) => (path === '/' ? SITE_URL : `${SITE_URL}${path}`);

export function pageMetadata({
  title,
  description,
  path,
  image,
  type = 'website',
  publishedTime,
  modifiedTime,
  tags,
}: {
  title: string;
  description: string;
  /** The page's own path, which is also its canonical address */
  path: string;
  /** A picture of the page's own (a service's or a post's); otherwise the site's preview image */
  image?: Image | null;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
}): Metadata {
  const images = [image?.url ? image : SHARE_IMAGE];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: absolute(path),
      siteName: SITE_NAME,
      locale: 'en_IN',
      images,
      ...(type === 'article' ? { type, publishedTime, modifiedTime, tags } : { type }),
    },
    twitter: { card: 'summary_large_image', title, description, images: images.map((i) => i.url) },
  };
}

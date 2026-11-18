// What each page tells search engines and social media: its own title, description, address and preview image.
// Next.js merges metadata one level deep, so a page that doesn't set its own openGraph shows the home page's
// title and address when it's shared. Every page goes through pageMetadata() so that never happens.
import type { Metadata } from 'next';

/** The one address of the site: the bare domain and http both redirect here */
export const SITE_URL = 'https://www.in-tasolutions.com';
export const SITE_NAME = 'IN-TA Solutions';

/**
 * The preview shown when a page without a picture of its own is shared: the INTA logo, made from public/logo/logo.jpg.
 * Give a new picture a new file name: WhatsApp, LinkedIn and Facebook keep showing a cached picture for an address they know.
 */
export const SHARE_IMAGE = { url: `${SITE_URL}/inta-share.jpg`, width: 1200, height: 630, alt: 'IN-TA Solutions logo' };

type Image = { url: string; width?: number; height?: number; alt?: string };

/** About as long as a title gets before Google cuts it off in results */
const TITLE_FITS = 60;

/**
 * A page's title with the company name after it, as long as it isn't there already (titles written in the admin often
 * include it) and the whole still fits in a search result. A long title is better whole than cut off at the name.
 */
export function brandedTitle(title: string) {
  const clean = title.trim().replace(/\s*[|\-–—:]\s*$/, '');
  if (/in-?ta\s+solutions/i.test(clean)) return clean;
  const branded = `${clean} | ${SITE_NAME}`;
  return branded.length <= TITLE_FITS ? branded : clean;
}

/**
 * The title for search results: one that runs past what Google shows loses its trailing company name first (Google
 * already shows the site's name above every result, from the home page's WebSite markup). Otherwise as written.
 */
export function searchTitle(title: string) {
  const clean = title.trim();
  if (clean.length <= TITLE_FITS) return clean;
  return clean.replace(/\s*[|\-–—:]\s*in-?ta\s+solutions\s*$/i, '') || clean;
}

/** Text cut to what search results show (about 160 characters), at a whole word */
export function snippet(text: string, max = 160) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 0)).replace(/[\s,;:.–—-]+$/, '')}…`;
}

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
  // longer wording from the admin is cut at a whole word rather than mid-word by the search engine
  const text = snippet(description);
  return {
    // (shares keep the whole title: they have room for it)
    title: searchTitle(title),
    description: text,
    alternates: { canonical: path },
    openGraph: {
      title,
      description: text,
      url: absolute(path),
      siteName: SITE_NAME,
      locale: 'en_IN',
      images,
      ...(type === 'article' ? { type, publishedTime, modifiedTime, tags } : { type }),
    },
    twitter: { card: 'summary_large_image', title, description: text, images: images.map((i) => i.url) },
  };
}

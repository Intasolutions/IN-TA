import type { MetadataRoute } from 'next';

const SITE = 'https://www.in-tasolutions.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    host: SITE,
    sitemap: `${SITE}/sitemap.xml`,
  };
}

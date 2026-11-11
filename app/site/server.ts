import { cache } from 'react';
import { DEFAULT_SITE, toSite, type Site } from './site';
import { API_TAG } from './cache';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

/**
 * The site's details and wording from the admin, asked for once per render and kept for five minutes.
 * The API host can be asleep: then the site shows what it showed before, and asks again on the next refresh.
 */
export const getSite = cache(async (): Promise<Site> => {
  try {
    const res = await fetch(`${API_BASE}/api/home/site/`, { next: { revalidate: 300, tags: [API_TAG] }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return DEFAULT_SITE;
    return toSite(await res.json(), API_BASE);
  } catch {
    return DEFAULT_SITE;
  }
});

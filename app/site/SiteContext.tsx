'use client';

import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { DEFAULT_SITE, textOf, type Site } from './site';

const SiteContext = createContext<Site>(DEFAULT_SITE);

/** Gives every component the site's details and wording, fetched once by the root layout */
export function SiteProvider({ site, children }: { site: Site; children: ReactNode }) {
  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}

export const useSite = () => useContext(SiteContext);

/** t('key') → the wording as set in the admin, or the standard one; t('key', { n: 3 }) fills {n} */
export function useText() {
  const site = useSite();
  return useCallback((key: string, values?: Record<string, string | number>) => textOf(site, key, values), [site]);
}

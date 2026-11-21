'use client';

import { usePathname } from 'next/navigation';

/**
 * The page's path, for anything the server writes into the page (header links, the WhatsApp message).
 *
 * When Vercel refreshes the cached home page in the background it renders it as "/index", so `usePathname()` gives
 * "/index" on the server and "/" in the browser. That difference broke hydration (React error #418, flagged by the
 * 2026-11-21 SEO audit): the server's header had a "Home" link the browser's didn't.
 */
export function usePagePath() {
  const path = usePathname();
  return path === '/index' ? '/' : path;
}

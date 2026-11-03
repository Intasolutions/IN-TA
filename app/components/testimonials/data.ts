'use client';

import { useEffect, useState } from 'react';

export type Testimonial = {
  id: number;
  name: string;
  subtitle: string; // role, company or a fallback
  quote: string;
  avatar: string | null;
};

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const absolute = (url: string | null) => {
  if (!url) return null;
  if (url.startsWith('/')) return `${apiBase()}${url}`;
  // media saved against a local backend → serve it from the configured API host
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    try {
      const u = new URL(url);
      return `${apiBase()}${u.pathname}${u.search}`;
    } catch {
      return url;
    }
  }
  return url;
};

// Quotes come in with stray wrapping quote marks and Windows line breaks
const cleanQuote = (q: string) =>
  q.replace(/\r\n|\r|\n/g, ' ').replace(/\s{2,}/g, ' ').trim().replace(/^["“”]+|["“”]+$/g, '').trim();

/** Client testimonials from the Django API (shared by every Testimonials design). */
export function useTestimonials() {
  const [items, setItems] = useState<Testimonial[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase()}/api/home/testimonials/`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        const list = (Array.isArray(data) ? data : data.results ?? []) as {
          id: number; name: string; role?: string | null; company?: string | null; quote: string; avatar?: string | null;
        }[];
        setItems(
          list.map((t) => ({
            id: t.id,
            name: t.name.trim(),
            subtitle: t.role?.trim() || (t.company && t.company.trim() !== t.name.trim() ? t.company.trim() : '') || 'Client',
            quote: cleanQuote(t.quote),
            avatar: absolute(t.avatar ?? null),
          })),
        );
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setFailed(true);
      });
    return () => controller.abort();
  }, []);

  return { items, failed };
}

export const STATIC_GRADIENT = 'bg-linear-to-r from-brand-blue via-[#2563eb] to-[#3b7bf7] bg-clip-text text-transparent';

/** Initials for clients without a photo */
export const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');

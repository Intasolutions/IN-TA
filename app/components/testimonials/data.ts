'use client';

import { useEffect, useState } from 'react';
import { apiBase, toTestimonials, type Testimonial } from './shape';

export { initials } from './shape';
export type { Testimonial };

/**
 * Client testimonials from the Django API (shared by every Testimonials design). The home page sends them with the page
 * (`initial`); only if the server couldn't get them are they asked for from the browser.
 */
export function useTestimonials(initial: Testimonial[] | null = null) {
  const [items, setItems] = useState<Testimonial[] | null>(initial);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (initial) return;
    const controller = new AbortController();
    fetch(`${apiBase()}/api/home/testimonials/`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => setItems(toTestimonials(data)))
      .catch((err) => {
        if (err?.name !== 'AbortError') setFailed(true);
      });
    return () => controller.abort();
  }, [initial]);

  return { items, failed };
}

export const STATIC_GRADIENT = 'bg-linear-to-r from-brand-blue via-[#2563eb] to-[#3b7bf7] bg-clip-text text-transparent';

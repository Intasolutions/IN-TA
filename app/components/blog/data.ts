'use client';

import { useEffect, useState } from 'react';

export type Post = {
  id: number;
  href: string;
  title: string;
  date: string; // "Aug 13, 2026"
  iso: string; // for <time dateTime>
  tag: string;
  image: string | null;
  alt: string;
  excerpt: string;
  minutes: number; // reading time
};

export const apiBase = () => process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

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

// Post bodies are CKEditor HTML; parsed into an inert document (nothing loads or runs) just to read the text
const toText = (html: string) =>
  (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '').replace(/\s+/g, ' ').trim();

// Tags are free text, often a comma list cut off at 50 characters: keep the first one, tidy it up
const cleanTag = (raw: string) => {
  const first = (raw.split(/,|\s{2,}/)[0] ?? '').trim().replace(/\.$/, '');
  if (!first || /^[a-z0-9]+(-[a-z0-9]+)+$/i.test(first)) return 'Insights'; // a slug ended up in the tag field
  return first === first.toLowerCase() ? first.replace(/\b\w/g, (c) => c.toUpperCase()) : first;
};

const formatDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const excerptOf = (text: string, max = 170) => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
};

/** Blog posts from the Django API, newest first (shared by every Blog design). */
export function usePosts() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase()}/api/blog/posts/`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        const list = (Array.isArray(data) ? data : data.results ?? []) as {
          id: number; title: string; date: string; tag?: string | null; image?: string | null;
          content?: string | null; meta_description?: string | null; image_alt?: string | null;
        }[];
        setPosts(
          list.map((b) => {
            const body = toText(b.content ?? '');
            return {
              id: b.id,
              href: `/blog/${b.id}`,
              title: b.title.trim(),
              date: formatDate(b.date),
              iso: b.date,
              tag: cleanTag(b.tag ?? ''),
              image: absolute(b.image ?? null),
              alt: b.image_alt?.trim() || '',
              excerpt: excerptOf(b.meta_description?.trim() || body),
              minutes: Math.max(1, Math.round(body.split(' ').length / 220)),
            };
          }),
        );
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setFailed(true);
      });
    return () => controller.abort();
  }, []);

  return { posts, failed };
}

export const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Plays a paused timeline the first time `el` scrolls into view. Returns the cleanup. */
export const playOnView = (el: Element | null, tl: gsap.core.Timeline) => {
  if (!el) return;
  const io = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      tl.play();
      io.disconnect();
    },
    { rootMargin: '0px 0px -12% 0px' },
  );
  io.observe(el);
  return () => io.disconnect();
};

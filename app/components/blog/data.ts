'use client';

import { useEffect, useState } from 'react';
import { apiBase, toPost, type ApiPost, type Post } from './posts';

export { apiBase };
export type { Post };

/**
 * Blog posts from the Django API, newest first (shared by every Blog design). The home page sends them with the page
 * (`initial`); only if the server couldn't get them are they asked for from the browser.
 */
export function usePosts(initial: Post[] | null = null) {
  const [posts, setPosts] = useState<Post[] | null>(initial);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (initial) return;
    const controller = new AbortController();
    fetch(`${apiBase()}/api/blog/posts/`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        setPosts(((Array.isArray(data) ? data : data.results ?? []) as ApiPost[]).map(toPost));
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setFailed(true);
      });
    return () => controller.abort();
  }, [initial]);

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

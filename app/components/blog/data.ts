'use client';

import { useEffect, useState } from 'react';
import { apiBase, toPost, type ApiPost, type Post } from './posts';

export { apiBase };
export type { Post };

/** Blog posts from the Django API, newest first (shared by every Blog design). */
export function usePosts() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
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

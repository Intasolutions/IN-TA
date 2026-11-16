import { toPost, type ApiPost, type Post } from '../components/blog/posts';
import { toProjects, type Project } from '../components/projects';
import { toTestimonials, type Testimonial } from '../components/testimonials/shape';
import { API_TAG } from './cache';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

/** What the home page lists, read on the server so it is in the page itself (for search engines too) */
export type HomeLists = { projects: Project[] | null; testimonials: Testimonial[] | null; posts: Post[] | null };

/** null when the API couldn't be reached: that section then asks for it from the browser, as before */
async function read<T>(path: string, shape: (data: unknown) => T): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 300, tags: [API_TAG] }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return shape(await res.json());
  } catch {
    return null;
  }
}

const toPosts = (data: unknown) => ((Array.isArray(data) ? data : (data as { results?: ApiPost[] })?.results ?? []) as ApiPost[]).map(toPost);

export async function getHomeLists(): Promise<HomeLists> {
  const [projects, testimonials, posts] = await Promise.all([
    read('/api/portfolio/projects/', toProjects),
    read('/api/home/testimonials/', toTestimonials),
    // (the home page shows a few: the rest would only make the page heavier)
    read('/api/blog/posts/', (data) => toPosts(data).slice(0, 8)),
  ]);
  return { projects, testimonials, posts };
}

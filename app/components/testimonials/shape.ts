// What the site needs from the API's testimonials. Nothing here touches the browser or React: the home page reads them
// on the server, and in the browser only if the server couldn't (see data.ts).

export type Testimonial = {
  id: number;
  name: string;
  subtitle: string; // role, company or a fallback
  quote: string;
  avatar: string | null;
};

export type ApiTestimonial = { id: number; name: string; role?: string | null; company?: string | null; quote: string; avatar?: string | null };

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

// Quotes come in with stray wrapping quote marks and Windows line breaks
const cleanQuote = (q: string) =>
  q.replace(/\r\n|\r|\n/g, ' ').replace(/\s{2,}/g, ' ').trim().replace(/^["“”]+|["“”]+$/g, '').trim();

export const toTestimonials = (data: unknown): Testimonial[] =>
  ((Array.isArray(data) ? data : (data as { results?: ApiTestimonial[] })?.results ?? []) as ApiTestimonial[]).map((t) => ({
    id: t.id,
    name: t.name.trim(),
    subtitle: t.role?.trim() || (t.company && t.company.trim() !== t.name.trim() ? t.company.trim() : '') || 'Client',
    quote: cleanQuote(t.quote),
    avatar: absolute(t.avatar ?? null),
  }));

/** Initials for clients without a photo */
export const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');

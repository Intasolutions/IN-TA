// What the blog needs from the API's posts. Nothing here touches the browser or React: the blog pages use it on the
// server, and the home page's section in the browser.

export type ApiPost = {
  id: number;
  title: string;
  date: string;
  tag?: string | null;
  image?: string | null;
  link?: string | null;
  content?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  image_alt?: string | null;
};

export type Post = {
  id: number;
  href: string;
  title: string;
  date: string; // "Aug 13, 2026"
  iso: string; // for <time dateTime>
  tag: string; // the one to show
  tags: string[]; // all of them, for finding related posts and filtering
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

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', bull: '•', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”' };

/** The words of a post's body, which can be plain text or the admin editor's HTML. Only ever shown as text, never as markup */
export const plainText = (body: string) =>
  body
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|[a-z]+);/gi, (whole, code: string) => {
      if (code.startsWith('#')) return String.fromCodePoint(Number(code.slice(1)));
      return ENTITIES[code.toLowerCase()] ?? whole;
    })
    .replace(/\s+/g, ' ')
    .trim();

// The tag field holds a free comma list, cut off at this many characters
const TAG_FIELD_LENGTH = 50;

const tagsOf = (raw: string) => {
  const parts = raw.split(/,|\s{2,}/).map((t) => t.trim().replace(/\.$/, '')).filter(Boolean);
  if (raw.length >= TAG_FIELD_LENGTH) parts.pop(); // the last one was cut off mid-word
  return parts
    .filter((t) => !/^[a-z0-9]+(-[a-z0-9]+)+$/i.test(t)) // a slug ended up in the tag field
    .map((t) => (t === t.toLowerCase() ? t.replace(/\b\w/g, (c) => c.toUpperCase()) : t));
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

export function toPost(b: ApiPost): Post {
  const body = plainText(b.content ?? '');
  const tags = tagsOf(b.tag ?? '');
  return {
    id: b.id,
    href: `/blog/${b.id}`,
    title: b.title.trim(),
    date: formatDate(b.date),
    iso: b.date,
    tag: tags[0] ?? 'Insights',
    tags,
    image: absolute(b.image ?? null),
    alt: b.image_alt?.trim() || '',
    excerpt: excerptOf(b.meta_description?.trim() || body),
    minutes: Math.max(1, Math.round(body.split(' ').length / 220)),
  };
}

/** The topics several posts share, most used first: the ones worth filtering by */
export function sharedTopics(posts: Post[], count: number) {
  const seen = new Map<string, { label: string; uses: number }>();
  const capitals = (t: string) => t.replace(/[^A-Z]/g, '').length;
  posts.forEach((p) =>
    p.tags.forEach((t) => {
      const key = t.toLowerCase();
      const known = seen.get(key);
      // written both ways, the one with more capitals is the one someone typed with care: "Kerala IT", not "Kerala It"
      seen.set(key, { label: known && capitals(known.label) >= capitals(t) ? known.label : t, uses: (known?.uses ?? 0) + 1 });
    }),
  );
  return [...seen.values()]
    .filter((t) => t.uses > 1)
    .sort((a, b) => b.uses - a.uses)
    .slice(0, count);
}

export const hasTopic = (post: Post, topic: string) => post.tags.some((t) => t.toLowerCase() === topic.toLowerCase());

/** What to read next: posts sharing the most topics with this one, and the newest of those */
export function relatedTo(post: Post, posts: Post[], count: number) {
  const shared = (other: Post) => other.tags.filter((t) => hasTopic(post, t)).length;
  return posts
    .filter((p) => p.id !== post.id)
    .map((p, order) => ({ p, order, score: shared(p) }))
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, count)
    .map(({ p }) => p);
}

/** A post can point at one of our service pages */
export const serviceSlugOf = (link?: string | null) => /in-tasolutions\.com\/services\/([a-z0-9-]+)/i.exec(link ?? '')?.[1] ?? null;

// The work on the portfolio page, as it comes from the admin. Projects get a unit of their own in the rack; the gallery's sites follow it.

export type ApiProject = {
  id: number;
  title: string;
  slug: string;
  role?: string | null;
  summary?: string | null;
  hero?: string | null;
  tags?: { name: string }[];
  external_url?: string | null;
  is_active?: boolean;
};

export type ApiSite = { id: number; title: string; image?: string | null; href?: string | null; is_active?: boolean };

export type RackProject = {
  id: number;
  title: string;
  /** what comes after a dash in the title in the admin: "iGen Properties – Property Management Software" */
  sub: string;
  role: string;
  summary: string;
  hero: string | null;
  tags: string[];
  url: string;
  host: string;
  /** the site answered when our server last looked */
};

export type RackSite = { id: number; title: string; sub: string; image: string | null; url: string; host: string };

export type Work = { projects: RackProject[]; sites: RackSite[] };

function splitTitle(title: string): [string, string] {
  const clean = title.trim();
  const dash = clean.match(/^(.+?)\s+[–—-]\s+(.+)$/);
  if (dash) return [dash[1], dash[2]];
  const brackets = clean.match(/^(.+?)\s*\((.+)\)$/);
  if (brackets) return [brackets[1], brackets[2]];
  return [clean, ''];
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

const absolute = (src: string | null | undefined, base: string) => {
  if (!src) return null;
  return src.startsWith('/media/') ? `${base}${src}` : src;
};

/** What the page needs from the API's answers. `up` holds the addresses that answered our server: nobody is sent to one that didn't. Without it (asked from the browser) they can't be checked. */
export function toWork(projects: ApiProject[], sites: ApiSite[], base: string, up?: Set<string>): Work {
  const usable = (url?: string | null) => {
    const clean = url?.trim() ?? '';
    return !up || up.has(clean) ? clean : '';
  };
  return {
    projects: projects
      .filter((p) => p.is_active !== false)
      .map((p) => {
        const [title, sub] = splitTitle(p.title);
        const url = usable(p.external_url);
        return {
          id: p.id,
          title,
          sub,
          role: p.role?.trim() ?? '',
          summary: p.summary?.trim() ?? '',
          hero: absolute(p.hero, base),
          tags: (p.tags ?? []).map((t) => t.name),
          url,
          host: hostOf(url),
        };
      }),
    sites: sites
      .filter((s) => s.is_active !== false)
      .map((s) => {
        const [title, sub] = splitTitle(s.title);
        const url = usable(s.href);
        return { id: s.id, title, sub, image: absolute(s.image, base), url, host: hostOf(url) };
      }),
  };
}

/** The tags that several projects share, most used first: the ones worth filtering by */
export function sharedTags(projects: RackProject[], count: number) {
  const uses = new Map<string, number>();
  projects.forEach((p) => p.tags.forEach((t) => uses.set(t, (uses.get(t) ?? 0) + 1)));
  return [...uses.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, count)
    .map(([t]) => t);
}

/** Local files can't go through the image optimiser; images on Cloudinary can */
export const optimisable = (src: string) => src.includes('res.cloudinary.com');

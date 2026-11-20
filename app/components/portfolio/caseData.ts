// A project's own page (/portfolio/<slug>), as it comes from the admin. A project only has one when "What the client
// needed" and "What we built" are both filled in (the API's case_study): only what is true about the project.

export type ApiCaseProject = {
  id: number;
  title: string;
  slug: string;
  role?: string | null;
  summary?: string | null;
  hero?: string | null;
  tags?: { name: string }[];
  external_url?: string | null;
  is_active?: boolean;
  case_study?: boolean;
  challenge?: string | null;
  solution?: string | null;
  outcome?: string | null;
  stack?: string | null;
  meta_description?: string | null;
  services?: { title: string; slug: string }[];
  updated_at?: string | null;
};

export type CaseProject = {
  slug: string;
  /** the whole title, as in the admin */
  title: string;
  /** the name before a dash ("iGen Properties"), and what comes after it ("Property Management Software") */
  name: string;
  sub: string;
  role: string;
  summary: string;
  hero: string | null;
  tags: string[];
  /** the live site, only when it answered our server's last check */
  url: string;
  host: string;
  challenge: string;
  solution: string;
  outcome: string;
  stack: string[];
  services: { title: string; slug: string }[];
};

/** The next project with a page of its own, for the link at the end */
export type CaseLink = { slug: string; name: string; sub: string; role: string; hero: string | null };

function splitTitle(title: string): [string, string] {
  const clean = title.trim();
  const dash = clean.match(/^(.+?)\s+[–—-]\s+(.+)$/);
  if (dash) return [dash[1], dash[2]];
  const brackets = clean.match(/^(.+?)\s*\((.+)\)$/);
  if (brackets) return [brackets[1], brackets[2]];
  return [clean, ''];
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

const absolute = (src: string | null | undefined, base: string) => (!src ? null : src.startsWith('/media/') ? `${base}${src}` : src);

/** Whether a project has a page of its own (an older API without case_study: when the two texts are there) */
export const hasCaseStudy = (p: ApiCaseProject) => p.is_active !== false && (p.case_study ?? !!(p.challenge?.trim() && p.solution?.trim()));

export const casePath = (slug: string) => `/portfolio/${slug}`;

/** `live` is whether the project's site answered: nobody is sent to one that didn't */
export function toCase(p: ApiCaseProject, base: string, live: boolean): CaseProject {
  const [name, sub] = splitTitle(p.title);
  const url = live ? p.external_url?.trim() ?? '' : '';
  return {
    slug: p.slug,
    title: p.title.trim(),
    name,
    sub,
    role: p.role?.trim() ?? '',
    summary: p.summary?.trim() ?? '',
    hero: absolute(p.hero, base),
    tags: (p.tags ?? []).map((t) => t.name),
    url,
    host: hostOf(url),
    challenge: p.challenge?.trim() ?? '',
    solution: p.solution?.trim() ?? '',
    outcome: p.outcome?.trim() ?? '',
    stack: (p.stack ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    services: p.services ?? [],
  };
}

export function toCaseLink(p: ApiCaseProject, base: string): CaseLink {
  const [name, sub] = splitTitle(p.title);
  return { slug: p.slug, name, sub, role: p.role?.trim() ?? '', hero: absolute(p.hero, base) };
}

// A service as its detail page uses it. Everything comes from the admin, and anything the API doesn't send yet is simply empty.

export type DetailImage = { id: number; image: string; caption: string; alt: string };
export type DetailFaq = { id: number; question: string; answer: string };
export type DetailProject = { id: number; title: string; role: string; summary: string; hero: string | null; tags: string[]; url: string };
export type DetailTool = { name: string; logo: string | null };
export type DetailBenefit = { id: number; title: string; description: string };
export type DetailCapability = { id: number; title: string; description: string; points: string[]; image: string | null };

export type DetailService = {
  slug: string;
  title: string;
  short: string;
  long: string;
  secondTitle: string;
  second: string;
  secondImage: string | null;
  image: string | null;
  imageAlt: string;
  /** the wording the admin has changed, and the sections it has switched off */
  text: Record<string, string>;
  hide: string[];
  idealFor: string[];
  capabilities: DetailCapability[];
  features: string[];
  technologies: DetailTool[];
  benefits: DetailBenefit[];
  gallery: DetailImage[];
  faqs: DetailFaq[];
  projects: DetailProject[];
};

/** The standard wording of the page. Each can be changed per service in the admin: see services/page_text.py, which holds the same list. */
export const STANDARD_WORDS = {
  breadcrumb: 'Services',
  hero_kicker: '{part} // Our service',
  cta_primary: 'Start this project',
  cta_secondary: 'See what we do',
  fact_capabilities: 'Things we do',
  fact_features: 'Functions',
  fact_tools: 'Tools',
  fact_projects: 'Live projects',
  diving: 'Going inside // {part}',
  hud_target: 'Target',
  hud_field: 'Field of view',
  overview_kicker: 'What it does // {part}',
  overview_title: 'What it | does.',
  ideal_for_label: 'Right for you if',
  die_kicker: 'What we do // Inside the {part_lower}',
  die_title: 'What we | do.',
  die_kicker_benefits: 'What you get // Inside the {part_lower}',
  die_title_benefits: 'What you | get.',
  skip: 'Skip',
  closer_kicker: 'In depth // {part}',
  closer_title: 'A closer | look.',
  pins_kicker: 'In and out // {part}',
  pins_title: 'What goes in. | What you get.',
  pins_kicker_single: "What's included // {part}",
  pins_title_single: "What's | included.",
  pins_in: 'What goes in',
  pins_out: 'What you get',
  show_all: 'Show all {count}',
  use_kicker: 'In real use // Live work and pictures',
  use_title: 'In real | use.',
  live_tag: 'Live work',
  tools_kicker: 'Tools we use // Plugged in',
  tools_title: 'Tools we | use.',
  faq_kicker: 'Questions // Before you start',
  faq_title: 'Good | questions.',
  faq_window: 'questions.log',
  connected_kicker: 'Connected parts // On the same board',
  connected_title: 'It connects | to these.',
  board_link: 'See the whole board',
  form_kicker: 'Work with us',
  form_title: 'Have a project in mind?',
  form_text: "Share your details and we'll reach out to talk through how we can build it.",
};

export type WordKey = keyof typeof STANDARD_WORDS;
export type Words = (key: WordKey, values?: Record<string, string | number>) => string;

/** This service's wording: what the admin has changed, and the standard for the rest */
export function wordsFor(service: DetailService, part: string): Words {
  return (key, values = {}) => {
    const all: Record<string, string | number> = { part, part_lower: part.toLowerCase(), title: service.title, ...values };
    return (service.text[key] || STANDARD_WORDS[key]).replace(/\{(\w+)\}/g, (whole, name) => (name in all ? String(all[name]) : whole));
  };
}

export type RelatedService = { slug: string; title: string; short: string };

type Named = { name?: string; logo?: string | null } | string;

export type ApiService = {
  slug: string;
  title: string;
  short_description?: string | null;
  long_description?: string | null;
  ideal_for?: string[];
  page_text?: Record<string, unknown> | null;
  capabilities?: { id: number; title: string; description?: string | null; points?: string[]; image?: string | null }[];
  secondary_title?: string | null;
  secondary_description?: string | null;
  secondary_image?: string | null;
  image?: string | null;
  image_alt?: string | null;
  features?: Named[];
  technologies?: Named[];
  benefits?: { id: number; title: string; description?: string | null }[];
  gallery?: { id: number; image: string; caption?: string | null; alt_text?: string | null }[];
  faqs?: { id: number; question: string; answer: string }[];
  projects?: { id: number; title: string; role?: string | null; summary?: string | null; hero?: string | null; tags?: string[]; external_url?: string | null }[];
};

const nameOf = (x: Named) => (typeof x === 'string' ? x : (x.name ?? ''));

export function toDetail(api: ApiService): DetailService {
  return {
    slug: api.slug,
    title: api.title.trim(),
    short: api.short_description?.trim() ?? '',
    long: api.long_description?.trim() ?? '',
    secondTitle: api.secondary_title?.trim() ?? '',
    second: api.secondary_description?.trim() ?? '',
    secondImage: api.secondary_image ?? null,
    image: api.image ?? null,
    imageAlt: api.image_alt?.trim() || api.title,
    text: Object.fromEntries(Object.entries(api.page_text ?? {}).filter((e): e is [string, string] => typeof e[1] === 'string')),
    hide: Array.isArray(api.page_text?.hide) ? (api.page_text.hide as string[]) : [],
    idealFor: api.ideal_for ?? [],
    capabilities: (api.capabilities ?? []).map((c) => ({ id: c.id, title: c.title, description: c.description ?? '', points: c.points ?? [], image: c.image ?? null })),
    features: (api.features ?? []).map(nameOf).filter(Boolean),
    technologies: (api.technologies ?? []).map((t) => ({ name: nameOf(t), logo: typeof t === 'string' ? null : (t.logo ?? null) })).filter((t) => t.name),
    benefits: (api.benefits ?? []).map((b) => ({ id: b.id, title: b.title, description: b.description ?? '' })),
    gallery: (api.gallery ?? []).filter((g) => g.image).map((g) => ({ id: g.id, image: g.image, caption: g.caption ?? '', alt: g.alt_text || g.caption || '' })),
    faqs: api.faqs ?? [],
    projects: (api.projects ?? []).map((p) => ({ id: p.id, title: p.title, role: p.role ?? '', summary: p.summary ?? '', hero: p.hero ?? null, tags: p.tags ?? [], url: p.external_url ?? '' })),
  };
}

/** Local files can't go through the image optimiser; images on Cloudinary can */
export const optimisable = (src: string) => src.includes('res.cloudinary.com');

/** A heading without its marker, for places that show it as plain words */
export const plainTitle = (title: string) => title.replace('|', ' ').replace(/\s+/g, ' ').trim().replace(/\.$/, '');

/** The words after a | in a heading take the accent. Without one the last word does, as everywhere on the site. */
export function splitAccent(title: string): [string, string] {
  const marked = title.indexOf('|');
  if (marked >= 0) return [title.slice(0, marked).trim(), title.slice(marked + 1).replace('|', ' ').trim()];
  const words = title.trim().split(/\s+/);
  if (words.length < 2) return ['', title];
  return [words.slice(0, -1).join(' '), words[words.length - 1]];
}

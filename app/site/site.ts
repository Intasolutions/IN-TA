// The company's details and the website's wording, as edited in the admin (Site settings), with what the site showed
// before as the fallback for anything the API doesn't send: an older backend, or one that is asleep.
import wording from '../../home/site_text.json';

/** A service's card on the home page (Services > a service > Home page card): n is the card, 1 to 5 */
export type HomeCard = { n: number; track: string; title: string; text: string; tags: string[]; icon: string };
export type SiteService = { title: string; slug: string; card: HomeCard | null };
export type StackGroup = 'ai' | 'frontend' | 'design' | 'backend' | 'cloud';
export type StackTool = { name: string; slug: string; logo: string; group: StackGroup; use: string };
export type Metric = { label: string; value: string; unit: string; note: string };

export type Site = {
  phone: string;
  email: string;
  address: { street: string; locality: string; district: string; region: string; postal_code: string; country: string };
  map: { lat: number; lng: number; url: string };
  /** days: 0 = Sunday; opens and closes: 'HH:MM', India time */
  hours: { days: number[]; opens: string; closes: string };
  socials: { linkedin: string; instagram: string; facebook: string; x: string; youtube: string };
  metrics: Metric[];
  text: Record<string, string>;
  services: SiteService[];
  stack: StackTool[];
  /** When Site settings were last saved (null from an older API) */
  updatedAt: string | null;
};

/** The office's time zone: the hours above are in it */
export const TIME_ZONE = 'Asia/Kolkata';

// Logos the site already has, for the tools that have none uploaded in the admin
const LOGOS: Record<string, string> = {
  openai: '/logos/openai.svg',
  pytorch: '/logos/pytorch.svg',
  tensorflow: '/logos/tensorflow.svg',
  python: '/logos/python.svg',
  nodejs: '/logo/node.svg',
  react: '/logo/React.svg',
  nextjs: '/next.svg',
  typescript: '/logo/typescript.svg',
  tailwind: '/logos/tailwind.svg',
  aws: '/logos/aws.svg',
  docker: '/logos/docker.svg',
  figma: '/logos/figma.svg',
};

export const DEFAULT_SITE: Site = {
  phone: '+91 94475 95381',
  email: 'info@in-tasolutions.com',
  address: { street: 'Thonichal', locality: 'Mananthavady', district: 'Wayanad', region: 'Kerala', postal_code: '670645', country: 'IN' },
  map: { lat: 11.8021, lng: 76.0232, url: '' },
  hours: { days: [1, 2, 3, 4, 5, 6], opens: '09:00', closes: '17:00' },
  socials: {
    linkedin: 'https://www.linkedin.com/company/in-ta-solutions/',
    instagram: 'https://www.instagram.com/intasolutions',
    facebook: 'https://www.facebook.com/share/17taAqPXPP/',
    x: 'https://x.com/intasolution',
    youtube: 'https://www.youtube.com/@IN-TASolutionsPvtLtd',
  },
  metrics: [
    { label: 'EXPERIENCE INDEX', value: '02', unit: '+ Yrs', note: 'High-stakes engineering' },
    { label: 'PRODUCTION UNITS', value: '20', unit: '+', note: 'Enterprise grade deployments' },
    { label: 'UPTIME / SLA', value: '99.9', unit: '%', note: 'Production uptime' },
    { label: 'DATA PIPELINES', value: '<100', unit: 'ms', note: 'Edge telemetry response' },
  ],
  text: {},
  // Mirrors the services in /api/home/site/ (in their display order), with the home page cards they had
  services: [
    {
      title: 'AI Integration & Model Training',
      slug: 'ai-integration-model-training',
      card: {
        n: 1,
        track: 'Track 01 // Cognitive',
        title: 'AI Integration & Autonomous Agents',
        text: 'Fine-tuned large language models, retrieval-augmented generation (RAG) networks with low-latency embeddings, agentic workflow loops, and autonomous computer vision models integrated directly into your private business ecosystem.',
        tags: ['LangChain', 'PyTorch Neural', 'OpenAI Whisper/GPT', 'PgVector DB'],
        icon: 'neurology',
      },
    },
    {
      title: 'Web Development',
      slug: 'web-development',
      card: {
        n: 2,
        track: 'Track 02 // Web Runtimes',
        title: 'Next-Gen Web Architecture',
        text: 'Edge-rendered Next.js platforms, atomic design component trees, strictly typed contracts with sub-second page transitions.',
        tags: ['Next.js', 'TypeScript', 'Tailwind'],
        icon: 'code',
      },
    },
    {
      title: 'Software Development',
      slug: 'software-development',
      card: {
        n: 3,
        track: 'Track 03 // Enterprise',
        title: 'Enterprise Systems & ERP',
        text: 'Industrial resource planners, hospital clinical records, automated inventory pipelines, and high-concurrency relational data warehouses.',
        tags: ['PostgreSQL', 'Python Backend'],
        icon: 'domain',
      },
    },
    {
      title: 'Mobile App',
      slug: 'mobile-app',
      card: {
        n: 4,
        track: 'Track 04 // Cross-Platform',
        title: 'Mobile Ecosystems',
        text: 'Native-speed 60fps applications across iOS & Android. Offline-first synchronization, secure keychain biometrics, and push streaming.',
        tags: ['Flutter', 'React Native'],
        icon: 'devices',
      },
    },
    { title: 'Digital Marketing', slug: 'Marketing', card: null },
    { title: 'UI/UX Design', slug: 'ui-ux-design', card: null },
    {
      title: 'SEO, AEO & GEO Services',
      slug: 'seo-aeo-geo-services',
      card: {
        n: 5,
        track: 'Track 05 // Vitals',
        title: 'Performance & Schema Growth',
        text: '100/100 Google Lighthouse velocity metrics, algorithmic structured JSON-LD schemas, and CDN edge optimization ensuring maximum visibility.',
        tags: ['100% Score', 'Edge Purge'],
        icon: 'speed',
      },
    },
    { title: 'Media Production', slug: 'media-production', card: null },
  ],
  stack: [
    ['OpenAI', 'openai', 'ai', 'LLM features, assistants and smart search'],
    ['PyTorch', 'pytorch', 'ai', 'Training and fine-tuning custom models'],
    ['TensorFlow', 'tensorflow', 'ai', 'Vision and prediction models in production'],
    ['React', 'react', 'frontend', 'Interactive interfaces for web apps'],
    ['Next.js', 'nextjs', 'frontend', 'Fast, SEO-friendly websites and platforms'],
    ['TypeScript', 'typescript', 'frontend', 'Type-safe code across the whole stack'],
    ['Tailwind', 'tailwind', 'frontend', 'Consistent, responsive design systems'],
    ['Figma', 'figma', 'design', 'Wireframes, prototypes and UI design'],
    ['Python', 'python', 'backend', 'Django APIs, data pipelines and automation'],
    ['Node.js', 'nodejs', 'backend', 'APIs, real-time services and tooling'],
    ['AWS', 'aws', 'cloud', 'Hosting, storage and scalable infrastructure'],
    ['Docker', 'docker', 'cloud', 'Reproducible builds and deployments'],
  ].map(([name, slug, group, use]) => ({ name, slug, logo: LOGOS[slug], group: group as StackGroup, use })),
  updatedAt: null,
};

// ---------- Wording ----------

const STANDARD: Record<string, string> = Object.fromEntries(
  wording.groups.flatMap((g) => g.items.map(([key, , text]) => [key, text])),
);

/** A wording: as changed in the admin, or the standard one. {name} is filled from `values`, and {street}, {locality},
 * {district} and {region} from the office address, so wording that names the place follows it. */
export function textOf(site: Site, key: string, values?: Record<string, string | number>) {
  const text = site.text[key]?.trim() || STANDARD[key];
  if (text === undefined) {
    if (process.env.NODE_ENV === 'development') console.warn(`Unknown site wording: ${key}`);
    return key;
  }
  const { street, locality, district, region } = site.address;
  const fill: Record<string, string | number> = { street, locality, district, region, ...values };
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in fill ? String(fill[name]) : m));
}

/** The standard wording, before any change in the admin */
export const standardText = (key: string) => STANDARD[key] ?? '';

/** A heading's plain words and its blue ones: | marks where the blue starts, else it's the last word */
export function accent(text: string): [string, string] {
  const at = text.indexOf('|');
  if (at >= 0) return [text.slice(0, at).trim(), text.slice(at + 1).replace(/\|/g, ' ').trim()];
  const words = text.trim().split(/\s+/);
  return words.length < 2 ? ['', text.trim()] : [words.slice(0, -1).join(' '), words[words.length - 1]];
}

/** Items typed with commas between them */
export const listOf = (text: string) => text.split(',').map((s) => s.trim()).filter(Boolean);
/** Items typed one per line */
export const linesOf = (text: string) => text.split('\n').map((s) => s.trim()).filter(Boolean);

// ---------- Details, in the forms the pages show them ----------

export const phoneHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
export const phoneDigits = (phone: string) => phone.replace(/\D/g, '');

export const mapUrl = (site: Site) => site.map.url || `https://www.google.com/maps/search/?api=1&query=${site.map.lat},${site.map.lng}`;

const degrees = (n: number, pos: string, neg: string) => `${Math.abs(n)}° ${n >= 0 ? pos : neg}`;
/** 11.8021° N, 76.0232° E */
export const coords = (site: Site) => `${degrees(site.map.lat, 'N', 'S')}, ${degrees(site.map.lng, 'E', 'W')}`;
export const latitude = (site: Site) => degrees(site.map.lat, 'N', 'S');

/** The two lines of the postal address: "Thonichal, Mananthavady," and "Wayanad, Kerala 670645" */
export const addressLines = ({ address: a }: Site): [string, string] => [
  `${[a.street, a.locality].filter(Boolean).join(', ')},`,
  `${[a.district, a.region].filter(Boolean).join(', ')} ${a.postal_code}`.trim(),
];

export const countryName = (code: string) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
};

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LONG_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** 'HH:MM' as minutes after midnight */
export const minutesOf = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** 9 AM, 5:30 PM */
export const clockOf = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
};

// The open days, Monday first, as runs of days next to each other: Mon–Sat, or Mon–Wed, Fri
function dayRuns(days: number[]) {
  const order = [1, 2, 3, 4, 5, 6, 0].filter((d) => days.includes(d));
  const runs: number[][] = [];
  for (const d of order) {
    const run = runs[runs.length - 1];
    const prev = run?.[run.length - 1];
    if (run && prev !== undefined && (prev + 1) % 7 === d) run.push(d);
    else runs.push([d]);
  }
  return runs;
}

const joinWords = (parts: string[]) => (parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`);

/** Mon–Sat · 9 AM–5 PM IST (spaced: 9 AM – 5 PM) */
export function hoursShort(site: Site, spaced = false) {
  const days = dayRuns(site.hours.days)
    .map((r) => (r.length > 2 ? `${SHORT_DAYS[r[0]]}–${SHORT_DAYS[r[r.length - 1]]}` : r.map((d) => SHORT_DAYS[d]).join(', ')))
    .join(', ');
  const dash = spaced ? ' – ' : '–';
  return `${days} · ${clockOf(minutesOf(site.hours.opens))}${dash}${clockOf(minutesOf(site.hours.closes))} IST`;
}

/** Monday to Saturday */
export const daysLong = (site: Site) =>
  joinWords(dayRuns(site.hours.days).map((r) => (r.length > 2 ? `${LONG_DAYS[r[0]]} to ${LONG_DAYS[r[r.length - 1]]}` : joinWords(r.map((d) => LONG_DAYS[d])))));

/** 9 AM to 5 PM */
export const timeLong = (site: Site) => `${clockOf(minutesOf(site.hours.opens))} to ${clockOf(minutesOf(site.hours.closes))}`;

// ---------- From the API ----------

const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v.trim() : fallback);
const filled = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v.trim() : fallback);
// The icons a home page card can have (Service.CARD_ICONS in services/models.py; all loaded in app/layout.tsx)
const CARD_ICONS = new Set(['neurology', 'code', 'domain', 'devices', 'speed', 'design_services', 'terminal', 'developer_board', 'travel_explore', 'search']);
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const GROUPS: StackGroup[] = ['ai', 'frontend', 'design', 'backend', 'cloud'];
const isTime = (v: unknown): v is string => typeof v === 'string' && /^\d{1,2}:\d{2}$/.test(v);
// What the API sends, before it's checked field by field below
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** /api/home/site/ made safe: anything missing or malformed keeps what the site showed before */
export function toSite(api: unknown, apiBase = ''): Site {
  const d = DEFAULT_SITE;
  if (!api || typeof api !== 'object') return d;
  const a = api as Json;
  const abs = (url: string) => (url.startsWith('/') ? `${apiBase}${url}` : url);

  const days = Array.isArray(a.hours?.days) ? a.hours.days.filter((x: unknown) => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= 6) : [];
  const metrics: Metric[] = Array.isArray(a.metrics)
    ? a.metrics
        .filter((m: Json) => m && filled(m.label, '') && filled(m.value, ''))
        .map((m: Json) => ({ label: m.label.trim(), value: m.value.trim(), unit: str(m.unit, ''), note: str(m.note, '') }))
    : [];
  // (a backend from before the home page cards were editable sends none: its services keep the cards they had)
  const sendsCards = Array.isArray(a.services) && a.services.some((s: Json) => s && typeof s === 'object' && 'card' in s);
  const cardOf = (c: Json, slug: string): HomeCard | null => {
    if (!sendsCards) return d.services.find((x) => x.slug === slug)?.card ?? null;
    if (!c || !Number.isInteger(c.n) || c.n < 1 || c.n > 5 || !filled(c.title, '')) return null;
    const tags = Array.isArray(c.tags) ? c.tags.filter((t: unknown) => typeof t === 'string' && t.trim()).map((t: string) => t.trim()) : [];
    return { n: c.n, track: str(c.track, ''), title: c.title.trim(), text: str(c.text, ''), tags, icon: CARD_ICONS.has(c.icon) ? c.icon : '' };
  };
  const services: SiteService[] = Array.isArray(a.services)
    ? a.services
        .filter((s: Json) => filled(s?.title, '') && filled(s?.slug, ''))
        .map((s: Json) => ({ title: s.title.trim(), slug: s.slug.trim(), card: cardOf(s.card, s.slug.trim()) }))
    : [];
  const stack: StackTool[] = Array.isArray(a.stack)
    ? a.stack
        .filter((t: Json) => filled(t?.name, '') && GROUPS.includes(t?.group) && (filled(t?.logo, '') || LOGOS[t?.slug]))
        .map((t: Json) => ({ name: t.name.trim(), slug: String(t.slug ?? ''), logo: t.logo ? abs(t.logo) : LOGOS[t.slug], group: t.group, use: str(t.use, '') }))
    : [];
  const text: Record<string, string> = {};
  if (a.text && typeof a.text === 'object') {
    // legal_ entries are the Terms, Privacy and Security documents (home/legal_text.json), read only by those pages
    for (const [k, v] of Object.entries(a.text)) if (typeof v === 'string' && v.trim() && (k in STANDARD || k.startsWith('legal_'))) text[k] = v;
  }

  return {
    phone: filled(a.phone, d.phone),
    email: filled(a.email, d.email),
    address: {
      street: str(a.address?.street, d.address.street),
      locality: str(a.address?.locality, d.address.locality),
      district: str(a.address?.district, d.address.district),
      region: str(a.address?.region, d.address.region),
      postal_code: str(a.address?.postal_code, d.address.postal_code),
      country: filled(a.address?.country, d.address.country),
    },
    map: { lat: num(a.map?.lat, d.map.lat), lng: num(a.map?.lng, d.map.lng), url: str(a.map?.url, '') },
    hours: days.length && isTime(a.hours?.opens) && isTime(a.hours?.closes) ? { days, opens: a.hours.opens, closes: a.hours.closes } : d.hours,
    socials: {
      linkedin: str(a.socials?.linkedin, d.socials.linkedin),
      instagram: str(a.socials?.instagram, d.socials.instagram),
      facebook: str(a.socials?.facebook, d.socials.facebook),
      x: str(a.socials?.x, d.socials.x),
      youtube: str(a.socials?.youtube, d.socials.youtube),
    },
    // A backend without these yet sends none: keep what the site had. (An empty orbit or footer would look broken.)
    metrics: Array.isArray(a.metrics) ? metrics : d.metrics,
    text,
    services: services.length ? services : d.services,
    stack: stack.length ? stack : d.stack,
    updatedAt: filled(a.updated_at, '') || null,
  };
}

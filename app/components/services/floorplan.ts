// The Services page: every service is a part on one circuit board. This file says where each part sits, how the copper
// connects them and what the camera does there. Which service sits on which part, and the name printed on it, are set in
// the admin (Services > a service > Services page board), as are each service's title, description and features.

/** What the admin sends about a service's place on the board: undefined from a backend that doesn't have places yet */
type Placed = { part?: BlockKind | null; label?: string | null };
/** Any service, as far as the board needs to know it */
export type Holder = { slug: string; title: string } & Placed;
export type ChipService = { slug: string; title: string; description: string; features: string[] } & Placed;

/** The order the field shader expects them in */
export const KIND = { software: 0, ui: 1, web: 2, marketing: 3, seo: 4, media: 5, mobile: 6, ai: 7, yours: 8 } as const;
export type BlockKind = keyof typeof KIND;

export type Shot = { az: number; el: number; w: number; roll?: number };

export type Block = {
  kind: BlockKind;
  id: string;
  /** on the board: x0, z0, x1, z1 */
  rect: [number, number, number, number];
  /** a short name, printed on the part and shown in the readout, unless the admin gives the part another */
  short: string;
  /** what this part would be called on a real board */
  part: string;
  /** the service it held before the admin chose (for a backend without places, or one that can't be reached) */
  standard?: { slug: string; title: string };
  shot: Shot;
};

/** The board itself, and the heights of its layers */
export const BOARD = { half: 1.3, corner: 0.07, top: -0.036, bottom: -0.11 };

// Clockwise round the board from the top left, then into the centre
export const BLOCKS: Block[] = [
  {
    kind: 'software',
    id: 'software-development',
    rect: [-1, -1, -0.44, -0.36],
    short: 'Software',
    part: 'Compute core',
    standard: { slug: 'software-development', title: 'Software Development' },
    shot: { az: -24, el: 42, w: 0.86 },
  },
  {
    kind: 'ui',
    id: 'ui-ux-design',
    rect: [-0.3, -1, 0.3, -0.5],
    short: 'UI/UX',
    part: 'Display engine',
    standard: { slug: 'ui-ux-design', title: 'UI/UX Design' },
    shot: { az: 14, el: 54, w: 0.84 },
  },
  {
    kind: 'web',
    id: 'web-development',
    rect: [0.44, -1, 1, -0.32],
    short: 'Web',
    part: 'Network block',
    standard: { slug: 'web-development', title: 'Web Development' },
    shot: { az: -16, el: 44, w: 0.9 },
  },
  {
    kind: 'marketing',
    id: 'Marketing',
    rect: [0.5, -0.16, 1, 0.28],
    short: 'Marketing',
    part: 'Signal block',
    standard: { slug: 'Marketing', title: 'Digital Marketing' },
    shot: { az: 24, el: 42, w: 0.74 },
  },
  {
    kind: 'seo',
    id: 'seo-aeo-geo-services',
    rect: [0.44, 0.42, 1, 1],
    short: 'SEO / AEO / GEO',
    part: 'Index block',
    standard: { slug: 'seo-aeo-geo-services', title: 'SEO, AEO & GEO Services' },
    shot: { az: -10, el: 56, w: 0.8 },
  },
  {
    kind: 'media',
    id: 'media-production',
    rect: [-0.32, 0.52, 0.32, 1],
    short: 'Media',
    part: 'Media engine',
    standard: { slug: 'media-production', title: 'Media Production' },
    shot: { az: 12, el: 50, w: 0.84 },
  },
  {
    kind: 'mobile',
    id: 'mobile-app',
    rect: [-1, 0.3, -0.46, 1],
    short: 'Mobile',
    part: 'Mobile cluster',
    standard: { slug: 'mobile-app', title: 'Mobile App' },
    shot: { az: -26, el: 48, w: 0.92 },
  },
];

export const AI_BLOCK: Block = {
  kind: 'ai',
  id: 'ai',
  rect: [-0.34, -0.36, 0.36, 0.38],
  short: 'AI',
  part: 'Neural engine',
  standard: { slug: 'ai-integration-model-training', title: 'AI Integration & Model Training' },
  shot: { az: 10, el: 42, w: 1 },
};

export const YOUR_BLOCK: Block = {
  kind: 'yours',
  id: 'your-project',
  rect: [-1, -0.2, -0.52, 0.16],
  short: 'Your project',
  part: 'Empty socket',
  shot: { az: -6, el: 62, w: 0.92 },
};

export const ALL_BLOCKS: Block[] = [...BLOCKS, AI_BLOCK, YOUR_BLOCK];

// ---------- Which service is on which part ----------

/** The parts a service can sit on */
const PARTS: Block[] = [...BLOCKS, AI_BLOCK];
const KINDS = new Set<string>(PARTS.map((b) => b.kind));

/** A part as the API sends it ('' or an unknown one is no part; undefined means the backend doesn't send parts yet) */
export const partOf = (value: unknown): BlockKind | null | undefined =>
  value === undefined ? undefined : typeof value === 'string' && KINDS.has(value) ? (value as BlockKind) : null;

export type Names = Partial<Record<BlockKind, string>>;
export type Board<T> = { at: Map<BlockKind, T>; names: Names };

/** Each part's service, and the names the admin printed on them. From a backend that doesn't send places yet, the parts
 * keep the services they always had. */
export function boardOf<T extends { slug: string } & Placed>(services: T[]): Board<T> {
  const sendsParts = services.some((s) => s.part !== undefined);
  const at = new Map<BlockKind, T>();
  const names: Names = {};
  PARTS.forEach((b) => {
    const s = sendsParts ? services.find((x) => x.part === b.kind) : services.find((x) => x.slug === b.standard?.slug);
    if (!s) return;
    at.set(b.kind, s);
    if (s.label?.trim()) names[b.kind] = s.label.trim();
  });
  return { at, names };
}

/** The board as it was, for when the API can't be reached at all: the page still shows every part */
export const STANDARD_SERVICES: ChipService[] = PARTS.map((b) => ({ slug: b.standard!.slug, title: b.standard!.title, description: '', features: [], part: b.kind }));

/** The name printed on a part */
export const nameOf = (b: Block, names: Names) => names[b.kind] ?? b.short;

/** Every part by the index the shader knows it by */
export const RECTS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  ALL_BLOCKS.forEach((b) => {
    out[KIND[b.kind]] = b.rect;
  });
  return out;
})();

export const centreOf = (b: Block): [number, number] => [(b.rect[0] + b.rect[2]) / 2, (b.rect[1] + b.rect[3]) / 2];

/** The web block's pages, on the board: centre, half size */
export const WEB_TILES: [number, number, number, number][] = (() => {
  const web = BLOCKS.find((b) => b.kind === 'web')!;
  const [cx, cz] = centreOf(web);
  const hx = (web.rect[2] - web.rect[0]) / 2;
  const hz = (web.rect[3] - web.rect[1]) / 2;
  const tile = (x: number, z: number, w: number, h: number): [number, number, number, number] => [cx + x * hx, cz + z * hz, w * hx, h * hz];
  return [tile(0, 0, 0.52, 0.33), tile(-0.6, -0.66, 0.29, 0.19), tile(0.6, -0.66, 0.29, 0.19), tile(-0.64, 0.66, 0.27, 0.25), tile(0.64, 0.68, 0.27, 0.25)];
})();

export type Point = [number, number];

/** The copper that joins the parts: each run is up to four points, and every run is really drawn on the board */
export const LINKS: { from: BlockKind; to: BlockKind; path: Point[] }[] = [
  // round the outside
  { from: 'software', to: 'ui', path: [[-0.44, -0.75], [-0.3, -0.75]] },
  { from: 'ui', to: 'web', path: [[0.3, -0.75], [0.44, -0.75]] },
  { from: 'web', to: 'marketing', path: [[0.75, -0.32], [0.75, -0.16]] },
  { from: 'marketing', to: 'seo', path: [[0.75, 0.28], [0.75, 0.42]] },
  { from: 'seo', to: 'media', path: [[0.44, 0.76], [0.32, 0.76]] },
  { from: 'media', to: 'mobile', path: [[-0.32, 0.76], [-0.46, 0.76]] },
  { from: 'mobile', to: 'yours', path: [[-0.76, 0.3], [-0.76, 0.16]] },
  { from: 'yours', to: 'software', path: [[-0.76, -0.2], [-0.76, -0.36]] },
  // and from the centre to all of them
  { from: 'ai', to: 'ui', path: [[0.01, -0.36], [0.01, -0.5]] },
  { from: 'ai', to: 'media', path: [[0.01, 0.38], [0.01, 0.52]] },
  { from: 'ai', to: 'marketing', path: [[0.36, 0.06], [0.5, 0.06]] },
  { from: 'ai', to: 'yours', path: [[-0.34, -0.02], [-0.52, -0.02]] },
  { from: 'ai', to: 'software', path: [[-0.22, -0.36], [-0.22, -0.43], [-0.37, -0.43], [-0.44, -0.5]] },
  { from: 'ai', to: 'web', path: [[0.24, -0.36], [0.24, -0.43], [0.37, -0.43], [0.44, -0.5]] },
  { from: 'ai', to: 'mobile', path: [[-0.22, 0.38], [-0.22, 0.45], [-0.39, 0.45], [-0.46, 0.52]] },
  { from: 'ai', to: 'seo', path: [[0.24, 0.38], [0.24, 0.46], [0.38, 0.46], [0.44, 0.52]] },
];

/** The copper between two parts, in the direction of travel */
export function linkBetween(from: BlockKind, to: BlockKind): Point[] | null {
  const direct = LINKS.find((l) => l.from === from && l.to === to);
  if (direct) return direct.path;
  const back = LINKS.find((l) => l.from === to && l.to === from);
  return back ? [...back.path].reverse() : null;
}

// The board's wording (titles, the AI part's lines, the ending) is set in the admin: Site settings > Page wording
export const HERO = {
  hint: 'Scroll to go onto the board',
};

export const PLAN = {
  hint: 'Drag to turn the board. Pick any part to fly to it.',
};

// (the transistor figure in the AI part's wording is from https://en.wikipedia.org/wiki/Transistor_count)
export const NOW = {
  words: ['AI', 'AUTOMATE', 'PREDICT', 'ANSWER', 'LEARN'],
};

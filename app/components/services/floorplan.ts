// The Services page: every service is a part on one circuit board. This file says where each part sits, how the copper
// connects them and what the camera does there. Each service's title, description and features come from the admin; the
// words here are the page's own. The one outside figure is from Wikipedia ("Transistor count").

export type ChipService = { slug: string; title: string; description: string; features: string[] };

export const AI_SLUG = 'ai-integration-model-training';

/** The order the field shader expects them in */
export const KIND = { software: 0, ui: 1, web: 2, marketing: 3, seo: 4, media: 5, mobile: 6, ai: 7, yours: 8 } as const;
export type BlockKind = keyof typeof KIND;

export type Shot = { az: number; el: number; w: number; roll?: number };

export type Block = {
  kind: BlockKind;
  id: string;
  /** on the board: x0, z0, x1, z1 */
  rect: [number, number, number, number];
  /** a short name, printed on the part and shown in the readout */
  short: string;
  /** what this part would be called on a real board */
  part: string;
  service?: { slug: string; fallbackTitle: string };
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
    service: { slug: 'software-development', fallbackTitle: 'Software Development' },
    shot: { az: -24, el: 42, w: 0.86 },
  },
  {
    kind: 'ui',
    id: 'ui-ux-design',
    rect: [-0.3, -1, 0.3, -0.5],
    short: 'UI/UX',
    part: 'Display engine',
    service: { slug: 'ui-ux-design', fallbackTitle: 'UI/UX Design' },
    shot: { az: 14, el: 54, w: 0.84 },
  },
  {
    kind: 'web',
    id: 'web-development',
    rect: [0.44, -1, 1, -0.32],
    short: 'Web',
    part: 'Network block',
    service: { slug: 'web-development', fallbackTitle: 'Web Development' },
    shot: { az: -16, el: 44, w: 0.9 },
  },
  {
    kind: 'marketing',
    id: 'Marketing',
    rect: [0.5, -0.16, 1, 0.28],
    short: 'Marketing',
    part: 'Signal block',
    service: { slug: 'Marketing', fallbackTitle: 'Digital Marketing' },
    shot: { az: 24, el: 42, w: 0.74 },
  },
  {
    kind: 'seo',
    id: 'seo-aeo-geo-services',
    rect: [0.44, 0.42, 1, 1],
    short: 'SEO / AEO / GEO',
    part: 'Index block',
    service: { slug: 'seo-aeo-geo-services', fallbackTitle: 'SEO, AEO & GEO Services' },
    shot: { az: -10, el: 56, w: 0.8 },
  },
  {
    kind: 'media',
    id: 'media-production',
    rect: [-0.32, 0.52, 0.32, 1],
    short: 'Media',
    part: 'Media engine',
    service: { slug: 'media-production', fallbackTitle: 'Media Production' },
    shot: { az: 12, el: 50, w: 0.84 },
  },
  {
    kind: 'mobile',
    id: 'mobile-app',
    rect: [-1, 0.3, -0.46, 1],
    short: 'Mobile',
    part: 'Mobile cluster',
    service: { slug: 'mobile-app', fallbackTitle: 'Mobile App' },
    shot: { az: -26, el: 48, w: 0.92 },
  },
];

export const AI_BLOCK: Block = {
  kind: 'ai',
  id: 'ai',
  rect: [-0.34, -0.36, 0.36, 0.38],
  short: 'AI',
  part: 'Neural engine',
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

export const NOW = {
  fallbackTitle: 'AI Integration & Model Training',
  source: 'https://en.wikipedia.org/wiki/Transistor_count',
  words: ['AI', 'AUTOMATE', 'PREDICT', 'ANSWER', 'LEARN'],
};

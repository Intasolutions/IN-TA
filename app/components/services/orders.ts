// Orders given to the chip: which block should take this one? This is plain keyword matching in the browser, using the
// words below and the service's own data from the admin. No AI model runs here and nothing typed leaves the page at this step.

import { type Block, type BlockKind, type ChipService } from './floorplan';

export type OrderChoice = { block: Block; service: ChipService };

const HINTS: Partial<Record<BlockKind, string[]>> = {
  software: ['software', 'erp', 'crm', 'system', 'backend', 'api', 'database', 'saas', 'billing', 'inventory', 'hospital', 'management', 'dashboard', 'portal', 'integration'],
  ui: ['design', 'redesign', 'ui', 'ux', 'figma', 'wireframe', 'prototype', 'interface', 'mockup'],
  web: ['website', 'web', 'site', 'landing', 'ecommerce', 'e-commerce', 'shop', 'store', 'webpage', 'nextjs', 'react', 'wordpress'],
  marketing: ['marketing', 'market', 'ads', 'advert', 'advertise', 'campaign', 'leads', 'social', 'instagram', 'facebook', 'brand', 'promote', 'customers', 'sell', 'sales'],
  seo: ['seo', 'aeo', 'geo', 'google', 'search', 'rank', 'ranking', 'found', 'keywords', 'traffic', 'visibility'],
  media: ['video', 'photo', 'photos', 'photoshoot', 'film', 'reel', 'reels', 'shoot', 'media', 'youtube', 'animation', 'edit', 'editing', 'storytelling'],
  mobile: ['mobile', 'app', 'apps', 'android', 'ios', 'iphone', 'flutter', 'phone', 'playstore'],
  ai: ['ai', 'artificial', 'chatbot', 'bot', 'automate', 'automation', 'model', 'train', 'training', 'predict', 'prediction', 'machine', 'learning', 'rag', 'agent', 'agents', 'gpt', 'llm', 'intelligent', 'smart'],
};

const IGNORED = new Set(['a', 'an', 'and', 'are', 'can', 'do', 'for', 'get', 'give', 'i', 'in', 'is', 'it', 'make', 'me', 'my', 'need', 'of', 'on', 'our', 'please', 'the', 'to', 'us', 'want', 'we', 'with', 'you', 'your', 'build', 'create', 'services', 'service', 'solutions', 'custom', 'business', 'businesses', 'help', 'new', 'one', 'some']);

const wordsOf = (text: string) =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}+#-]+/u)
    .filter((w) => w && !IGNORED.has(w));

/** The block best suited to the order, or null if none of them is */
export function routeOrder(text: string, choices: OrderChoice[]): OrderChoice | null {
  const words = wordsOf(text);
  if (!words.length) return null;
  let best: OrderChoice | null = null;
  let bestScore = 0;
  choices.forEach((choice) => {
    const hints = HINTS[choice.block.kind] ?? [];
    const title = wordsOf(choice.service.title);
    const features = choice.service.features.flatMap(wordsOf);
    const about = wordsOf(choice.service.description);
    let score = 0;
    words.forEach((w) => {
      if (hints.includes(w)) score += 3;
      if (title.includes(w)) score += 3;
      if (features.includes(w)) score += 1;
      if (about.includes(w)) score += 0.5;
    });
    if (score > bestScore) {
      bestScore = score;
      best = choice;
    }
  });
  return bestScore >= 2.5 ? best : null;
}

// ---- The landscape of error the AI block turns into while it trains. The same sums as lossAt and walk in the field shader. ----
const MINIMUM: [number, number] = [-0.16, 0.2];
const START: [number, number] = [0.72, -0.74];

function lossAt(x: number, y: number) {
  const vx = x - MINIMUM[0];
  const vy = y - MINIMUM[1];
  const bowl = 1 - Math.exp(-(vx * vx + vy * vy) * 1.5);
  const rough = Math.sin(x * 6 + 1.3) * Math.sin(y * 5.2 - 0.7) * 0.5 + Math.sin(x * 11 + y * 4) * 0.22;
  return Math.min(1, Math.max(0, bowl * (0.82 + rough * 0.3)));
}

/** How wrong the model is, at this point of its training: the height of the surface under the marker */
export function errorAt(t: number) {
  const e = 1 - Math.pow(1 - t, 2.2);
  const dx = MINIMUM[0] - START[0];
  const dy = MINIMUM[1] - START[1];
  const wobble = Math.sin(e * 11) * (1 - e) * 0.22;
  return lossAt(START[0] + dx * e - dy * wobble, START[1] + dy * e + dx * wobble);
}

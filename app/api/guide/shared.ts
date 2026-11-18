// What the robot's two Gemini routes share: the chat (./route.ts) and his page plans (./plan/route.ts).
//
// Free tier, so:
// - GEMINI_API_KEY (from Google AI Studio) is set on the website's host, never sent to the browser.
// - GEMINI_MODEL can list several models, comma-separated: each has its own free daily allowance, so when the first
//   is used up the next one answers.
// - Google's terms only allow the free tier for visitors outside the EEA, the UK and Switzerland: Vercel tells us the
//   visitor's country (x-vercel-ip-country) and the AI stays off there (the admin's lines play instead).
// - Nothing is logged or saved. The Privacy Policy (home/legal_text.json, legal_privacy_body) describes exactly this;
//   change it with any change here.
import { linesOf, textOf, type Site } from '../../site/site';
import { LIMITS, type PageContext, type Unavailable } from '../../components/guide/chatTypes';

const MODELS = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite,gemini-3.1-flash-lite')
  .split(',').map((m) => m.trim()).filter((m) => /^[\w.-]+$/.test(m));
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export const aiConfigured = () => !!process.env.GEMINI_API_KEY && MODELS.length > 0;

// The EEA (the EU, Iceland, Liechtenstein, Norway, and the EU's outermost regions with codes of their own), the UK
// (and the islands under its crown) and Switzerland
const CLOSED = new Set((
  'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE ' +
  'IS LI NO AX GF GP MQ RE YT MF GB GG JE IM GI CH'
).split(' '));

export const regionOk = (request: Request) => {
  const country = request.headers.get('x-vercel-ip-country')?.toUpperCase();
  // on Vercel the country always comes with the request; unknown there means closed, to be safe (on this computer,
  // while developing, there's none)
  if (!country) return !process.env.VERCEL;
  return !CLOSED.has(country);
};

/** Only the website itself may ask (another site's page would be spending our allowance) */
export const sameSite = (request: Request) => {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  try { return !origin || !host || new URL(origin).host === host; } catch { return false; }
};

const DAY = 24 * 60 * 60 * 1000;
/** How much one visitor may ask, per minute and per day, counted in this server's memory only */
export function limiter(perMinute: number, perDay: number) {
  const asked = new Map<string, number[]>();
  return (request: Request) => {
    const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const now = Date.now();
    if (asked.size > 5000) for (const [k, v] of asked) if (!v.length || now - v[v.length - 1] > DAY) asked.delete(k);
    const times = (asked.get(ip) ?? []).filter((t) => now - t < DAY);
    if (times.length >= perDay || times.filter((t) => now - t < 60_000).length >= perMinute) { asked.set(ip, times); return false; }
    times.push(now);
    asked.set(ip, times);
    return true;
  };
}

export const fail = (reason: Unavailable, status: number) => Response.json({ ok: false, reason }, { status });

// when every model said its allowance is used up, wait a minute before asking Google again
let restUntil = 0;

/** Ask Gemini for JSON in this shape; null when no model could answer (each tried in turn) */
export async function gemini(request: { system: string; contents: unknown[]; schema: object; temperature: number; maxTokens: number }): Promise<Record<string, unknown> | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || Date.now() < restUntil) return null;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: request.system }] },
    contents: request.contents,
    generationConfig: { temperature: request.temperature, maxOutputTokens: request.maxTokens, responseMimeType: 'application/json', responseSchema: request.schema },
  });
  let allSpent = true;
  for (const model of MODELS) {
    let res: Response;
    try {
      res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body,
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      allSpent = false;
      continue; // too slow or unreachable: the next model
    }
    if (res.status === 429) continue; // this model's free allowance is used up for now
    allSpent = false;
    if (!res.ok) continue;
    const data = (await res.json().catch(() => null)) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] } | null;
    const text = data?.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? '').join('') ?? '';
    try { return JSON.parse(text); } catch { return {}; } // answered, but not usable: the caller falls back
  }
  if (allSpent) restUntil = Date.now() + 60_000;
  return null;
}

export const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
/** A line he says: no markdown, cut to size */
export const line = (v: unknown, max: number) => str(v, max).replace(/[*_`#]/g, '');

/** The page as the browser sent it, cut to size (anything malformed is dropped) */
export function cleanPage(raw: unknown): PageContext {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const path = str(p.path, 200);
  const list = (v: unknown, max: number) => (Array.isArray(v) ? v : []).slice(0, max) as Record<string, unknown>[];
  return {
    path: path.startsWith('/') ? path : '/',
    title: str(p.title, 120),
    sections: list(p.sections, LIMITS.sections).flatMap((s) => {
      const id = str(s?.id, 60);
      return /^[\w-]{1,60}$/.test(id) ? [{ id, title: str(s.title, 80) }] : [];
    }),
    spots: list(p.spots, LIMITS.spots).flatMap((s) => {
      const id = str(s?.id, 8);
      const kind = s?.kind === 'heading' || s?.kind === 'button' || s?.kind === 'image' ? s.kind : null;
      return /^p\d{1,3}$/.test(id) && kind ? [{ id, kind, text: str(s.text, 70), section: str(s.section, 60) }] : [];
    }),
    text: typeof p.text === 'string' ? p.text.replace(/\s+/g, ' ').trim().slice(0, LIMITS.pageText) : '',
  };
}

/** The site's pages a link may open, by address, with the name the button shows */
export function pagesOf(site: Site) {
  const pages = new Map<string, string>([
    ['/', 'Home'], ['/services', 'Services'], ['/portfolio', 'Our work'], ['/about', 'About us'], ['/blog', 'Blog'],
    ['/contact', 'Contact'], ['/privacy', 'Privacy Policy'], ['/terms', 'Terms of Service'], ['/security', 'Security Policy'],
  ]);
  for (const s of site.services) if (s.slug && s.title.trim()) pages.set(`/services/${s.slug}`, s.title.trim());
  return pages;
}

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Everything the admin says about IN-TA, as the facts he may use */
export function facts(site: Site, pages: Map<string, string>) {
  const a = site.address;
  const services = site.services.filter((s) => s.title.trim()).map((s) => {
    const c = s.card;
    return `- ${s.title.trim()} (page /services/${s.slug})${c?.text ? `: ${c.text}` : ''}${c?.tags.length ? ` [${c.tags.join(', ')}]` : ''}`;
  });
  const seen = new Set<string>();
  const faq = Object.values(site.questions).flat().filter((q) => !seen.has(q.q) && seen.add(q.q))
    .map((q) => `Q: ${q.q}\nA: ${q.a.replace(/\s+/g, ' ')}`);
  const tools = site.stack.map((t) => `${t.name}${t.use ? ` (${t.use})` : ''}`);
  return [
    'FACTS',
    `- Company: IN-TA Solutions, a software and AI company.`,
    `- Office: ${[a.street, a.locality, a.district, a.region, a.postal_code].filter(Boolean).join(', ')}, India.`,
    `- Phone and WhatsApp: ${site.phone}. Email: ${site.email}.`,
    `- Office hours (India time): ${site.hours.days.map((d) => days[d]).filter(Boolean).join(', ')}, ${site.hours.opens} to ${site.hours.closes}.`,
    ...linesOf(textOf(site, 'guide_about')).map((l) => `- ${l}`),
    ...linesOf(textOf(site, 'guide_ai_facts')).map((l) => `- ${l}`),
    tools.length ? `- Tools we use: ${tools.join('; ')}.` : '',
    '',
    'SERVICES',
    ...services,
    '',
    'QUESTIONS AND ANSWERS',
    ...faq,
    '',
    'PAGES',
    ...[...pages].map(([path, name]) => `- ${path}: ${name}`),
  ].join('\n');
}

/** The page, as Gemini reads it */
export function pageBlock(p: PageContext) {
  return [
    `PAGE: ${p.path}${p.title ? ` (${p.title})` : ''}`,
    'SECTIONS of this page (id: title):',
    ...(p.sections.length ? p.sections.map((s) => `- ${s.id}: ${s.title || '(untitled)'}`) : ['- none']),
    'SPOTS on this page (id, kind, in section: words):',
    ...(p.spots.length ? p.spots.map((s) => `- ${s.id}, ${s.kind}${s.section ? `, in ${s.section}` : ''}: ${s.text || '(no words)'}`) : ['- none']),
    'PAGE TEXT:',
    p.text || '(none)',
  ].join('\n');
}

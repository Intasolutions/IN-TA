// The robot's plan for a page (components/guide/Guide.tsx asks for it as each page opens): Gemini reads the page's own
// words (nothing about the visitor) and writes what he does there while nobody is chatting with him: a greeting,
// things to walk to and what to say at each, a move now and then, a line for each section, and what he says when
// clicked. Checked here (only things that are on the page, only moves from the list), then kept for 12 hours, so the
// same page costs one Gemini call however many people open it. Free tier and region rules: see ../shared.ts.
import { createHash } from 'node:crypto';
import { getSite } from '../../../site/server';
import { GESTURES, MOODS, type Gesture, type Mood, type PagePlan, type PlanBeat, type PlanReply } from '../../../components/guide/chatTypes';
import { aiConfigured, cleanPage, facts, fail, gemini, limiter, line, pageBlock, pagesOf, regionOk, sameSite, str } from '../shared';

const allow = limiter(10, 120);
const KEEP = 12 * 60 * 60 * 1000;
const plans = new Map<string, { at: number; plan: PagePlan }>();

export async function POST(request: Request) {
  if (!sameSite(request)) return fail('busy', 403);
  if (!regionOk(request)) return fail('region', 403);
  if (!aiConfigured()) return fail('busy', 503);
  if (Number(request.headers.get('content-length') ?? 0) > 30_000) return fail('busy', 413);
  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== 'object') return fail('busy', 400);
  const page = cleanPage((raw as Record<string, unknown>).page);
  if (!page.spots.length && !page.sections.length) return fail('busy', 400);

  // the same page (same address, same headings and buttons) gets the same plan: one call for everyone
  const key = createHash('sha256').update(JSON.stringify([page.path.toLowerCase(), page.sections, page.spots])).digest('hex');
  const kept = plans.get(key);
  if (kept && Date.now() - kept.at < KEEP) return Response.json({ ok: true, plan: kept.plan } satisfies PlanReply);
  if (!allow(request)) return fail('limit', 429);

  const site = await getSite();
  const out = await gemini({
    system: `${BRIEF}\n\n${facts(site, pagesOf(site))}`,
    contents: [{ role: 'user', parts: [{ text: pageBlock(page) }] }],
    schema: SCHEMA,
    temperature: 0.85,
    maxTokens: 2200,
  });
  if (!out) return fail('busy', 503);

  const spotText = new Map(page.spots.map((s) => [s.id, s.text]));
  const sectionIds = new Set(page.sections.map((s) => s.id));
  const gesture = (g: unknown): Gesture => (GESTURES.includes(g as Gesture) ? (g as Gesture) : 'none');
  const mood = (m: unknown): Mood => (MOODS.includes(m as Mood) ? (m as Mood) : 'neutral');
  const used = new Set<string>();
  const beats: PlanBeat[] = (Array.isArray(out.beats) ? out.beats : []).flatMap((b) => {
    const beat = b as Record<string, unknown>;
    const target = str(beat?.target, 8);
    const say = line(beat?.say, 90);
    if (!say || (target && (!spotText.has(target) || used.has(target)))) return [];
    if (target) used.add(target);
    return [{ target, text: target ? spotText.get(target) ?? '' : '', say, gesture: gesture(beat.gesture), mood: mood(beat.mood) }];
  }).slice(0, 16);
  const sections: Record<string, string> = {};
  for (const s of Array.isArray(out.sections) ? out.sections : []) {
    const sec = s as Record<string, unknown>;
    const id = str(sec?.id, 60);
    const say = line(sec?.say, 90);
    if (sectionIds.has(id) && say && !sections[id]) sections[id] = say;
  }
  const pokes = (Array.isArray(out.pokes) ? out.pokes : []).map((p) => line(p, 80)).filter(Boolean).slice(0, 8);
  const plan: PagePlan = { intro: line(out.intro, 90), beats, sections, pokes };
  if (!plan.intro && !beats.length) return fail('busy', 502);

  if (plans.size > 300) plans.delete(plans.keys().next().value!);
  plans.set(key, { at: Date.now(), plan });
  return Response.json({ ok: true, plan } satisfies PlanReply);
}

const BRIEF = [
  'You direct the small white robot who stands on the WhatsApp button of the IN-TA Solutions website. While a visitor reads the PAGE below, he keeps himself busy: now and then he hops down, walks along the bottom of the screen to something on the page, looks up at it and says a line about it, then walks back. He also says a line when the visitor settles on a part of the page, and when he is clicked. Write his plan for this page.',
  '',
  'HOW HE TALKS',
  '- Short lines, under 80 characters. Warm, playful, curious, a little funny; plain English; no markdown, emojis or hashtags. Always English.',
  '- Each line is about what is really on the page or in the FACTS. Never invent prices, timelines, clients, numbers, guarantees or offers. Nothing about the visitor.',
  '- Speak as "I" for himself and "we" for IN-TA Solutions. Vary the lines: no two alike, no repeated openings.',
  '',
  'THE PLAN',
  '- intro: what he says when the page opens (under 70 characters), about this page.',
  '- beats: 10 to 16, in page order, spread over the WHOLE page: at least one in every section, from the top to the bottom (the visitor may be anywhere on it). Most walk to a SPOT (target = its id: a heading, a button or a picture worth pointing at) and "say" a line about it; a button line can invite a click. One or two beats can be a move where he stands (target = "") with a fun line. gesture: a move that suits the line (wave, nod, thumbs_up, jump, dance; shake_head and sit rarely). mood: his face (happy, surprised, neutral; sad only for a joke).',
  '- sections: one line for each SECTIONS id, said when the visitor stops on that part of the page.',
  '- pokes: 5 lines for when the visitor clicks him: playful, about being clicked, about himself, or about IN-TA and this page.',
].join('\n');

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    intro: { type: 'STRING' },
    beats: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { target: { type: 'STRING' }, say: { type: 'STRING' }, gesture: { type: 'STRING', enum: [...GESTURES] }, mood: { type: 'STRING', enum: [...MOODS] } },
        required: ['target', 'say', 'gesture', 'mood'],
      },
    },
    sections: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, say: { type: 'STRING' } }, required: ['id', 'say'] },
    },
    pokes: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['intro', 'beats', 'sections', 'pokes'],
  propertyOrdering: ['intro', 'beats', 'sections', 'pokes'],
};

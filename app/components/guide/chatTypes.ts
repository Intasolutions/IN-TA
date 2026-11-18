// What the robot's chat and its server route (app/api/guide/route.ts) send each other.

/** His moves that an answer can ask for (the engine maps each to one of the robot's clips) */
export const GESTURES = ['none', 'wave', 'nod', 'shake_head', 'thumbs_up', 'jump', 'dance', 'sit'] as const;
export type Gesture = (typeof GESTURES)[number];

/** His face while he answers */
export const MOODS = ['neutral', 'happy', 'surprised', 'sad'] as const;
export type Mood = (typeof MOODS)[number];

/**
 * What he does after answering:
 * - "show": walk to something on the page you're on and look up at it (target: a section's or a spot's id)
 * - "tour": walk from one thing to the next on this page, a short line at each (steps)
 * - "go": take you to another page of the site, because you asked to go there (target: its address)
 * - "link": offer a button to another page (target: its address)
 * - "whatsapp": offer to carry the question over to WhatsApp
 */
export const ACTIONS = ['none', 'show', 'tour', 'go', 'link', 'whatsapp'] as const;
export type Action = (typeof ACTIONS)[number];

export type ChatTurn = { role: 'visitor' | 'guide'; text: string };

/**
 * The page a visitor is reading, so he can explain it and walk to things on it: its sections, and its "spots"
 * (headings, buttons and pictures, numbered p1, p2… for this one question)
 */
export type PageContext = {
  path: string;
  title: string;
  sections: { id: string; title: string }[];
  spots: { id: string; kind: 'heading' | 'button' | 'image'; text: string; section: string }[];
  text: string;
};

export type AskRequest = { question: string; history: ChatTurn[]; page: PageContext };

/** Why there's no answer: the region can't use the free AI, one visitor asked too much, or the AI is busy or down */
export type Unavailable = 'region' | 'limit' | 'busy';

export type TourStep = { target: string; say: string };

export type Answer = {
  ok: true;
  reply: string;
  gesture: Gesture;
  mood: Mood;
  action: Action;
  /** show: the section or spot; go and link: the page's address */
  target: string;
  /** the name of the target, for buttons and the status line */
  label: string;
  /** show: what he says when he gets there */
  caption: string;
  steps: TourStep[];
  /** questions the visitor might ask next */
  followUps: string[];
};

export type AskReply = Answer | { ok: false; reason: Unavailable };

export const LIMITS = { question: 300, turns: 6, turn: 700, sections: 30, spots: 40, pageText: 4000, steps: 5 } as const;

/**
 * The robot's plan for one page, written by Gemini from the page's own words (nothing about the visitor), so he acts
 * on what's really there: a greeting, things to walk to and what to say at each (target '' = a move where he stands),
 * a line for each section, and lines for when he's clicked. The engine plays it with its own timing; the admin's
 * lines stay as the fallback.
 */
export type PlanBeat = { target: string; text: string; say: string; gesture: Gesture; mood: Mood };
export type PagePlan = { intro: string; beats: PlanBeat[]; sections: Record<string, string>; pokes: string[] };
export type PlanReply = { ok: true; plan: PagePlan } | { ok: false; reason: Unavailable };

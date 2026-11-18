// The visitor's journey through the site this visit: which pages, how long on each, which parts they read. The robot
// uses it to talk about what they've been looking at, open the conversation himself, and recommend the right
// service (it goes to Gemini with each question, and to the team with a lead). Kept in this tab only
// (sessionStorage); nothing about who the visitor is. Guide.tsx records it.

export type Visit = { path: string; title: string; secs: number; parts: string[] };

const KEY = 'inta-guide-journey';
const MAX = 15;

const load = (): Visit[] => { try { return JSON.parse(sessionStorage.getItem(KEY) ?? '[]'); } catch { return []; } };
const save = (list: Visit[]) => { try { sessionStorage.setItem(KEY, JSON.stringify(list.slice(-MAX))); } catch { /* private mode */ } };

/** A page has opened (its title, cut to its first part: "Web Development | IN-TA Solutions" → "Web Development") */
export function arrived(path: string, title: string) {
  const list = load();
  if (list[list.length - 1]?.path === path) return;
  list.push({ path, title: title.split(/\s+[|·–-]\s+/)[0].slice(0, 60), secs: 0, parts: [] });
  save(list);
}

/** Time on the current page, and the part of it being read now */
export function spent(secs: number, part?: string) {
  const list = load();
  const now = list[list.length - 1];
  if (!now) return;
  now.secs += secs;
  if (part && !now.parts.includes(part)) now.parts = [...now.parts, part.slice(0, 40)].slice(-8);
  save(list);
}

export const journey = load;

const time = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60 >= 30 ? '30s' : ''}`);

/** The visit in a line: "Home (40s) → Services (2m; read: ai, web) → Web Development (20s, now)" */
export function journeyText() {
  const list = load();
  return list.map((v, i) => `${v.title || v.path} [${v.path}] (${time(v.secs)}${v.parts.length ? `; read: ${v.parts.join(', ')}` : ''}${i === list.length - 1 ? ', now' : ''})`).join(' → ');
}

/** How engaged they are: pages seen, and seconds on this one */
export function engagement() {
  const list = load();
  return { pages: list.length, here: list[list.length - 1]?.secs ?? 0, total: list.reduce((n, v) => n + v.secs, 0) };
}

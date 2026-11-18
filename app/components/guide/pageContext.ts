// Reading the page the visitor is on, for Gemini: its sections, the things on it the robot can walk to ("spots",
// numbered p1, p2… in page order), and its words. Used by the chat (GuideChat.tsx) and by the robot's page plan
// (Guide.tsx). Only the page's own content: nothing the visitor typed or did.
import { LIMITS, type PageContext } from './chatTypes';

const SKIP = 'header, footer, nav, [aria-hidden="true"], .guide-chat, .guide-ask, a[aria-label="Chat on WhatsApp"]';
export const clip = (t: string) => t.replace(/\s+/g, ' ').trim();

/** a name short enough for a status line, cut between words */
export const short = (t: string, max = 34) => {
  const s = clip(t);
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 12)).replace(/[\s,.;:–-]+$/, '')}…`;
};

const visible = (el: Element) => {
  const check = (el as Element & { checkVisibility?: (o: object) => boolean }).checkVisibility;
  return check ? check.call(el, { opacityProperty: true, visibilityProperty: true }) : (el as HTMLElement).offsetParent !== null;
};

type Found = { el: Element; kind: PageContext['spots'][number]['kind']; text: string };

/** headings first, then buttons and links, then pictures; back in page order */
function findSpots(root: ParentNode): Found[] {
  const pick = (sel: string, max: number, words: (el: Element) => string, kind: Found['kind']) =>
    [...root.querySelectorAll(sel)].filter((el) => !el.closest(SKIP) && visible(el))
      .map((el) => ({ el, kind, text: clip(words(el)).slice(0, 70) }))
      .filter((s) => (kind === 'image' ? !!s.text : s.text.length > 1 && s.text.length <= 70))
      .slice(0, max);
  return [
    ...pick('h1, h2, h3', 22, (el) => el.textContent ?? '', 'heading'),
    ...pick('a[href], button', 12, (el) => el.getAttribute('aria-label') || el.textContent || '', 'button'),
    ...pick('img[alt]', 6, (el) => el.getAttribute('alt') ?? '', 'image'),
  ].sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)).slice(0, LIMITS.spots);
}

/**
 * The page as Gemini sees it. onScreenFirst: the part the visitor is looking at comes first (for a question about
 * "this"); without it, the page is read top to bottom, the same for every visitor (for the robot's page plan).
 */
export function pageContext(onScreenFirst = true): { page: PageContext; spots: Map<string, Element> } {
  const root = document.querySelector('main') ?? document.body;
  const seen = new Set<string>();
  const sections = [...root.querySelectorAll('section[id]')]
    .filter((s) => !s.closest(SKIP) && /^[\w-]+$/.test(s.id) && !seen.has(s.id) && seen.add(s.id))
    .map((s) => {
      const by = s.getAttribute('aria-labelledby');
      const title = s.getAttribute('aria-label') || (by ? clip(document.getElementById(by.split(' ')[0])?.textContent ?? '') : '') || clip(s.querySelector('h1, h2, h3')?.textContent ?? '');
      return { id: s.id, title: title.slice(0, 80) };
    })
    .slice(0, LIMITS.sections);

  const spots = new Map<string, Element>();
  const spotList = findSpots(root).map((s, i) => {
    const id = `p${i + 1}`;
    spots.set(id, s.el);
    return { id, kind: s.kind, text: s.text, section: s.el.closest('section[id]')?.id ?? '' };
  });

  const all = clip((root as HTMLElement).innerText);
  let text = all;
  if (onScreenFirst) {
    const mid = window.innerHeight * 0.45;
    const onScreen = [...root.querySelectorAll('section')].filter((s) => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom >= mid; }).pop();
    const now = onScreen ? clip((onScreen as HTMLElement).innerText) : '';
    if (now) text = `ON SCREEN NOW: ${now.slice(0, 1500)}\n\nWHOLE PAGE: ${all}`;
  }
  return { page: { path: window.location.pathname, title: document.title, sections, spots: spotList, text: text.slice(0, LIMITS.pageText) }, spots };
}

/** The thing on the page with these words (a plan kept from earlier in the visit points at things by their words) */
export function spotByText(text: string): Element | null {
  const want = clip(text).toLowerCase();
  if (!want) return null;
  return findSpots(document.querySelector('main') ?? document.body).find((s) => s.text.toLowerCase() === want)?.el ?? null;
}

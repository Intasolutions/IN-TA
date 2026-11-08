import Link from 'next/link';
import type { ReactNode } from 'react';
import legal from '../../../home/legal_text.json';
import { accent, type Site } from '../../site/site';
import type { LegalDocument, LegalSection } from './LegalPage';

// The Terms, Privacy and Security pages, as written in the admin (Site settings > Page wording) or the standard text
// in home/legal_text.json. Only the server reads this: the documents go to their own pages, not into every page.

export type DocName = 'terms' | 'privacy' | 'security';

const DOCS: { name: DocName; href: string; subject: string }[] = [
  { name: 'terms', href: '/terms', subject: 'Terms of Service' },
  { name: 'privacy', href: '/privacy', subject: 'Privacy request' },
  { name: 'security', href: '/security', subject: 'Security report' },
];

const STANDARD: Record<string, string> = Object.fromEntries(legal.groups.flatMap((g) => g.items.map(([key, , text]) => [key, text])));

/** Wording as changed in the admin, or the standard one */
const say = (site: Site, doc: DocName, part: string) => {
  const key = `legal_${doc}_${part}`;
  return site.text[key]?.trim() || STANDARD[key] || '';
};

/** Only the server-side pages need the documents: keeps a changed one out of what every page is sent */
export const withoutDocuments = (text: Record<string, string>) => Object.fromEntries(Object.entries(text).filter(([key]) => !key.startsWith('legal_')));

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** When the wording last changed, from a year-month-day date; a mistyped one falls back to the standard date */
export function updatedOf(site: Site, doc: DocName) {
  const parse = (text: string) => {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text.trim());
    if (!m) return null;
    const date = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return date.getUTCMonth() === +m[2] - 1 ? date : null; // 2026-02-31 isn't a date
  };
  const date = parse(say(site, doc, 'updated')) ?? parse(STANDARD[`legal_${doc}_updated`])!;
  return { date, iso: date.toISOString().slice(0, 10), label: DATE.format(date) };
}

export const seoOf = (site: Site, doc: DocName) => ({ title: say(site, doc, 'seo_title'), description: say(site, doc, 'seo_description') });

// ---- The document's text: ## starts a section, ### a smaller heading, - a bullet, 1. a numbered point, every other
// line a paragraph. Inline: **bold**, [words](address), and bare email and web addresses become links ----

const INLINE =
  /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<>()]*[^\s<>().,;:!?'"])|([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g;

function linkTo(href: string, children: ReactNode, key: string, subject: string): ReactNode {
  if (href.startsWith('/') && !href.startsWith('//'))
    return (
      <Link key={key} href={href}>
        {children}
      </Link>
    );
  if (/^https?:\/\//i.test(href))
    return (
      <a key={key} href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  if (/^mailto:/i.test(href))
    return (
      <a key={key} href={href.includes('?') ? href : `${href}?subject=${encodeURIComponent(subject)}`}>
        {children}
      </a>
    );
  if (/^tel:/i.test(href))
    return (
      <a key={key} href={href}>
        {children}
      </a>
    );
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(href)) return linkTo(`mailto:${href}`, children, key, subject);
  return <span key={key}>{children}</span>; // anything else (javascript: and the like) stays plain words
}

function inline(text: string, subject: string, at = 'i'): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const index = m.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    const key = `${at}.${n++}`;
    if (m[1] !== undefined) out.push(<strong key={key}>{inline(m[1], subject, key)}</strong>);
    else if (m[2] !== undefined) out.push(linkTo(m[3], inline(m[2], subject, key), key, subject));
    else if (m[4]) out.push(linkTo(m[4], m[4], key, subject));
    else out.push(linkTo(`mailto:${m[5]}`, m[5], key, subject));
    last = index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block = { tag: 'p' | 'h3'; text: string } | { tag: 'ul' | 'ol'; items: string[] };

const slugOf = (title: string) =>
  title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-') || 'section';

export function sectionsOf(text: string, subject: string): LegalSection[] {
  const parts: { title: string; blocks: Block[] }[] = [];
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;
  const current = () => {
    if (!parts.length) parts.push({ title: 'Overview', blocks: [] }); // words before the first ## heading
    return parts[parts.length - 1];
  };
  const endList = () => {
    if (list) current().blocks.push(list);
    list = null;
  };
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading && heading[1].length < 3) {
      endList();
      parts.push({ title: heading[2].replace(/\*\*/g, '').trim(), blocks: [] });
      continue;
    }
    if (!line) {
      endList();
      continue;
    }
    const item = /^(?:[-*•]|\d{1,2}[.)])\s+(.+)$/.exec(line);
    if (item) {
      const tag = /^\d/.test(line) ? 'ol' : 'ul';
      if (list && list.tag !== tag) endList();
      list ??= { tag, items: [] };
      list.items.push(item[1]);
      continue;
    }
    endList();
    current().blocks.push(heading ? { tag: 'h3', text: heading[2] } : { tag: 'p', text: line });
  }
  endList();

  // the page's own ids, and "legal", whose heading would be "legal-title"
  const used = new Set<string>(['legal', 'legal-title', 'legal-others']);
  return parts
    .filter((p) => p.blocks.length)
    .map((p, s) => {
      let id = slugOf(p.title);
      for (let n = 2; used.has(id); n++) id = `${slugOf(p.title)}-${n}`;
      used.add(id);
      const body = p.blocks.map((b, i) => {
        const key = `${s}.${i}`;
        if ('items' in b) {
          const List = b.tag;
          return (
            <List key={key}>
              {b.items.map((item, j) => (
                <li key={j}>{inline(item, subject, `${key}.${j}`)}</li>
              ))}
            </List>
          );
        }
        const Tag = b.tag;
        return <Tag key={key}>{inline(b.text, subject, key)}</Tag>;
      });
      return { id, title: p.title, body: <>{body}</> };
    });
}

/** Everything a legal page shows, from Site settings */
export function legalDocument(site: Site, doc: DocName): LegalDocument {
  const me = DOCS.find((d) => d.name === doc)!;
  const [title, blue] = accent(say(site, doc, 'title'));
  const updated = updatedOf(site, doc);
  return {
    href: me.href,
    title,
    accent: blue,
    lead: say(site, doc, 'lead'),
    updated: { iso: updated.iso, label: updated.label },
    sections: sectionsOf(say(site, doc, 'body').replace(/\{email\}/g, () => site.email), me.subject),
    others: DOCS.filter((d) => d.name !== doc).map((d) => ({ href: d.href, name: accent(say(site, d.name, 'title')).filter(Boolean).join(' '), about: say(site, d.name, 'card') })),
  };
}

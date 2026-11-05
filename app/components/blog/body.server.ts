import sanitizeHtml from 'sanitize-html';
import { apiBase } from './posts';

// A post's body is written in the admin: mostly plain text, sometimes the rich editor's HTML. This turns either into
// clean, safe HTML for the article page, without changing a word. Only ever runs on the server.

const LONG_PARAGRAPH = 90; // words
const PARAGRAPH_AT_LEAST = 55;
const TOO_SHORT_TO_STAND_ALONE = 20;

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;
const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// A list item that opens with its own short title ("Lead Routing: Instead of...") shows that title in bold
const listItem = (text: string) => escapeHtml(text).replace(/^([^:]{3,60}:)(\s)/, '<strong>$1</strong>$2');

/** Some posts are one long block: breaks it between sentences into paragraphs a person can read */
function paragraphsOf(text: string) {
  if (countWords(text) <= LONG_PARAGRAPH) return [text];
  const out: string[] = [];
  let current: string[] = [];
  let words = 0;
  for (const sentence of text.split(/(?<=[.!?]["”)]?)\s+(?=["“(]?[A-Z0-9])/)) {
    current.push(sentence);
    words += countWords(sentence);
    if (words >= PARAGRAPH_AT_LEAST) {
      out.push(current.join(' '));
      current = [];
      words = 0;
    }
  }
  if (current.length) {
    if (out.length && words < TOO_SHORT_TO_STAND_ALONE) out[out.length - 1] += ` ${current.join(' ')}`;
    else out.push(current.join(' '));
  }
  return out;
}

/** A short line with no full stop, with more of the post after it, is a heading typed as plain text */
function isHeading(line: string, moreFollows: boolean) {
  if (!moreFollows || line.length > 80) return false;
  const words = countWords(line);
  if (words > 12) return false;
  if (line.endsWith(':')) return words <= 6;
  return !/[.,;!]$/.test(line);
}

function textToHtml(text: string) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim());
  const out: string[] = [];
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;
  const endList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li>${listItem(i)}</li>`).join('')}</${list.tag}>`);
    list = null;
  };
  const lastWithText = lines.reduce((last, line, i) => (line ? i : last), -1);
  lines.forEach((line, i) => {
    if (!line) return;
    const item = /^(?:([-*•‣·])|\d{1,2}[.)])\s+(.+)$/.exec(line);
    if (item) {
      const tag = item[1] ? 'ul' : 'ol';
      if (list?.tag !== tag) endList();
      list ??= { tag, items: [] };
      list.items.push(item[2]);
      return;
    }
    endList();
    if (isHeading(line, i < lastWithText)) out.push(`<h2>${escapeHtml(line)}</h2>`);
    else paragraphsOf(line).forEach((p) => out.push(`<p>${escapeHtml(p)}</p>`));
  });
  endList();
  return out.join('');
}

const ALLOWED: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'code', 'pre', 'hr'],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'loading'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowProtocolRelative: false,
  transformTags: {
    // the page's title is the only h1
    h1: 'h2',
    h5: 'h4',
    h6: 'h4',
    a: (tagName, attribs) => ({
      tagName,
      attribs: /^https?:/i.test(attribs.href ?? '') ? { ...attribs, target: '_blank', rel: 'noopener noreferrer' } : attribs,
    }),
    img: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, alt: attribs.alt ?? '', loading: 'lazy', src: attribs.src?.startsWith('/') ? `${apiBase()}${attribs.src}` : attribs.src ?? '' },
    }),
  },
  // the rich editor leaves empty paragraphs for spacing
  exclusiveFilter: (frame) => frame.tag === 'p' && !frame.mediaChildren.length && /^(?:\s|&nbsp;| )*$/.test(frame.text),
};

export function articleHtml(content: string) {
  const body = content.trim();
  const isMarkup = /<\/?(?:p|br|div|h[1-6]|ul|ol|li|strong|em|a|img|blockquote|table)\b/i.test(body);
  return sanitizeHtml(isMarkup ? body : textToHtml(body), ALLOWED);
}

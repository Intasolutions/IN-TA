// The opening's lines (components/PageLoader), from the admin's wording "opening_lines" (home/site_text.json), as HTML.
import { linesOf, textOf, type Site } from './site';

/** More would no longer fit the opening's time */
const MAX_LINES = 8;
/** Longer lines are cut, so the type stays readable on a phone */
const MAX_CHARS = 40;

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export type OpeningLine = { html: string; chars: number };

/**
 * The lines as they're typed: the first one a command ("$ boot in-ta.solutions"), the others "› name ..... value",
 * the last with a blinking cursor. Figures come from the site ({services}, {projects}, the office address); a line whose
 * figure isn't known is left out rather than shown with a gap. chars is the line's length as typed, cursor included.
 */
export function openingLines(site: Site): OpeningLine[] {
  const values: Record<string, number> = { services: site.services.length };
  if (site.counts.projects !== null) values.projects = site.counts.projects;
  const lines = linesOf(textOf(site, 'opening_lines', values))
    .filter((line) => !/\{\w+\}/.test(line))
    .map((line) => line.slice(0, MAX_CHARS))
    .slice(0, MAX_LINES);
  const pairs = lines.map((line, i) => {
    const at = line.indexOf('|');
    return i > 0 && at > 0 ? [line.slice(0, at).trim(), line.slice(at + 1).trim()] : null;
  });
  const nameWidth = Math.max(0, ...pairs.map((p) => (p ? p[0].length : 0)));

  return lines.map((line, i) => {
    const last = i === lines.length - 1 && i > 0;
    const pair = pairs[i];
    let text: string;
    let html: string;
    if (i === 0) {
      text = `$ ${line.replace(/\|/g, ' ')}`;
      html = `<em>$</em> ${escape(line.replace(/\|/g, ' '))}`;
    } else if (pair) {
      const dots = '.'.repeat(nameWidth - pair[0].length + 3);
      text = `› ${pair[0]} ${dots} ${pair[1]}`;
      html = `${last ? '<em>›</em>' : '›'} ${escape(pair[0])} <i>${dots}</i> <b>${escape(pair[1])}</b>`;
    } else {
      text = `› ${line}`;
      html = `${last ? '<em>›</em>' : '›'} ${escape(line)}`;
    }
    if (last) {
      text += ' _';
      html += ' <span class="boot-caret"></span>';
    }
    return { html, chars: text.length };
  });
}

import type { HTMLAttributes } from 'react';

/**
 * A level-2 heading. With `plain` it's a <p> that screen readers still announce as a level-2 heading, while search engines
 * don't count it as one. Use `plain` for a second copy of a heading built for another screen size (the About page's
 * large-screen scene) and for labels that aren't page topics (the footer's columns), so each page's heading outline
 * reads once and only names what the page is about.
 */
export default function H2({ plain = false, ...props }: HTMLAttributes<HTMLHeadingElement> & { plain?: boolean }) {
  return plain ? <p role="heading" aria-level={2} {...props} /> : <h2 {...props} />;
}

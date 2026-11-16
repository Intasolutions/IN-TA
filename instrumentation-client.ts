// Runs in the browser before the site starts. Next.js calls onRouterTransitionStart when a page change really begins
// (a link, the router, back or forward); the site's loading line and "loading /page" screen (components/NavProgress)
// wait for this rather than for clicks, some of which are cancelled on purpose.
import { NAVIGATE_EVENT } from './app/site/navigate';

export function onRouterTransitionStart(url: string) {
  try {
    window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT, { detail: url }));
  } catch {
    // never in the way of the page change itself
  }
}

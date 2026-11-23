// Meta (Facebook) Pixel. It is on only while Site settings > Page wording > Advertising holds a Pixel ID and the visitor
// has allowed it in the cookie prompt (site/consent.ts). While there's an ID, the Privacy page describes it
// (legal_privacy_tracking_on) instead of saying the site uses no tracking tools.

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

/** The admin's Pixel ID when it looks like one (digits only, so nothing else can reach the script), or null = off */
export function pixelIdOf(text: string | undefined) {
  const id = text?.trim() ?? '';
  return /^\d{6,20}$/.test(id) ? id : null;
}

// Whether the visitor has allowed it on this page (site/consent.ts): nothing reaches Meta otherwise
let allowed = false;

/** Tells Meta about an enquiry or a contact click. Does nothing while the Pixel is off or not allowed */
export function pixelEvent(name: 'Lead' | 'Contact', params?: Record<string, string>) {
  if (allowed) window.fbq?.('track', name, params);
}

/** The cookie's own host and each parent domain (Meta sets _fbp on the top one, e.g. .in-tasolutions.com) */
const cookieDomains = (host: string) => {
  const parts = host.split('.');
  const out = [''];
  for (let i = 0; i < parts.length - 1; i++) out.push(parts.slice(i).join('.'), `.${parts.slice(i).join('.')}`);
  return out;
};

/** After "No thanks" in Cookie settings: Meta's script stops sending, and its cookies on this site are removed */
export function stopPixel() {
  allowed = false;
  window.fbq?.('consent', 'revoke');
  for (const name of ['_fbp', '_fbc'])
    for (const domain of cookieDomains(window.location.hostname))
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`;
}

/**
 * Only after the visitor allows it (components/ConsentBanner.tsx). Meta's base code: a queue that collects calls at
 * once, and the real script fetched once the page has finished loading and the browser is idle, so it never delays the
 * page. Meta's script counts later page changes by itself.
 */
export function startPixel(id: string) {
  allowed = true;
  if (window.fbq) {
    // allowed again after a "No thanks" on this same page
    window.fbq('consent', 'grant');
    return;
  }
  // queued as an `arguments` object, exactly as Meta's own snippet does
  const fbq = function () {
    // eslint-disable-next-line prefer-rest-params
    const args = arguments as unknown as unknown[];
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as unknown as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq ??= fbq;
  fbq('init', id);
  fbq('track', 'PageView');

  const add = () => {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  };
  const whenIdle = () => (typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(add, { timeout: 4000 }) : setTimeout(add, 1500));
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });
}

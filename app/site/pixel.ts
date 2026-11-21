// Meta (Facebook) Pixel. It is on only while Site settings > Page wording > Advertising holds a Pixel ID; the Privacy
// page then describes it (legal_privacy_tracking_on) instead of saying the site uses no tracking tools.

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

/** Tells Meta about an enquiry or a contact click. Does nothing while the Pixel is off */
export function pixelEvent(name: 'Lead' | 'Contact', params?: Record<string, string>) {
  window.fbq?.('track', name, params);
}

/**
 * Meta's base code: a queue that collects calls at once, and the real script fetched once the page has finished
 * loading and the browser is idle, so it never delays the page. Meta's script counts later page changes by itself.
 */
export function startPixel(id: string) {
  if (window.fbq) return;
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

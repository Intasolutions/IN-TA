'use client';

import { useEffect } from 'react';
import { useText } from '../site/SiteContext';
import { pixelEvent, pixelIdOf, startPixel, stopPixel } from '../site/pixel';
import { CONSENT_EVENT, readConsent, regionAllowsPixel, useConsentVersion, type Consent } from '../site/consent';

// The Meta Pixel, when the admin has a Pixel ID. It starts only once the visitor has allowed it in the cookie prompt
// (ConsentBanner.tsx), and never for visits from the EEA, the UK or Switzerland (app/api/region). It also reports a tap
// on any WhatsApp, phone or email link as a "Contact" (dropped unless allowed, see pixelEvent). Enquiries are reported
// where each form is sent ("Lead"). Draws nothing.
export default function FacebookPixel() {
  const t = useText();
  const id = pixelIdOf(t('facebook_pixel_id'));
  const version = useConsentVersion();

  useEffect(() => {
    if (!id) return;
    let gone = false;
    // an answer given on an earlier visit
    regionAllowsPixel().then((ok) => { if (ok && !gone && readConsent(version)?.ads) startPixel(id); });
    // an answer given now, in the prompt or in Cookie settings
    const onAnswer = (e: Event) => {
      const { ads } = (e as CustomEvent<Consent>).detail;
      regionAllowsPixel().then((ok) => {
        if (gone || !ok) return;
        if (ads) startPixel(id);
        else stopPixel();
      });
    };
    const onClick = (e: MouseEvent) => {
      const link = e.target instanceof Element ? e.target.closest('a[href]') : null;
      const href = link?.getAttribute('href') ?? '';
      const how = /^https:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(href) ? 'whatsapp' : /^tel:/i.test(href) ? 'phone' : /^mailto:/i.test(href) ? 'email' : null;
      if (how) pixelEvent('Contact', { content_name: how });
    };
    window.addEventListener(CONSENT_EVENT, onAnswer);
    document.addEventListener('click', onClick, true);
    return () => {
      gone = true;
      window.removeEventListener(CONSENT_EVENT, onAnswer);
      document.removeEventListener('click', onClick, true);
    };
  }, [id, version]);

  return null;
}

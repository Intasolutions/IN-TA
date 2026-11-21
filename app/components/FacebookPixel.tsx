'use client';

import { useEffect } from 'react';
import { useText } from '../site/SiteContext';
import { pixelEvent, pixelIdOf, startPixel } from '../site/pixel';

// Starts the Meta Pixel when the admin has a Pixel ID (outside the EEA, UK and Switzerland), and reports a tap on any WhatsApp, phone or email link on the
// site as a "Contact". Draws nothing. Enquiries are reported where each form is sent ("Lead").
export default function FacebookPixel() {
  const t = useText();
  const id = pixelIdOf(t('facebook_pixel_id'));

  useEffect(() => {
    if (!id) return;
    // not for visits from the EEA, the UK or Switzerland (no consent banner; see app/api/region)
    let gone = false;
    fetch('/api/region')
      .then((res) => (res.ok ? res.json() : { ok: false }))
      .then((region: { ok?: boolean }) => { if (!gone && region.ok) startPixel(id); })
      .catch(() => {});
    const onClick = (e: MouseEvent) => {
      const link = e.target instanceof Element ? e.target.closest('a[href]') : null;
      const href = link?.getAttribute('href') ?? '';
      const how = /^https:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(href) ? 'whatsapp' : /^tel:/i.test(href) ? 'phone' : /^mailto:/i.test(href) ? 'email' : null;
      if (how) pixelEvent('Contact', { content_name: how });
    };
    document.addEventListener('click', onClick, true);
    return () => {
      gone = true;
      document.removeEventListener('click', onClick, true);
    };
  }, [id]);

  return null;
}

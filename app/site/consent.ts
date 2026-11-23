import { useEffect, useMemo, useState } from 'react';
import { useText } from './SiteContext';
import { pixelIdOf } from './pixel';

// The cookie prompt (components/ConsentBanner.tsx). The Meta Pixel is the only thing on the site that needs consent:
// it starts only after "Allow", for visits outside the EEA, the UK and Switzerland (elsewhere it never runs at all).
// The answer is kept in this browser and, as proof of what was asked and answered, sent to the API with a random
// code (contact.ConsentRecord: nothing about who the visitor is). It's asked again after a year, or as soon as the
// prompt's wording changes in the admin. Cookie settings (the footer, or a [..](#cookie-settings) link in the Privacy
// Policy) opens the prompt again to change it.

const KEY = 'inta-consent';
const SET_UP = '2026-11-23'; // when the prompt was introduced: the first part of every version
const LASTS = 365 * 24 * 60 * 60 * 1000; // an answer counts for a year
const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export const CONSENT_EVENT = 'inta:consent'; // detail: Consent, after an answer
export const CONSENT_OPEN = 'inta:consent-open'; // asks the prompt to show again
export const COOKIE_SETTINGS_HREF = '#cookie-settings';

export type Consent = { v: string; ads: boolean; at: number; id: string };

/** The version of the prompt answered: its start date and a short fingerprint of its wording (title and text) */
export function consentVersion(words: string) {
  let h = 5381;
  for (let i = 0; i < words.length; i++) h = ((h * 33) ^ words.charCodeAt(i)) >>> 0;
  return `${SET_UP}.${h.toString(36)}`;
}

/** The prompt's current version, from its wording in the admin */
export function useConsentVersion() {
  const t = useText();
  return useMemo(() => consentVersion(`${t('consent_title')}\n${t('consent_text')}`), [t]);
}

function stored(): Consent | null {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return c && typeof c.ads === 'boolean' && typeof c.id === 'string' && typeof c.at === 'number' && typeof c.v === 'string' ? c : null;
  } catch {
    return null;
  }
}

/** This browser's answer to the current prompt, or null when it hasn't answered it (or answered over a year ago) */
export function readConsent(version: string): Consent | null {
  const c = stored();
  return c && c.v === version && Date.now() - c.at < LASTS ? c : null;
}

const randomId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
};

/** Keeps an answer, tells the Pixel (CONSENT_EVENT) and records it on the API (in the background; a failure is ignored) */
export function saveConsent(ads: boolean, version: string, page: string): Consent {
  const c: Consent = { v: version, ads, at: Date.now(), id: stored()?.id ?? randomId() };
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* private mode: it holds for this page only */
  }
  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: c }));
  fetch(`${API}/api/contact/consents/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ browser: c.id, allowed: ads, version, page: page.slice(0, 200) }),
    keepalive: true,
  }).catch(() => {});
  return c;
}

/** Shows the prompt again (Cookie settings) */
export const openConsentPrompt = () => window.dispatchEvent(new Event(CONSENT_OPEN));

let region: Promise<boolean> | null = null;

/** Whether the Pixel may run for this visit at all: not from the EEA, the UK or Switzerland (app/api/region) */
export function regionAllowsPixel() {
  region ??= fetch('/api/region')
    .then((res) => (res.ok ? res.json() : { ok: false }))
    .then((r: { ok?: boolean }) => !!r.ok)
    .catch(() => false);
  return region;
}

/** Whether the cookie prompt applies to this visit: a Pixel ID in the admin, and a region where it may run */
export function useConsentApplies() {
  const t = useText();
  const id = pixelIdOf(t('facebook_pixel_id'));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (!id) return;
    let gone = false;
    regionAllowsPixel().then((v) => { if (!gone) setOk(v); });
    return () => { gone = true; };
  }, [id]);
  return !!id && ok;
}

'use client';

// The cookie prompt: asks before the Meta Pixel starts (site/consent.ts has the rules). It shows only while the admin
// has a Pixel ID and the visit comes from where it may run (not the EEA, the UK or Switzerland), after the opening
// screen, until the visitor answers. Cookie settings (the footer, or a link to #cookie-settings) opens it again to
// change the answer. "Allow" and "No thanks" are the same size: saying no is as easy as saying yes.
// Wording: Site settings > Page wording > Advertising (consent_*).
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useText } from '../site/SiteContext';
import { pixelIdOf } from '../site/pixel';
import { afterOpening } from '../site/afterOpening';
import { CONSENT_OPEN, COOKIE_SETTINGS_HREF, readConsent, regionAllowsPixel, saveConsent, useConsentVersion, type Consent } from '../site/consent';

const BUTTON =
  'h-10 flex-1 sm:flex-none sm:min-w-[112px] rounded-full px-5 text-[13px] font-semibold transition-colors duration-200 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue';

export default function ConsentBanner() {
  const t = useText();
  const id = pixelIdOf(t('facebook_pixel_id'));
  const version = useConsentVersion();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false); // slid in
  const [current, setCurrent] = useState<Consent | null>(null); // the answer being changed (Cookie settings)
  const reopened = useRef(false);
  const allow = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!id) return;
    let gone = false;
    let cancel = () => {};
    // not answered yet (or a year ago, or the wording has changed since)
    regionAllowsPixel().then((ok) => {
      if (!ok || gone || readConsent(version)) return;
      cancel = afterOpening(() => {
        if (gone) return;
        reopened.current = false;
        setCurrent(null);
        setOpen(true);
      });
    });
    // Cookie settings
    const reopen = () =>
      regionAllowsPixel().then((ok) => {
        if (!ok || gone) return;
        reopened.current = true;
        setCurrent(readConsent(version));
        setOpen(true);
      });
    const onLink = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest(`a[href="${COOKIE_SETTINGS_HREF}"]`)) {
        e.preventDefault();
        reopen();
      }
    };
    window.addEventListener(CONSENT_OPEN, reopen);
    document.addEventListener('click', onLink);
    return () => {
      gone = true;
      cancel();
      window.removeEventListener(CONSENT_OPEN, reopen);
      document.removeEventListener('click', onLink);
    };
  }, [id, version]);

  // slides in a frame after it mounts; it takes the focus only when the visitor opened it themselves
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      setShown(true);
      if (reopened.current) allow.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setShown(false);
  }, []);

  // Escape closes it only when there's already an answer to keep
  useEffect(() => {
    if (!open || !current) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, current, close]);

  const answer = (ads: boolean) => {
    saveConsent(ads, version, window.location.pathname);
    close();
  };

  if (!id || !open) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[10002] flex justify-center p-3 sm:p-5">
      <section
        role="dialog"
        aria-labelledby="consent-title"
        aria-describedby="consent-text"
        className={`pointer-events-auto w-full max-w-[640px] rounded-2xl bg-white p-4 text-midnight ring-1 ring-midnight/10 sm:p-5
          shadow-[0_24px_60px_-18px_rgba(1,7,43,0.45)] transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none
          ${shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
      >
        <div className="flex flex-col gap-4">
          <div className="min-w-0">
            <h2 id="consent-title" className="font-display text-[16px] font-bold leading-snug">
              {t('consent_title')}
            </h2>
            <p id="consent-text" className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
              {t('consent_text')}{' '}
              <Link href="/privacy" className="font-semibold text-brand-blue underline underline-offset-2 hover:text-midnight">
                {t('consent_more')}
              </Link>
            </p>
            {current && <p className="mt-2 text-[12px] font-semibold text-midnight/70">{t(current.ads ? 'consent_state_on' : 'consent_state_off')}</p>}
          </div>
          <div className="flex gap-2 sm:justify-end">
            <button type="button" onClick={() => answer(false)} className={`${BUTTON} bg-white text-midnight ring-1 ring-inset ring-midnight/25 hover:ring-midnight/50`}>
              {t('consent_decline')}
            </button>
            <button ref={allow} type="button" onClick={() => answer(true)} className={`${BUTTON} bg-midnight text-white hover:bg-brand-blue`}>
              {t('consent_allow')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

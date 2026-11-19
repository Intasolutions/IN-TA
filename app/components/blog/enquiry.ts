'use client';

// The enquiry form (ProjectForm) can be opened from elsewhere on the page: the home hero's buttons scroll to it and can
// pick its option and write the first words of the problem ("Get a free website & booking-flow check").
import { scrollToY } from '../SmoothScroll';

/** The form's anchor: one form per page */
export const ENQUIRY_ID = 'enquiry';
const EVENT = 'inta:enquiry';

export type EnquiryAsk = { need?: string; note?: string };

/** Scrolls to the page's enquiry form and fills it in as asked. False when this page has no form. */
export function openEnquiry(ask: EnquiryAsk = {}) {
  const form = document.getElementById(ENQUIRY_ID);
  if (!form) return false;
  const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 80;
  scrollToY(Math.max(0, form.getBoundingClientRect().top + window.scrollY - header - 16));
  window.dispatchEvent(new CustomEvent<EnquiryAsk>(EVENT, { detail: ask }));
  return true;
}

/** The form listens with this */
export function onEnquiry(handler: (ask: EnquiryAsk) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<EnquiryAsk>).detail ?? {});
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

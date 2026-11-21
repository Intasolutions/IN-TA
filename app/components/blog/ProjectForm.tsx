'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { track } from '@vercel/analytics';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Icon from '../Icon';
import { apiBase, calm } from './data';
import { ENQUIRY_ID, onEnquiry } from './enquiry';
import { useSite, useText } from '../../site/SiteContext';
import { linesOf, listOf, phoneHref } from '../../site/site';
import { pixelEvent } from '../../site/pixel';

gsap.registerPlugin(useGSAP);

const LABEL = 'block mb-1.5 font-mono text-[10px] uppercase tracking-wider font-bold text-white/60';
const FIELD =
  'block w-full h-11 rounded-xl border px-4 text-[15px] outline-none transition-[border-color,background-color,box-shadow] duration-200 focus:ring-4 focus:ring-brand-blue/15 disabled:opacity-60 ' +
  'bg-white/[0.06] border-white/15 text-white placeholder:text-white/35 focus:border-[#7fa6ff] focus:bg-white/[0.09] aria-invalid:border-[#ffb4b4]/70';
const ERROR = 'mt-1.5 block text-xs text-[#ffb4b4]';
// where the floating buttons (WhatsApp, the robot's chat) can cover the send button
const UNDER_FLOATING = '(max-width: 1023.98px)';

type Status = 'idle' | 'sending' | 'sent' | 'error';
type Field = 'name' | 'email' | 'whatsapp' | 'company' | 'need' | 'problem';
type Errors = Partial<Record<Field, string>>;
const EMPTY: Record<Field, string> = { name: '', email: '', whatsapp: '', company: '', need: '', problem: '' };

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const isPhone = (v: string) => /^[+\d\s()-]*$/.test(v) && v.replace(/\D/g, '').length >= 7 && v.replace(/\D/g, '').length <= 15;
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The enquiry band ("Tell us what you'd like to fix") → POST /api/blog/subscribe/. Its words are the admin's Page wording
 * (Enquiry form); a service's page passes its own heading and the option it starts on. Reveal targets: [data-pf="box" | "in"]. */
export default function ProjectForm({ defaultInterest, kicker, title, text }: { defaultInterest?: string; kicker?: string; title?: string; text?: string }) {
  const site = useSite();
  const t = useText();
  const ref = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  // The options from the admin; a service's page adds the service's own name when it isn't one of them
  const needs = listOf(t('enquiry_needs'));
  const pageNeed = defaultInterest?.trim() ?? '';
  const options = pageNeed && !needs.some((n) => same(n, pageNeed)) ? [pageNeed, ...needs] : needs;
  const [values, setValues] = useState<Record<Field, string>>(() => ({ ...EMPTY, need: options.find((o) => same(o, pageNeed)) ?? '' }));
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [slow, setSlow] = useState(false); // our API host can take a while to wake up
  const [success, ...successRest] = linesOf(t('enquiry_success'));

  const set = (field: Field, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  // Opened from elsewhere on the page (the home hero's buttons): pick the option asked for, write in the offer
  useEffect(
    () =>
      onEnquiry(({ need, note }) => {
        setStatus((s) => (s === 'sent' ? 'idle' : s));
        setValues((v) => ({
          ...v,
          need: (need && options.find((o) => same(o, need))) || v.need,
          problem: note && !v.problem.trim() ? note : v.problem,
        }));
        // once the page has scrolled there
        window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 1900);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options.join('|')],
  );

  const validate = () => {
    const v = values;
    const next: Errors = {};
    if (v.name.trim().length < 2) next.name = 'Please tell us your name.';
    if (!isEmail(v.email.trim())) next.email = 'Please enter a valid email address.';
    if (v.whatsapp.trim() && !isPhone(v.whatsapp.trim())) next.whatsapp = 'Please enter a valid number, with the country code.';
    if (v.company.trim().length < 2) next.company = 'Please tell us your company.';
    if (!v.need) next.need = 'Please pick what you need.';
    if (v.problem.trim().length < 3) next.problem = 'Please describe the problem in a line.';
    setErrors(next);
    const first = (Object.keys(next) as Field[])[0];
    if (first) ref.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    return !first;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === 'sending' || !validate()) return;
    setStatus('sending');
    const slowTimer = window.setTimeout(() => setSlow(true), 5000);
    try {
      let token = '';
      try {
        const r = await fetch(`${apiBase()}/api/csrf/`);
        if (r.ok) token = (await r.json()).csrfToken ?? '';
      } catch {
        // the API doesn't require it for anonymous posts; send without
      }
      const res = await fetch(`${apiBase()}/api/blog/subscribe/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'X-CSRFToken': token } : {}) },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.whatsapp.trim(),
          company: values.company.trim(),
          interest: values.need,
          message: values.problem.trim(),
        }),
      });
      if (res.status === 400) {
        // the API's own message for a field, shown under it
        const body = await res.json().catch(() => ({}));
        const map: Record<string, Field> = { name: 'name', email: 'email', phone: 'whatsapp', company: 'company', interest: 'need', message: 'problem' };
        const next: Errors = {};
        for (const [k, f] of Object.entries(map)) if (Array.isArray(body?.[k]) && body[k][0]) next[f] = String(body[k][0]);
        if (Object.keys(next).length) {
          setErrors(next);
          setStatus('idle');
          return;
        }
      }
      if (!res.ok) throw new Error(String(res.status));
      track('Enquiry', { form: 'enquiry', interest: values.need });
      pixelEvent('Lead', { content_name: 'enquiry form', content_category: values.need });
      setStatus('sent');
      setValues({ ...EMPTY, need: values.need });
    } catch {
      setStatus('error');
    } finally {
      window.clearTimeout(slowTimer);
      setSlow(false);
    }
  };

  // Success: the tick pops in and the message rises
  useGSAP(
    () => {
      if (status !== 'sent' || calm()) return;
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .from('[data-pf="tick"]', { scale: 0, rotate: -90, duration: 0.9, ease: 'back.out(2)' })
        .from('[data-pf="done"]', { y: 16, autoAlpha: 0, stagger: 0.08, duration: 0.8 }, 0.15);
    },
    { scope: ref, dependencies: [status] },
  );

  const busy = status === 'sending';

  const input = (field: Exclude<Field, 'need'>, label: string, props: React.InputHTMLAttributes<HTMLInputElement>, after?: ReactNode) => (
    <label className="block min-w-0">
      <span className={LABEL}>{label}</span>
      <input
        ref={field === 'name' ? nameRef : undefined}
        className={FIELD}
        name={field}
        value={values[field]}
        disabled={busy}
        aria-invalid={!!errors[field]}
        aria-describedby={[errors[field] ? `pf-${field}-error` : '', after ? `pf-${field}-hint` : ''].filter(Boolean).join(' ') || undefined}
        onChange={(e) => set(field, e.target.value)}
        {...props}
      />
      {errors[field] ? <span id={`pf-${field}-error`} className={ERROR}>{errors[field]}</span> : after}
    </label>
  );

  return (
    <div ref={ref} id={ENQUIRY_ID} data-pf="box" className="relative overflow-hidden rounded-3xl bg-midnight text-white px-5 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-9 scroll-mt-24">
      {/* slow-breathing glows behind the band */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="absolute -left-24 -top-32 w-[26rem] h-[26rem] rounded-full bg-brand-blue/45 blur-3xl animate-[pulse_7s_ease-in-out_infinite]" />
        <span className="absolute -right-20 -bottom-40 w-[24rem] h-[24rem] rounded-full bg-[#3b7bf7]/25 blur-3xl" />
      </span>

      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
        <div className="lg:col-span-4 lg:pt-1">
          <span data-pf="in" className="inline-flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] uppercase font-bold mb-2.5 text-[#9dbbff]">
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            {kicker || t('enquiry_kicker')}
          </span>
          <h2 data-pf="in" className="font-display font-extrabold uppercase tracking-tight leading-[1.02] text-white text-[length:clamp(1.5rem,2.6vw,2.1rem)]">
            {title || t('enquiry_title')}
          </h2>
          <p data-pf="in" className="mt-2.5 text-sm leading-relaxed max-w-sm text-white/70">
            {text || t('enquiry_text')}
          </p>
        </div>

        <div className="lg:col-span-8">
          {status === 'sent' ? (
            <div role="status" className="flex items-center gap-4 py-2 lg:min-h-[12rem]">
              <span data-pf="tick" className="flex w-12 h-12 shrink-0 items-center justify-center rounded-full bg-[#22c55e] text-white shadow-lg shadow-[#22c55e]/30">
                <Icon name="check" className="text-[26px]" />
              </span>
              <span className="min-w-0">
                <span data-pf="done" className="block font-display font-bold text-lg sm:text-xl">{success}</span>
                <span data-pf="done" className="block text-sm text-white/70">
                  {successRest.join(' ')}{' '}
                  <button type="button" onClick={() => setStatus('idle')} className="underline underline-offset-4 text-[#9dbbff] whitespace-nowrap">
                    Send another
                  </button>
                </span>
              </span>
            </div>
          ) : (
            <form data-pf="in" onSubmit={submit} noValidate className="flex flex-col gap-4">
              {/* 1. what they need: one swipeable line of chips on phones, wrapping from tablets up */}
              <fieldset disabled={busy} className="min-w-0" aria-describedby={errors.need ? 'pf-need-error' : undefined}>
                <legend className={LABEL}>{t('enquiry_need')}</legend>
                <div className="flex gap-2 overflow-x-auto -mx-5 px-5 py-1 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {options.map((opt) => (
                    <label
                      key={opt}
                      className="shrink-0 whitespace-nowrap cursor-pointer select-none rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-[background-color,color,border-color,scale] duration-200 active:scale-95
                        has-focus-visible:ring-4 has-focus-visible:ring-brand-blue/30
                        border-white/15 text-white/80 hover:border-white/40 has-checked:bg-white has-checked:text-midnight has-checked:border-white"
                    >
                      <input type="radio" name="need" value={opt} checked={values.need === opt} onChange={() => set('need', opt)} className="sr-only" />
                      {opt}
                    </label>
                  ))}
                </div>
                {errors.need && <span id="pf-need-error" className={ERROR}>{errors.need}</span>}
              </fieldset>

              {/* 2. who they are */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {input('name', t('enquiry_name'), { autoComplete: 'name', maxLength: 100 })}
                {input('email', t('enquiry_email'), { type: 'email', inputMode: 'email', autoComplete: 'email', maxLength: 254 })}
                {input('whatsapp', t('enquiry_whatsapp'), { type: 'tel', inputMode: 'tel', autoComplete: 'tel', maxLength: 20, placeholder: '+91' })}
                {input('company', t('enquiry_company'), { autoComplete: 'organization', maxLength: 120 })}
              </div>

              {/* 3. the problem, in a line */}
              {input('problem', t('enquiry_problem'), { maxLength: 500, autoComplete: 'off' }, (
                <span id="pf-problem-hint" className="mt-1.5 block text-xs text-white/50">{t('enquiry_problem_hint')}</span>
              ))}

              {/* 4. send (on phones and tablets the floating WhatsApp and chat buttons step aside while it's on screen) */}
              <div data-guide-clear={UNDER_FLOATING} data-whatsapp-clear={UNDER_FLOATING} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                <button
                  type="submit"
                  disabled={busy}
                  className="kinetic-cta-btn group inline-flex h-12 shrink-0 items-center justify-center gap-3 px-6 rounded-xl bg-brand-blue hover:bg-[#2563eb] text-white font-mono text-xs uppercase tracking-wider font-semibold whitespace-nowrap active:scale-[0.97] disabled:opacity-80 disabled:cursor-wait"
                >
                  {busy ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Sending…</span>
                    </>
                  ) : (
                    <>
                      <span>{t('enquiry_button')}</span>
                      <Icon name="arrow_outward" className="text-[16px] transition-transform duration-300 group-hover:rotate-45" />
                    </>
                  )}
                </button>
                <p aria-live="polite" className={`flex items-start gap-2 text-xs leading-relaxed ${status === 'error' ? 'text-[#ffb4b4]' : 'text-white/60'}`}>
                  {status === 'error' ? (
                    <span>
                      Something went wrong. Please try again, or call{' '}
                      <a href={phoneHref(site.phone)} className="underline underline-offset-2 whitespace-nowrap">{site.phone}</a>.
                    </span>
                  ) : slow ? (
                    'Still sending, hang tight…'
                  ) : (
                    <>
                      <Icon name="lock" className="text-[14px] shrink-0 mt-px" /> {t('enquiry_note')}
                    </>
                  )}
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

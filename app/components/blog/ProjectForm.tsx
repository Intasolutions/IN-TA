'use client';

import { useRef, useState, type FormEvent } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Icon from '../Icon';
import { apiBase, calm } from './data';

gsap.registerPlugin(useGSAP);

// Must be values the backend accepts (Subscriber.INTEREST_CHOICES in blog/models.py)
const INTERESTS = ['Web Development', 'Enterprise Web Solutions', 'Mobile App Development', 'UI/UX Design Strategy', 'System Architecture'];
const PHONE = { href: 'tel:+919447595381', label: '+91 94475 95381' };

const LABEL = 'block mb-2 font-mono text-[10px] uppercase tracking-wider font-bold text-white/60';
const FIELD =
  'block w-full h-12 rounded-xl border px-4 text-[15px] outline-none transition-[border-color,background-color,box-shadow] duration-200 focus:ring-4 focus:ring-brand-blue/15 disabled:opacity-60 ' +
  'bg-white/[0.06] border-white/15 text-white placeholder:text-white/35 focus:border-[#7fa6ff] focus:bg-white/[0.09]';

type Status = 'idle' | 'sending' | 'sent' | 'error';

/** "Work with us" enquiry band → POST /api/blog/subscribe/ ({ name, phone, interest }). Reveal targets: [data-pf="box" | "in"]. */
export default function ProjectForm() {
  const ref = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [interest, setInterest] = useState(INTERESTS[0]);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [status, setStatus] = useState<Status>('idle');
  const [slow, setSlow] = useState(false); // our API host can take a while to wake up

  const validate = () => {
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = 'Please tell us your name.';
    const digits = phone.replace(/\D/g, '').length;
    if (!/^[+\d\s()-]*$/.test(phone.trim()) || digits < 7 || digits > 15) next.phone = 'Please enter a valid phone number.';
    setErrors(next);
    return !next.name && !next.phone;
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
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), interest }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus('sent');
      setName('');
      setPhone('');
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

  return (
    <div ref={ref} data-pf="box" className="relative overflow-hidden rounded-3xl bg-midnight text-white px-5 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
      {/* slow-breathing glows behind the band */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="absolute -left-24 -top-32 w-[26rem] h-[26rem] rounded-full bg-brand-blue/45 blur-3xl animate-[pulse_7s_ease-in-out_infinite]" />
        <span className="absolute -right-20 -bottom-40 w-[24rem] h-[24rem] rounded-full bg-[#3b7bf7]/25 blur-3xl" />
      </span>

      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
        <div className="lg:col-span-4">
          <span data-pf="in" className="inline-flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] uppercase font-bold mb-2.5 text-[#9dbbff]">
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            Work with us
          </span>
          <h3 data-pf="in" className="heading-section text-white">
            Have a project in mind?
          </h3>
          <p data-pf="in" className="mt-2.5 text-sm leading-relaxed max-w-sm text-white/70">
            Share your details and we&apos;ll reach out to talk through how we can build it.
          </p>
        </div>

        <div className="lg:col-span-8">
          {status === 'sent' ? (
            <div role="status" className="flex items-center gap-4 py-2">
              <span data-pf="tick" className="flex w-12 h-12 shrink-0 items-center justify-center rounded-full bg-[#22c55e] text-white shadow-lg shadow-[#22c55e]/30">
                <Icon name="check" className="text-[26px]" />
              </span>
              <span className="min-w-0">
                <span data-pf="done" className="block font-display font-bold text-lg sm:text-xl">Message received.</span>
                <span data-pf="done" className="block text-sm text-white/70">
                  Thanks for reaching out. We&apos;ll be in touch shortly.{' '}
                  <button type="button" onClick={() => setStatus('idle')} className="underline underline-offset-4 text-[#9dbbff] whitespace-nowrap">
                    Send another
                  </button>
                </span>
              </span>
            </div>
          ) : (
            <form data-pf="in" onSubmit={submit} noValidate className="flex flex-col gap-4">
              {/* 1. the topic: one swipeable line of chips on phones, wrapping from tablets up */}
              <fieldset disabled={busy} className="min-w-0">
                <legend className={LABEL}>I&apos;m interested in</legend>
                <div className="flex gap-2 overflow-x-auto -mx-5 px-5 py-1 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {INTERESTS.map((opt) => (
                    <label
                      key={opt}
                      className="shrink-0 whitespace-nowrap cursor-pointer select-none rounded-full border px-3 py-1.5 text-xs font-semibold transition-[background-color,color,border-color,scale] duration-200 active:scale-95
                        has-focus-visible:ring-4 has-focus-visible:ring-brand-blue/30
                        border-white/15 text-white/80 hover:border-white/40 has-checked:bg-white has-checked:text-midnight has-checked:border-white"
                    >
                      <input type="radio" name="interest" value={opt} checked={interest === opt} onChange={() => setInterest(opt)} className="sr-only" />
                      {opt}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* 2. who to call, and send: one row from tablets up */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-start">
                <label className="block">
                  <span className="sr-only">Your name</span>
                  <input
                    className={FIELD}
                    name="name"
                    autoComplete="name"
                    maxLength={100}
                    placeholder="Your name"
                    value={name}
                    disabled={busy}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'pf-name-error' : undefined}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
                    }}
                  />
                  {errors.name && <span id="pf-name-error" className="mt-1.5 block text-xs text-[#ffb4b4]">{errors.name}</span>}
                </label>
                <label className="block">
                  <span className="sr-only">Phone</span>
                  <input
                    className={FIELD}
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={20}
                    placeholder="Phone number"
                    value={phone}
                    disabled={busy}
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? 'pf-phone-error' : undefined}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errors.phone) setErrors((x) => ({ ...x, phone: undefined }));
                    }}
                  />
                  {errors.phone && <span id="pf-phone-error" className="mt-1.5 block text-xs text-[#ffb4b4]">{errors.phone}</span>}
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="kinetic-cta-btn group inline-flex h-12 items-center justify-center gap-3 px-6 rounded-xl bg-brand-blue hover:bg-[#2563eb] text-white font-mono text-xs uppercase tracking-wider font-semibold whitespace-nowrap active:scale-[0.97] disabled:opacity-80 disabled:cursor-wait"
                >
                  {busy ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Sending…</span>
                    </>
                  ) : (
                    <>
                      <span>Send enquiry</span>
                      <Icon name="arrow_outward" className="text-[16px] transition-transform duration-300 group-hover:rotate-45" />
                    </>
                  )}
                </button>
              </div>

              <p aria-live="polite" className={`-mt-1 flex items-center gap-2 text-xs ${status === 'error' ? 'text-[#ffb4b4]' : 'text-white/50'}`}>
                {status === 'error' ? (
                  <span>
                    Something went wrong. Please try again, or call{' '}
                    <a href={PHONE.href} className="underline underline-offset-2 whitespace-nowrap">{PHONE.label}</a>.
                  </span>
                ) : slow ? (
                  'Still sending, hang tight…'
                ) : (
                  <>
                    <Icon name="lock" className="text-[14px] shrink-0" /> Your details stay with us and are only used to contact you.
                  </>
                )}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Icon from '../Icon';
import { apiBase } from '../blog/data';
import { COUNTRIES } from '../../contact/data/countries';

const LABEL = 'mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-white/70';
const FIELD = 'block h-12 w-full rounded-xl border bg-white/[0.06] px-4 text-base text-white outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-white/35 focus:bg-white/[0.09] focus:ring-4 focus:ring-[#3b7bf7]/25 sm:text-[15px]';
const fieldState = (bad?: string) => (bad ? 'border-[#ff9d9d] focus:border-[#ff9d9d]' : 'border-white/15 focus:border-[#7fa6ff]');

type Status = 'idle' | 'sending' | 'sent' | 'error';
type Errors = Partial<Record<'name' | 'email' | 'phone' | 'country' | 'message', string>>;

type Props = {
  onKey: () => void; // a key went down: a little light goes up the cable
  onSending: () => void;
  onSent: () => void;
};

/** The message line: posts to the same endpoint the admin panel reads (POST /api/contact/messages/) */
export default function MessageLine({ onKey, onSending, onSent }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [message, setMessage] = useState('');
  const [trap, setTrap] = useState(''); // only a bot fills this in
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [slow, setSlow] = useState(false); // our API host can take a while to wake up
  const sentName = useRef('');
  const sentEmail = useRef('');

  // Most visitors don't need to look for their own country
  useEffect(() => {
    try {
      const region = new Intl.Locale(navigator.language).region;
      const found = COUNTRIES.find((c) => c.code === region);
      if (found) queueMicrotask(() => setCountry((now) => now || found.name));
    } catch {
      // they'll pick it themselves
    }
  }, []);

  const dial = COUNTRIES.find((c) => c.name === country)?.dial;
  const payload = useMemo(
    () => ({ name: name.trim(), email: email.trim(), phone: phone.trim(), country, message: message.trim(), is_request: true, honeypot: trap }),
    [name, email, phone, country, message, trap],
  );
  const bytes = useMemo(() => new TextEncoder().encode(JSON.stringify(payload)).length, [payload]);

  const validate = () => {
    const next: Errors = {};
    if (payload.name.length < 2) next.name = 'Please tell us your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) next.email = 'Please enter a valid email address.';
    const digits = payload.phone.replace(/\D/g, '').length;
    if (!/^[+\d\s()-]*$/.test(payload.phone) || digits < 7 || digits > 15) next.phone = 'Please enter a valid phone number.';
    if (!country) next.country = 'Please choose your country.';
    if (payload.message.length < 5) next.message = 'Please tell us a little more.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === 'sending' || !validate()) return;
    setStatus('sending');
    onSending();
    const slowTimer = window.setTimeout(() => setSlow(true), 5000);
    try {
      let token = '';
      try {
        const r = await fetch(`${apiBase()}/api/csrf/`);
        if (r.ok) token = (await r.json()).csrfToken ?? '';
      } catch {
        // the API doesn't require it for anonymous posts; send without
      }
      const res = await fetch(`${apiBase()}/api/contact/messages/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'X-CSRFToken': token } : {}) },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        // the server's own word on what's wrong, shown on the field it's about
        const body = await res.json().catch(() => null);
        if (res.status === 400 && body && typeof body === 'object') {
          const fields = ['name', 'email', 'phone', 'country', 'message'] as const;
          const next: Errors = {};
          fields.forEach((f) => {
            if (body[f]) next[f] = String(Array.isArray(body[f]) ? body[f][0] : body[f]);
          });
          if (Object.keys(next).length) {
            setErrors(next);
            setStatus('idle');
            return;
          }
        }
        throw new Error(String(res.status));
      }
      sentName.current = payload.name.split(/\s+/)[0];
      sentEmail.current = payload.email;
      setStatus('sent');
      onSent();
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch {
      setStatus('error');
    } finally {
      window.clearTimeout(slowTimer);
      setSlow(false);
    }
  };

  if (status === 'sent') {
    return (
      <div role="status" data-line className="flex flex-col items-start gap-4 py-4 sm:py-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2f6bff] text-white shadow-[0_0_28px_2px_rgb(47_107_255/0.6)]">
          <Icon name="check" className="text-[24px]" />
        </span>
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9dbbff] sm:text-[11px]">Delivered</p>
          <h2 className="heading-section mt-2 text-white">Thanks, <span className="heading-accent-dark">{sentName.current}.</span></h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/85 sm:text-base">Your message is with our team in Wayanad, and we&apos;ll reply during office hours. You should also get a confirmation at {sentEmail.current}.</p>
        </div>
        <button type="button" onClick={() => setStatus('idle')} className="blog-wipe rounded-lg border border-white/25 px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-white">
          Send another
        </button>
      </div>
    );
  }

  const describe = (field: keyof Errors) => (errors[field] ? `contact-${field}-error` : undefined);
  const problem = (field: keyof Errors) =>
    errors[field] ? (
      <p id={`contact-${field}-error`} className="mt-1.5 text-[13px] text-[#ffb4b4]">{errors[field]}</p>
    ) : null;
  const busy = status === 'sending';

  return (
    <form noValidate onSubmit={submit} onKeyDown={(e) => { if (e.key.length === 1 || e.key === 'Backspace') onKey(); }} aria-label="Send us a message">
      <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
        <div data-line>
          <label htmlFor="contact-name" className={LABEL}>Your name</label>
          <input id="contact-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={describe('name')} className={`${FIELD} ${fieldState(errors.name)}`} />
          {problem('name')}
        </div>
        <div data-line>
          <label htmlFor="contact-email" className={LABEL}>Email</label>
          <input id="contact-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={describe('email')} className={`${FIELD} ${fieldState(errors.email)}`} />
          {problem('email')}
        </div>
        <div data-line>
          <label htmlFor="contact-country" className={LABEL}>Country</label>
          <select id="contact-country" autoComplete="country-name" value={country} onChange={(e) => setCountry(e.target.value)} aria-invalid={Boolean(errors.country)} aria-describedby={describe('country')} className={`${FIELD} cursor-pointer appearance-none ${fieldState(errors.country)}`}>
            <option value="" className="bg-midnight text-white">Choose</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.name} className="bg-midnight text-white">{c.name}</option>
            ))}
          </select>
          {problem('country')}
        </div>
        <div data-line>
          <label htmlFor="contact-phone" className={LABEL}>Phone</label>
          <div className="relative">
            {dial && <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-white/55">{dial}</span>}
            <input id="contact-phone" type="tel" autoComplete="tel-national" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={Boolean(errors.phone)} aria-describedby={describe('phone')} style={dial ? { paddingLeft: `${dial.length * 0.62 + 1.75}rem` } : undefined} className={`${FIELD} ${fieldState(errors.phone)}`} />
          </div>
          {problem('phone')}
        </div>
      </div>
      <div data-line className="mt-3.5 sm:mt-4">
        <label htmlFor="contact-message" className={LABEL}>What do you need?</label>
        <textarea id="contact-message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} aria-invalid={Boolean(errors.message)} aria-describedby={describe('message')} className={`${FIELD} h-auto resize-y py-3 leading-relaxed ${fieldState(errors.message)}`} />
        {problem('message')}
      </div>
      {/* only a bot fills this in; people never see it */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="contact-website">Leave this empty</label>
        <input id="contact-website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
      </div>
      <div data-line className="mt-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 sm:mt-5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-white/60 sm:text-[11px]">
          Packet <span data-bytes className="font-bold text-[#9dbbff]">{bytes}</span> bytes · to Wayanad, Kerala
        </p>
        <button type="submit" disabled={busy} className="kinetic-cta-btn group inline-flex h-12 items-center justify-center gap-3 rounded-xl bg-brand-blue px-6 font-mono text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#2563eb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dbbff] disabled:cursor-wait disabled:opacity-70 max-sm:w-full">
          {busy ? (
            <>
              <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Sending
            </>
          ) : (
            <>
              Send message
              <Icon name="arrow_outward" className="text-[16px] transition-transform duration-300 group-hover:rotate-45" />
            </>
          )}
        </button>
      </div>
      <div aria-live="polite">
        {slow && busy && <p className="mt-3 text-[13px] text-white/70">Still sending. Our server can take a moment to wake up.</p>}
        {status === 'error' && (
          <p role="alert" className="mt-3 text-[14px] leading-relaxed text-[#ffb4b4]">
            That didn&apos;t reach us. Your words are still here, so please try again, or call <a href="tel:+919447595381" className="underline underline-offset-2">+91 94475 95381</a>.
          </p>
        )}
      </div>
    </form>
  );
}

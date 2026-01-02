'use client';

import React, { useEffect, useState } from 'react';
import { COUNTRIES } from '../data/countries';

export default function ContactForm({ onSuccess }: { onSuccess?: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState('Custom Software');
  const [message, setMessage] = useState('');
  const [country, setCountry] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [toastVisible, setToastVisible] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';

  // capture small UTM set for diagnostics; append to source string
  const [utmString, setUtmString] = useState('');
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
      const parts: string[] = [];
      utmKeys.forEach((k) => {
        const v = params.get(k);
        if (v) parts.push(`${k}=${v}`);
      });
      if (parts.length) setUtmString(parts.join('&'));
    } catch (e) {
      // ignore
    }
  }, []);

  const selectedDial = COUNTRIES.find((c) => c.name === country)?.dial || ''; 

  const submit = async (e: React.FormEvent | React.MouseEvent, isReq = false) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // basic client validation
    if (!name.trim() || !email.trim() || !message.trim() || message.trim().length < 5) {
      setError('Please provide name, email, and a short message (min 5 chars).');
      return;
    }

    if (!phone.trim() || !country.trim()) {
      setError('Please provide mobile number and select country.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = { name, email, phone, country, message, is_request: isReq, source: window.location.href + (utmString ? `?${utmString}` : ''), honeypot };

      const res = await fetch(`${apiBase}/api/contact/messages/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        // if the API returned field-level errors (DRF style), show them
        if (typeof body === 'object' && Object.keys(body).length) {
          const newFieldErrors: Record<string, string[]> = {};
          Object.keys(body).forEach((k) => {
            if (Array.isArray(body[k])) newFieldErrors[k] = body[k].map((x: any) => String(x));
          });
          setFieldErrors(newFieldErrors);
          // also show a top-level message if present
          if (body.detail) setError(String(body.detail));
          else if (newFieldErrors.non_field_errors) setError(newFieldErrors.non_field_errors.join(' '));
          else setError('Please check the highlighted fields.');
        } else {
          setError('Unable to send message — please try again later.');
        }

        setLoading(false);
        return;
      }

      // success — small toast, analytics event, and forward to page success
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2600);

      try {
        // analytics: dataLayer push if present
        (window as any).dataLayer?.push?.({ event: 'contactFormSubmit', topic });
        // gtag if available
        (window as any).gtag?.('event', 'contact_form_submit', { event_category: 'contact', event_label: topic });
      } catch (e) {
        // ignore
      }

      // clear inputs and signal success
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setHoneypot('');
      setLoading(false);
      onSuccess && onSuccess();
    } catch (err) {
      setLoading(false);
      setError('Network error — please try again');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6" aria-live="polite">
      <p className="text-black text-sm">Start the conversation 👋</p>

      {error && <div className="text-sm text-rose-600" role="alert">{error}</div>}

      <div className="chat-bubble text-black">
        <label className="sr-only">Your name</label>
        Hi, I’m
        <input
          required
          aria-label="Your name"
          aria-invalid={!!fieldErrors.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="your name"
        />
        {fieldErrors.name && <div className="text-xs text-rose-600 mt-1">{fieldErrors.name.join(' ')}</div>}
      </div>

      <div className="chat-bubble text-black">
        <label className="sr-only">Email address</label>
        You can reach me at
        <input
          required
          type="email"
          aria-label="Email address"
          aria-invalid={!!fieldErrors.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email address"
        />
        {fieldErrors.email && <div className="text-xs text-rose-600 mt-1">{fieldErrors.email.join(' ')}</div>}
      </div>

      <div className="chat-bubble text-black  ">
        <label className="sr-only">Topic</label>
        I’m looking for help with
        <select value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Project topic">
          <option>Custom Software</option>
          <option>Web / App Development</option>
          <option>Branding & Design</option>
          <option>Digital Marketing</option>
          <option>Other</option>
        </select>
      </div>

      <div className="chat-bubble text-black flex gap-3 items-center">
        <div style={{ minWidth: 140 }}>
          <label className="sr-only">Country</label>
          <select aria-label="Country" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full p-0">
            <option value="">Select country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.name}>{c.name} ({c.dial})</option>
            ))}
          </select>
          {fieldErrors.country && <div className="text-xs text-rose-600 mt-1">{fieldErrors.country.join(' ')}</div>}
        </div>

        <div className="flex-1">
          <label className="sr-only">Mobile number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={selectedDial ? `${selectedDial} Mobile number` : 'Mobile number'}
            aria-label="Mobile number"
            inputMode="tel"
          />
          {fieldErrors.phone && <div className="text-xs text-rose-600 mt-1">{fieldErrors.phone.join(' ')}</div>}
        </div>
      </div>

      <div className="chat-bubble text-black">
        <label className="sr-only">Message</label>
        Here’s a bit more detail
        <textarea
          rows={3}
          aria-label="Message"
          aria-invalid={!!fieldErrors.message}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us about your idea…"
        />
        {fieldErrors.message && <div className="text-xs text-rose-600 mt-1">{fieldErrors.message.join(' ')}</div>}

        <div className="mt-4 flex gap-3 items-center">
          <button
            type="button"
            className={`primary-btn ${(!name.trim() || !email.trim() || message.trim().length < 5 || !phone.trim() || !country.trim() || loading) ? 'opacity-60 cursor-not-allowed' : ''}`}
            onClick={(e) => submit(e, true)}
            disabled={!name.trim() || !email.trim() || message.trim().length < 5 || !phone.trim() || !country.trim() || loading}
            aria-pressed="false"
          >
            Submit request
          </button>
        </div>
      </div>

      {/* honeypot field (hidden visually but accessible to bots) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }} aria-hidden>
        <label>Do not fill this</label>
        <input value={honeypot} onChange={(e) => setHoneypot(e.target.value)} autoComplete="off" />
      </div>

      {/* validation hint */}
      {!loading && (!name.trim() || !email.trim() || message.trim().length < 5 || !phone.trim() || !country.trim()) && (
        <div className="text-xs text-slate-500">Please provide name, email, mobile number (with country) and a short message (min 5 chars).</div>
      )}

      <button
        className={`primary-btn w-full mt-6 ${(!name.trim() || !email.trim() || message.trim().length < 5 || !phone.trim() || !country.trim() || loading) ? 'opacity-60 cursor-not-allowed' : ''}`}
        disabled={!name.trim() || !email.trim() || message.trim().length < 5 || !phone.trim() || !country.trim() || loading}
        aria-busy={loading}
        aria-label="Send message"
      >
        {loading ? (
          <span className="inline-flex items-center gap-3"><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="3" strokeOpacity="0.2" /><path d="M22 12a10 10 0 0 0-10-10" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></svg> Sending…</span>
        ) : (
          'Send message →'
        )}
      </button>

      {/* small toast */}
      {toastVisible && (
        <div className="fixed bottom-6 right-6 bg-[#0b2a5f] text-white px-4 py-2 rounded-md shadow-lg" role="status">Message sent — we’ll get back shortly.</div>
      )}
    </form>
  );
}

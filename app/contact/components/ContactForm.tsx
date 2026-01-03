import React, { useState } from 'react';
import { COUNTRIES } from '../data/countries';

interface ContactFormProps {
  onSuccess?: () => void;
}

export default function ContactForm({ onSuccess }: ContactFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('Custom Software');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDial = COUNTRIES.find((c) => c.name === country)?.dial;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Simulate API call - User can replace this with actual logic
    try {
      // Mock network request
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Success
      if (onSuccess) onSuccess();

      // Reset form
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setCountry('');
      setTopic('Custom Software');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-xl bg-white rounded-3xl
             shadow-[0_20px_60px_rgba(0,0,0,0.08)]
             p-10 space-y-6"
      aria-live="polite"
    >
      {/* Header */}
    <div>
  <p className="text-sm font-medium text-blue-600">
    Start the conversation 👋
  </p>

  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
    Tell us about your project
  </h2>

  <p className="mt-1 text-sm text-slate-600">
    We usually respond within 24 hours.
  </p>
</div>


      {error && (
        <div className="rounded-lg bg-rose-50 text-rose-700 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Name + Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Your name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="label">Email address</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@email.com"
          />
        </div>
      </div>

      {/* Topic */}
      <div>
        <label className="label">I’m looking for help with</label>
        <select
          className="input"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        >
          <option>Custom Software</option>
          <option>Web / App Development</option>
          <option>Branding & Design</option>
          <option>Digital Marketing</option>
          <option>Other</option>
        </select>
      </div>

      {/* Country + Phone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Country</label>
          <select
            className="input"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="">Select country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.name}>
                {c.name} ({c.dial})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Mobile number</label>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={selectedDial || "Mobile number"}
          />
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="label">Project details</label>
        <textarea
          rows={4}
          className="input resize-none"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us about your idea…"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-blue-600 py-3 text-white font-medium
             hover:bg-blue-700 transition shadow-md
             disabled:opacity-60"

      >
        {loading ? "Sending…" : "Send message →"}
      </button>

      <p className="text-xs text-slate-500 text-center">
        By submitting, you agree to be contacted regarding your request.
      </p>
    </form>
  );
}

'use client';

import { startTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from './components/Header';
import Icon from './components/Icon';
import { useSite } from './site/SiteContext';

/**
 * When a page fails on our side. Shows Next's reference for the failure (it matches the server's log), so a visitor
 * who writes in can quote it, and lets them try again without reloading the whole site.
 */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const { email: EMAIL } = useSite();
  const again = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  const subject = encodeURIComponent(`Website error${error.digest ? ` ${error.digest}` : ''}`);

  return (
    <>
      <Header />
      <main className="flex min-h-svh items-center bg-canvas text-midnight">
        <div className="mx-auto grid w-full max-w-[1520px] items-center gap-10 px-4 pb-16 pt-[calc(var(--header-h)+2rem)] sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-16">
          <div>
            <p className="inline-flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brand-blue sm:text-[11px] sm:tracking-[0.3em]">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current" />
              Error {'//'} Something broke
            </p>
            <h1 className="heading-page mt-2.5 text-midnight sm:mt-3">
              This page <span className="heading-accent heading-serif">failed.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-midnight/80 [text-wrap:pretty] sm:text-lg">
              The fault is on our side, not yours. Trying again usually works. If it keeps happening, please let us know.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={again}
                className="kinetic-cta-btn inline-flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-white hover:bg-midnight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
              >
                Try again
              </button>
              <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-midnight/20 px-5 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-midnight transition-colors duration-300 hover:border-brand-blue hover:text-brand-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
                <Icon name="arrow_back" className="text-[16px]" />
                Home page
              </Link>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-2xl bg-midnight font-mono text-[12px] text-white shadow-[0_40px_80px_-40px_rgb(1_7_43/0.6)] sm:text-[13px]">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-white/20" />
              ))}
              <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-white/45 sm:text-[11px]">status</span>
            </div>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 p-4 sm:p-6">
              <dt className="text-white/45">status</dt>
              <dd className="font-bold uppercase tracking-wider text-[#ff8a8a]">error</dd>
              {error.digest && (
                <>
                  <dt className="text-white/45">reference</dt>
                  <dd className="break-all text-white/90">{error.digest}</dd>
                </>
              )}
              <dt className="text-white/45">report to</dt>
              <dd>
                <a href={`mailto:${EMAIL}?subject=${subject}`} className="break-all text-[#9dbbff] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7fa6ff]">
                  {EMAIL}
                </a>
              </dd>
            </dl>
          </div>
        </div>
      </main>
    </>
  );
}

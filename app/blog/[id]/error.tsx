'use client';

import { startTransition, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const TRIES = 8;
const EVERY_MS = 6000;

// Survives this page being put back after each failed try
let tries = 0;

/** Our API host can be asleep, and takes a little while to wake: keeps asking for a while before saying so */
export default function ArticleError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(tries >= TRIES);

  const again = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  useEffect(() => {
    if (tries >= TRIES) return;
    const wait = window.setTimeout(() => {
      tries += 1;
      if (tries >= TRIES) setGaveUp(true);
      else again();
    }, EVERY_MS);
    return () => window.clearTimeout(wait);
  });

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-canvas px-4 pb-16 pt-[calc(var(--header-h)+2rem)] text-center text-midnight">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brand-blue sm:text-[11px]">Blog</p>
      <h1 className="heading-section mt-3">
        {gaveUp ? 'This article is taking too long.' : 'Getting the article.'}
      </h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-midnight/75 sm:text-base">
        {gaveUp ? 'Please try again in a little while.' : 'This can take a moment the first time. It will appear here by itself.'}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {gaveUp && (
          <button
            type="button"
            onClick={() => {
              tries = 0;
              setGaveUp(false);
              again();
            }}
            className="kinetic-cta-btn rounded-xl bg-brand-blue px-5 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-white hover:bg-midnight"
          >
            Try again
          </button>
        )}
        <Link href="/blog" className="rounded-xl border border-midnight/20 px-5 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-midnight transition-colors duration-300 hover:border-brand-blue hover:text-brand-blue">
          All articles
        </Link>
      </div>
    </main>
  );
}

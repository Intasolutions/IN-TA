'use client';

/**
 * The last resort, for when the site's own frame fails: it replaces the whole document, so it carries its own
 * minimal styles instead of relying on the site's.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100svh', display: 'grid', placeItems: 'center', background: '#edf2ec', color: '#01072b', fontFamily: 'ui-sans-serif, system-ui, sans-serif', padding: '1rem', boxSizing: 'border-box' }}>
        <main style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0144b5' }}>Error</p>
          <h1 style={{ margin: '0.5rem 0 0', fontSize: 'clamp(2rem, 6vw, 3rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, textTransform: 'uppercase' }}>The site failed to load.</h1>
          <p style={{ margin: '1rem 0 0', lineHeight: 1.6, opacity: 0.8 }}>The fault is on our side. Please try again in a moment.</p>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={reset} style={{ cursor: 'pointer', border: 0, borderRadius: 12, background: '#0144b5', color: '#fff', padding: '0.8rem 1.25rem', fontFamily: 'ui-monospace, monospace', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Try again
            </button>
            {/* a full load, since the site's own navigation is what failed */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ borderRadius: 12, border: '1px solid rgb(1 7 43 / 0.2)', color: '#01072b', padding: '0.8rem 1.25rem', fontFamily: 'ui-monospace, monospace', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', textDecoration: 'none' }}>
              Home page
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}

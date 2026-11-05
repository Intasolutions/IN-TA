import Link from 'next/link';

export default function ArticleNotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-canvas px-4 pb-16 pt-[calc(var(--header-h)+2rem)] text-center text-midnight">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brand-blue sm:text-[11px]">Blog</p>
      <h1 className="heading-section mt-3">This article <span className="heading-accent">isn&apos;t here.</span></h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-midnight/75 sm:text-base">It may have moved or been taken down. Everything we&apos;ve written is on the blog.</p>
      <Link href="/blog" className="kinetic-cta-btn mt-6 rounded-xl bg-brand-blue px-5 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-white hover:bg-midnight">
        All articles
      </Link>
    </main>
  );
}

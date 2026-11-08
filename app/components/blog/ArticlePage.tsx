'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Icon from '../Icon';
import { usePlayIntro } from '../../context/usePlayIntro';
import { refreshSoon } from '../services/detail/refresh';
import { splitAccent } from '../services/detail/types';
import BlogCover from './BlogCover';
import { revealCards, useCardHover } from './cardMotion';
import PostCard from './PostCard';
import ProjectForm from './ProjectForm';
import { calm } from './data';
import { ViewAll } from './parts';
import type { Post } from './posts';
import { underHeader } from '../underHeader';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export type Article = Post & {
  html: string; // already made safe on the server
  url: string;
  service: { slug: string; title: string } | null;
};

const RAIL_LABEL = 'font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-midnight/60';
const SHARE = 'blog-wipe inline-flex items-center justify-center rounded-lg border border-midnight/20 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-midnight/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:text-[11px]';

function Share({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', url); // the browser wouldn't let us: the visitor can still copy it by hand
    }
  };
  return (
    <div>
      <p className={RAIL_LABEL}>Share</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <button type="button" onClick={copy} className={SHARE}>
          <span aria-live="polite">{copied ? 'Copied' : 'Copy link'}</span>
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`} target="_blank" rel="noopener noreferrer" className={SHARE}>WhatsApp</a>
        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className={SHARE}>LinkedIn</a>
      </div>
    </div>
  );
}

export default function ArticlePage({ article, related }: { article: Article; related: Post[] }) {
  const rootRef = useRef<HTMLElement>(null);
  const introRef = useRef<gsap.core.Timeline | null>(null);
  const playedRef = usePlayIntro(introRef);
  useCardHover(rootRef);
  const [plain, bright] = splitAccent(article.title);
  // no cover, or its file has gone missing: the words move up, rather than an empty panel taking the first screen
  const [hasCover, setHasCover] = useState(Boolean(article.image));
  // (the same object every render: given a new one, React rewrites the words, and the scroll animation loses hold of them)
  const words = useMemo(() => ({ __html: article.html }), [article.html]);

  useGSAP(
    () => {
      if (calm()) return;
      introRef.current = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-article="in"]', { y: 22, autoAlpha: 0, duration: 1, stagger: 0.09 }, 0.05);
      // the cover, when the post has one
      const cover = rootRef.current?.querySelector('[data-article="cover"]');
      if (cover) introRef.current.from(cover, { y: 36, autoAlpha: 0, duration: 1.2 }, 0.25);
      if (playedRef.current) introRef.current.progress(1);

      const scrub = window.matchMedia('(pointer: fine)').matches ? true : 0.3;
      const body = rootRef.current!.querySelector<HTMLElement>('[data-article="body"]')!;
      gsap.fromTo('[data-article="progress"]', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: body, start: 'top 45%', end: 'bottom 85%', scrub: 0.2 } });
      // The title drifts up and away, and the cover draws back, as the reading starts
      gsap.fromTo('[data-article="head"]', { y: 0, autoAlpha: 1 }, { y: -30, autoAlpha: 0.2, ease: 'none', scrollTrigger: { trigger: '[data-article="head"]', start: underHeader(), end: 'bottom top', scrub: true } });
      gsap.utils.toArray<HTMLElement>('[data-article="frame"]').forEach((frame) => {
        gsap.fromTo(frame, { scale: 1 }, { scale: 0.95, ease: 'none', scrollTrigger: { trigger: frame, start: 'top 8%', end: 'bottom top', scrub: true } });
      });
      // The words brighten as the reader reaches them, a line of a list at a time; a heading comes in from the side and its rule draws out
      const parts = gsap.utils.toArray<HTMLElement>(body.children).flatMap((part) => (/^[UO]L$/.test(part.tagName) ? gsap.utils.toArray<HTMLElement>(part.children) : [part]));
      parts.forEach((part) => {
        const heading = /^H[2-4]$/.test(part.tagName);
        gsap.fromTo(
          part,
          heading ? { x: -28, autoAlpha: 0.2, '--rule': 0 } : { y: 26, autoAlpha: 0.2 },
          { ...(heading ? { x: 0, '--rule': 1 } : { y: 0 }), autoAlpha: 1, ease: 'none', scrollTrigger: { trigger: part, start: 'top 94%', end: 'top 68%', scrub } },
        );
      });
      gsap.utils.toArray<HTMLElement>('[data-article="rise"]').forEach((row) => {
        gsap.fromTo(row, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'sine.out', scrollTrigger: { trigger: row, start: 'top 98%', end: 'top 78%', scrub } });
      });
      revealCards();
      refreshSoon();
    },
    { scope: rootRef },
  );

  return (
    <main ref={rootRef} className="overflow-x-clip bg-canvas text-midnight">
      {/* How far through the article */}
      <div aria-hidden="true" data-article="progress" className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] origin-left scale-x-0 bg-linear-to-r from-brand-blue to-[#7fa6ff]" />

      <article>
        <header className="mx-auto w-full max-w-[1120px] px-4 pt-[calc(var(--header-h)+1.25rem)] sm:px-6 sm:pt-[calc(var(--header-h)+2rem)]">
          <div data-article="head">
          <Link href="/blog" data-article="in" className="group inline-flex items-center gap-2 rounded font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brand-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:text-[11px]">
            <Icon name="arrow_back" className="text-[14px] transition-transform duration-300 group-hover:-translate-x-1" />
            All articles
          </Link>
          <h1 data-article="in" className="heading-section mt-3 text-midnight [overflow-wrap:anywhere] [text-wrap:balance]">
            {plain && <>{plain} </>}<span className="heading-accent">{bright}</span>
          </h1>
          <p data-article="in" className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[10px] uppercase tracking-wider sm:text-[11px]">
            <span className="font-bold text-brand-blue">{article.tag}</span>
            <span aria-hidden="true" className="text-midnight/30">·</span>
            <time dateTime={article.iso} className="text-midnight/70">{article.date}</time>
            <span aria-hidden="true" className="text-midnight/30">·</span>
            <span className="text-midnight/70">{article.minutes} min read</span>
          </p>
          </div>
        </header>

        {hasCover && (
          <figure data-article="cover" className="mx-auto mt-5 w-full max-w-[1120px] px-4 sm:mt-7 sm:px-6">
            <span data-article="frame" className="relative block aspect-[16/9] max-h-[68svh] w-full overflow-hidden rounded-2xl bg-midnight">
              <BlogCover src={article.image} alt={article.alt || article.title} sizes="(min-width: 1120px) 1072px, 100vw" priority onMissing={() => setHasCover(false)} />
            </span>
          </figure>
        )}

        <div className="mx-auto mt-7 grid w-full max-w-[1120px] gap-8 px-4 sm:mt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-14">
          <div data-article="body" className="blog-prose min-w-0 max-w-[720px]" dangerouslySetInnerHTML={words} />
          <aside data-article="rise" className="space-y-6 self-start border-t border-brand-blue/15 pt-6 lg:sticky lg:top-8 lg:border-t-0 lg:pt-1">
            <Share title={article.title} url={article.url} />
            {article.service && (
              <div>
                <p className={RAIL_LABEL}>Related service</p>
                <Link href={`/services/${article.service.slug}`} className="group relative mt-2.5 flex items-center justify-between gap-3 overflow-hidden rounded-xl bg-midnight p-4 text-white transition-colors duration-300 hover:bg-brand-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
                  <span aria-hidden="true" className="blog-sheen" />
                  <span className="min-w-0 font-display text-[15px] font-bold leading-tight tracking-tight">{article.service.title}</span>
                  <Icon name="north_east" className="shrink-0 text-[16px] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>
            )}
          </aside>
        </div>
      </article>

      {related.length > 0 && (
        <section aria-labelledby="keep-reading" className="mx-auto mt-10 w-full max-w-[1520px] px-4 sm:mt-14 sm:px-6">
          <div data-article="rise" className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brand-blue sm:text-[11px] sm:tracking-[0.3em]">
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current" />
                Blog {'//'} Keep reading
              </p>
              <h2 id="keep-reading" className="heading-section mt-2.5 text-midnight">More to <span className="heading-accent">read.</span></h2>
            </div>
            <div className="shrink-0"><ViewAll /></div>
          </div>
          {/* (three in a row, two where only two fit evenly) */}
          <div className="mt-5 grid gap-5 sm:mt-7 sm:grid-cols-2 sm:max-md:[&>*:nth-child(3)]:hidden md:grid-cols-3 lg:gap-6">
            {related.map((p) => (
              <PostCard key={p.id} post={p} level="h3" />
            ))}
          </div>
        </section>
      )}

      <div className="mx-auto w-full max-w-[1520px] px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-14">
        <ProjectForm />
      </div>
    </main>
  );
}

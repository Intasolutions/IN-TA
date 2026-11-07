'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Icon from '../Icon';
import { usePlayIntro } from '../../context/usePlayIntro';
import { refreshSoon } from '../services/detail/refresh';
import BlogCover from './BlogCover';
import { revealCards, useCardHover } from './cardMotion';
import PostCard from './PostCard';
import ProjectForm from './ProjectForm';
import { calm } from './data';
import { shimmer } from './parts';
import { useText } from '../../site/SiteContext';
import { accent } from '../../site/site';
import { apiBase, hasTopic, sharedTopics, toPost, type ApiPost, type Post } from './posts';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const PER_PAGE = 9;
const CONTAINER = 'mx-auto w-full max-w-[1520px] px-4 sm:px-6';
const GRID = 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6';
const CARD_FRAME = 'rounded-2xl border border-midnight/10 bg-white';

/** The newest post, across the full width */
function FeaturedPost({ post }: { post: Post }) {
  return (
    <article data-blog="lead" className="group relative">
      <div data-tilt="1.5" className={`relative grid overflow-hidden transition-[border-color,box-shadow] duration-300 group-hover:border-brand-blue/40 group-hover:shadow-[0_30px_60px_-28px_rgb(1_7_43/0.45)] md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] ${CARD_FRAME}`}>
      <span className="relative block aspect-[3/2] overflow-hidden bg-midnight md:aspect-auto md:min-h-[clamp(20rem,30vw,28rem)]">
        <BlogCover src={post.image} alt={post.alt} sizes="(min-width: 1520px) 830px, (min-width: 768px) 55vw, 100vw" priority zoom="group-hover:scale-[1.03]" />
        <span aria-hidden="true" className="blog-sheen" />
      </span>
      <div className="flex flex-col justify-center p-5 sm:p-8 xl:p-12">
        <p className="flex flex-wrap items-center gap-x-2 font-mono text-[10px] uppercase tracking-wider sm:text-[11px]">
          <span className="font-bold text-brand-blue">Latest article</span>
          <span aria-hidden="true" className="text-midnight/30">·</span>
          <span className="max-w-full truncate text-midnight/70">{post.tag}</span>
        </p>
        <h2 className="mt-3 font-display text-[clamp(1.5rem,2.4vw,2.375rem)] font-bold leading-[1.12] tracking-tight text-midnight transition-colors duration-300 group-hover:text-brand-blue">
          <Link href={post.href} className="rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
            <span className="blog-underline">{post.title}</span>
          </Link>
        </h2>
        <p className="mt-3 line-clamp-4 text-[15px] leading-relaxed text-midnight/75 sm:text-base">{post.excerpt}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-midnight/60 sm:text-[11px]">
            <time dateTime={post.iso}>{post.date}</time> · {post.minutes} min read
          </p>
          <span aria-hidden="true" className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-brand-blue sm:text-xs">
            Read article
            <Icon name="arrow_forward" className="text-[16px] transition-transform duration-300 group-hover:translate-x-1.5" />
          </span>
        </div>
      </div>
      <span data-spot aria-hidden="true" className="blog-spot" />
      <Link href={post.href} aria-hidden="true" tabIndex={-1} className="absolute inset-0 z-[2]" />
      </div>
    </article>
  );
}

function Loading() {
  return (
    <div aria-hidden="true">
      <div className={`aspect-[3/2] rounded-2xl md:aspect-[3/1] ${shimmer}`} />
      <div className={`mt-5 lg:mt-6 ${GRID}`}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={`aspect-[4/3] rounded-2xl ${shimmer}`} />
        ))}
      </div>
    </div>
  );
}

export default function BlogIndex({ initial }: { initial: Post[] }) {
  const t = useText();
  const [titlePlain, titleBright] = accent(t('blog_title'));
  const rootRef = useRef<HTMLElement>(null);
  const introRef = useRef<gsap.core.Timeline | null>(null);
  const playedRef = usePlayIntro(introRef);
  useCardHover(rootRef);
  const [posts, setPosts] = useState(initial);
  const [failed, setFailed] = useState(false);
  const [topic, setTopic] = useState('');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PER_PAGE);

  // Our API host can be asleep when the page is built: if nothing came through, ask again from here
  const empty = posts.length === 0;
  useEffect(() => {
    if (!empty) return;
    const stop = new AbortController();
    fetch(`${apiBase()}/api/blog/posts/`, { signal: stop.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => setPosts(((Array.isArray(data) ? data : data.results ?? []) as ApiPost[]).map(toPost)))
      .catch((err) => {
        if (err?.name !== 'AbortError') setFailed(true);
      });
    return () => stop.abort();
  }, [empty]);

  const topics = useMemo(() => sharedTopics(posts, 6), [posts]);
  const query = search.trim().toLowerCase();
  const shown = useMemo(
    () =>
      posts.filter(
        (p) =>
          (!topic || hasTopic(p, topic)) &&
          (!query || `${p.title} ${p.excerpt} ${p.tags.join(' ')}`.toLowerCase().includes(query)),
      ),
    [posts, topic, query],
  );
  // The newest gets the full width until the visitor is looking for something; then it's a plain list of what they asked for
  const looking = Boolean(topic || query);
  const featured = looking ? null : shown[0] ?? null;
  const rest = looking ? shown : shown.slice(1);
  const cards = rest.slice(0, limit);
  const cardKey = cards.map((c) => c.id).join();

  const pick = (next: string) => {
    setTopic(next);
    setLimit(PER_PAGE);
  };
  const clear = () => {
    setTopic('');
    setSearch('');
    setLimit(PER_PAGE);
  };

  // ---- The opening, once ----
  useGSAP(
    () => {
      if (calm()) return;
      introRef.current = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-blog="kicker"]', { y: 10, autoAlpha: 0, duration: 0.7 }, 0)
        .from('[data-blog="word"]', { y: 44, autoAlpha: 0, duration: 1.2, stagger: 0.14 }, 0.1)
        .from('[data-blog="in"]', { y: 16, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.35)
        .from('[data-blog="lead"]', { y: 30, autoAlpha: 0, duration: 1 }, 0.45);
      if (playedRef.current) introRef.current.progress(1);
      // the heading drifts up and away as the articles come up over it
      gsap.fromTo('[data-blog="head"]', { y: 0, autoAlpha: 1 }, { y: -30, autoAlpha: 0.2, ease: 'none', scrollTrigger: { trigger: '[data-blog="head"]', start: 'top 12%', end: 'bottom top', scrub: true } });
    },
    { scope: rootRef },
  );

  // ---- With the scroll, and back when it goes back: the featured article recedes as the cards arrive over it ----
  useGSAP(
    () => {
      if (calm()) return;
      revealCards();
      gsap.utils.toArray<HTMLElement>('[data-blog="recede"]').forEach((el) => {
        gsap.fromTo(el, { scale: 1, autoAlpha: 1 }, { scale: 0.95, autoAlpha: 0.3, ease: 'none', scrollTrigger: { trigger: el, start: 'bottom 62%', end: 'bottom 8%', scrub: true } });
      });
      refreshSoon();
    },
    { scope: rootRef, dependencies: [cardKey, featured?.id], revertOnUpdate: true },
  );

  return (
    <main ref={rootRef} className="overflow-x-clip bg-canvas text-midnight">
      <section aria-labelledby="blog-title" className={`${CONTAINER} pb-5 pt-[calc(var(--header-h)+1.5rem)] sm:pb-6 sm:pt-[calc(var(--header-h)+2.5rem)]`}>
        <div data-blog="head" className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:items-end lg:gap-10">
          <div>
            <p data-blog="kicker" className="inline-flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brand-blue sm:text-[11px] sm:tracking-[0.3em]">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current" />
              {t('blog_kicker')}
            </p>
            <h1 id="blog-title" className="heading-page mt-2.5 text-midnight sm:mt-3">
              <span data-blog="word" className="inline-block">{titlePlain}</span>{' '}
              <span data-blog="word" className="heading-accent heading-serif">{titleBright}</span>
            </h1>
          </div>
          <p data-blog="in" className="text-[15px] leading-relaxed text-midnight/80 [text-wrap:balance] sm:text-lg lg:pb-3 lg:text-right">
            {t('blog_text')}
          </p>
        </div>

        {/* Find something */}
        <div data-blog="in" className="mt-5 flex flex-col gap-3 border-y border-midnight/10 py-3 sm:mt-7 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          {topics.length > 0 && (
            <div role="group" aria-label="Show only" className="-mx-4 flex min-w-0 gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
              {[{ label: '', uses: posts.length }, ...topics].map((t) => (
                <button key={t.label || 'all'} type="button" aria-pressed={topic === t.label} onClick={() => pick(t.label)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:text-[11px] ${topic === t.label ? 'border-midnight bg-midnight text-white' : 'blog-wipe border-midnight/20 text-midnight/80'}`}>
                  {t.label || 'All'} <span className="font-normal opacity-60">{t.uses}</span>
                </button>
              ))}
            </div>
          )}
          <label className="group/search relative block w-full shrink-0 transition-[width] duration-300 ease-out lg:w-72 lg:focus-within:w-96">
            <span className="sr-only">Search articles</span>
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-midnight/50 transition-colors duration-300 group-focus-within/search:text-brand-blue" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setLimit(PER_PAGE);
              }}
              placeholder="Search articles"
              className="h-10 w-full rounded-lg border border-midnight/15 bg-white pl-9 pr-3 text-base text-midnight outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-midnight/50 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 sm:text-sm"
            />
          </label>
        </div>
      </section>

      <div className={`${CONTAINER} pb-10 sm:pb-14`}>
        {failed && empty ? (
          <p className={`p-8 text-center text-midnight/80 ${CARD_FRAME}`}>Our articles are taking a moment to load. Please refresh the page in a little while.</p>
        ) : empty ? (
          <Loading />
        ) : shown.length === 0 ? (
          <div className={`p-8 text-center sm:p-12 ${CARD_FRAME}`}>
            <p className="text-midnight/80">No articles match that yet.</p>
            <button type="button" onClick={clear} className="mt-3 rounded font-mono text-xs font-bold uppercase tracking-wider text-brand-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
              Show all articles
            </button>
          </div>
        ) : (
          <>
            {looking && (
              <p aria-live="polite" className="mb-4 font-mono text-[10px] uppercase tracking-wider text-midnight/70 sm:text-[11px]">
                {shown.length} article{shown.length === 1 ? '' : 's'}
                {topic && <> on {topic}</>}
                {query && <> matching &ldquo;{search.trim()}&rdquo;</>}
              </p>
            )}
            {featured && (
              <div data-blog="recede">
                <FeaturedPost post={featured} />
              </div>
            )}
            {cards.length > 0 && (
              <section aria-label="More articles" className={`${featured ? 'mt-5 lg:mt-6' : ''} ${GRID}`}>
                {cards.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </section>
            )}
            {cards.length < rest.length && (
              <div className="mt-7 flex flex-col items-center gap-2.5 sm:mt-9">
                <p className="font-mono text-[10px] uppercase tracking-wider text-midnight/60 sm:text-[11px]">
                  Showing {cards.length + (featured ? 1 : 0)} of {shown.length}
                </p>
                <button type="button" onClick={() => setLimit((n) => n + PER_PAGE)} className="kinetic-cta-btn group inline-flex items-center justify-center gap-3 rounded-xl bg-brand-blue px-6 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-white hover:bg-midnight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
                  Load more articles
                  <Icon name="south" className="text-[16px] transition-transform duration-300 group-hover:translate-y-0.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className={`${CONTAINER} pb-10 sm:pb-14`}>
        <ProjectForm />
      </div>
    </main>
  );
}

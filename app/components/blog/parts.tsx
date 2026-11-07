import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import Icon from '../Icon';
import { STATIC_GRADIENT } from '../testimonials/data';
import type { Post } from './data';
import { useText } from '../../site/SiteContext';
import { accent } from '../../site/site';

/** Section heading shared by the Blog designs. Reveal targets: [data-bh="kicker" | "word" | "copy"]. */
export function BlogHead({ id, action }: { id: string; action?: ReactNode }) {
  const t = useText();
  const [plain, bright] = accent(t('home_blog_title'));
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        <span data-bh="kicker" className="inline-flex items-center gap-3 font-mono text-[11px] text-brand-blue tracking-[0.3em] uppercase font-bold mb-3">
          <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
          {t('home_blog_kicker')}
        </span>
        <h2 id={id} className="font-display font-extrabold text-[length:clamp(2.25rem,5vw,3.5rem)] leading-[1] text-midnight tracking-tight uppercase">
          <span className="inline-block overflow-hidden align-bottom pb-[0.06em]"><span data-bh="word" className="inline-block">{plain}</span></span>{' '}
          <span className="inline-block overflow-hidden align-bottom pb-[0.06em]"><span data-bh="word" className={`inline-block pb-[0.06em] ${STATIC_GRADIENT}`}>{bright}</span></span>
        </h2>
        <p data-bh="copy" className="mt-4 text-midnight/80 text-sm sm:text-base leading-relaxed max-w-lg">
          {t('home_blog_text')}
        </p>
      </div>
      {action && <div data-bh="copy" className="shrink-0">{action}</div>}
    </div>
  );
}

/** "View all articles" button (animate a wrapper around it, never the button itself). */
export function ViewAll({ label = 'View all articles' }: { label?: string }) {
  return (
    <Link
      href="/blog"
      className="kinetic-cta-btn group inline-flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-brand-blue hover:bg-midnight text-white font-mono text-xs uppercase tracking-wider font-semibold active:scale-[0.97]"
    >
      <span>{label}</span>
      <Icon name="arrow_outward" className="text-[16px] transition-transform duration-300 group-hover:rotate-45" />
    </Link>
  );
}

/**
 * Cover image that never crops: the whole picture sits on a blurred, enlarged copy of itself, so covers of any
 * shape fill the frame. Size the frame with the parent; zoom on hover with `zoom` classes (e.g. group-hover:scale-105).
 */
export function Cover({ post, sizes, zoom = '', priority = false }: { post: Post; sizes: string; zoom?: string; priority?: boolean }) {
  if (!post.image) {
    return (
      <span className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-midnight via-[#0a2a80] to-brand-blue">
        <Icon name="article" className="text-[44px] text-white/25" />
      </span>
    );
  }
  return (
    <>
      <Image src={post.image} alt="" fill sizes={sizes} aria-hidden="true" className="object-cover scale-125 blur-2xl saturate-150" />
      <span className={`absolute inset-0 transition-transform duration-700 ease-out ${zoom}`}>
        <Image src={post.image} alt={post.alt} fill sizes={sizes} priority={priority} className="object-contain" />
      </span>
    </>
  );
}

/** Shown while the posts load, or if they don't */
export function PostsFallback({ failed, children }: { failed: boolean; children: ReactNode }) {
  if (!failed) return <>{children}</>;
  return (
    <div className="rounded-3xl border border-brand-blue/20 bg-white p-8 sm:p-10 text-center">
      <p className="text-midnight/80">Our latest articles are taking a moment to load.</p>
      <Link href="/blog" className="mt-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider font-bold text-brand-blue">
        Open the blog <Icon name="arrow_outward" className="text-[16px]" />
      </Link>
    </div>
  );
}

export const shimmer = 'animate-pulse bg-brand-blue/[0.07]';

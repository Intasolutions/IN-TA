'use client';

import Link from 'next/link';
import Icon from '../Icon';
import BlogCover from './BlogCover';
import type { Post } from './posts';

const SIZES = '(min-width: 1520px) 480px, (min-width: 1024px) 32vw, (min-width: 640px) 50vw, 100vw';

/** One post as a card, all the same shape so that a grid of them lines up. The whole card is the link */
export default function PostCard({ post, level = 'h2' }: { post: Post; level?: 'h2' | 'h3' }) {
  const Title = level;
  return (
    <article data-blog="rise" className="group relative h-full">
      <div data-tilt="5" className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-midnight/10 bg-white transition-[border-color,box-shadow] duration-300 group-hover:border-brand-blue/40 group-hover:shadow-[0_24px_48px_-22px_rgb(1_7_43/0.45)]">
        <span className="relative block aspect-[3/2] shrink-0 overflow-hidden bg-midnight">
          <BlogCover src={post.image} alt="" sizes={SIZES} zoom="group-hover:scale-[1.05]" />
          <span aria-hidden="true" className="blog-sheen" />
          {/* wiped away by the scroll as the card arrives */}
          <span data-card="curtain" aria-hidden="true" className="absolute inset-0 origin-top scale-y-0 bg-linear-to-b from-midnight to-[#0a2a80]" />
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-linear-to-r from-brand-blue to-[#7fa6ff] transition-transform duration-500 ease-out group-hover:scale-x-100" />
        </span>
        <div data-card="text" className="flex flex-1 flex-col p-5">
          <p className="truncate font-mono text-[10px] font-bold uppercase tracking-wider text-brand-blue sm:text-[11px]">{post.tag}</p>
          <Title className="mt-2 font-display text-lg font-bold leading-[1.25] tracking-tight text-midnight transition-colors duration-300 group-hover:text-brand-blue xl:text-xl">
            <Link href={post.href} className="line-clamp-3 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
              <span className="blog-underline">{post.title}</span>
            </Link>
          </Title>
          <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-midnight/70">{post.excerpt}</p>
          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
            <p className="relative min-w-0 flex-1 overflow-hidden font-mono text-[10px] uppercase leading-[1.5] tracking-wider sm:text-[11px]">
              <span className="block truncate text-midnight/60 transition-transform duration-300 ease-out group-hover:-translate-y-full">
                <time dateTime={post.iso}>{post.date}</time> · {post.minutes} min read
              </span>
              <span aria-hidden="true" className="absolute inset-x-0 top-full block truncate font-bold text-brand-blue transition-transform duration-300 ease-out group-hover:-translate-y-full">Read article</span>
            </p>
            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-blue/25 text-brand-blue transition-[background-color,color,border-color,rotate,scale] duration-300 group-hover:-rotate-45 group-hover:scale-110 group-hover:border-brand-blue group-hover:bg-brand-blue group-hover:text-white">
              <Icon name="arrow_forward" className="text-[16px]" />
            </span>
          </div>
        </div>
        <span data-spot aria-hidden="true" className="blog-spot" />
        {/* the whole card opens the post (hidden from keyboards and screen readers: they have the title's link) */}
        <Link href={post.href} aria-hidden="true" tabIndex={-1} className="absolute inset-0 z-[2]" />
      </div>
    </article>
  );
}

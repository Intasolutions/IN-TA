'use client';

import { useState } from 'react';
import Image from 'next/image';
import Icon from '../Icon';
import { optimisable } from '../portfolio/data';

type Props = {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  zoom?: string;
  onMissing?: () => void; // for a frame that would rather disappear than show the plain panel
};

/**
 * A post's cover, never cropped: the whole picture sits on a blurred copy of itself, so covers of any shape fill the
 * frame sharply. A post with no cover, or whose file has gone missing, gets a plain panel instead of a broken image.
 * Size the frame with the parent.
 */
export default function BlogCover({ src, alt, sizes, priority = false, zoom = '', onMissing }: Props) {
  const [broken, setBroken] = useState(false);
  const missing = () => {
    setBroken(true);
    onMissing?.();
  };
  if (!src || broken) {
    return (
      <span className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-midnight via-[#0a2a80] to-brand-blue">
        <Icon name="article" className="text-[clamp(1.75rem,5vw,3rem)] text-white/30" />
      </span>
    );
  }
  const direct = !optimisable(src);
  return (
    <>
      <Image src={src} alt="" aria-hidden="true" fill sizes="96px" unoptimized={direct} onError={missing} className="scale-125 object-cover blur-2xl saturate-150" />
      <span className={`absolute inset-0 transition-transform duration-700 ease-out ${zoom}`}>
        <Image src={src} alt={alt} fill sizes={sizes} quality={90} priority={priority} unoptimized={direct} onError={missing} className="object-contain" />
      </span>
    </>
  );
}

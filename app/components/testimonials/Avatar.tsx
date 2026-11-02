import Image from 'next/image';
import { initials, type Testimonial } from './data';

/** Client photo (or initials when there isn't one). Size it with w-/h- classes. */
export default function Avatar({ t, className = '', sizes = '64px' }: { t: Testimonial; className?: string; sizes?: string }) {
  return (
    <span className={`relative shrink-0 overflow-hidden rounded-full bg-canvas border border-brand-blue/20 ${className}`}>
      {t.avatar ? (
        <Image src={t.avatar} alt="" fill sizes={sizes} className="object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-brand-blue">{initials(t.name)}</span>
      )}
    </span>
  );
}

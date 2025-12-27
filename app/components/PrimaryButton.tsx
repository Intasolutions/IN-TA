// app/components/PrimaryButton.tsx
'use client';

import React from 'react';
import Link from 'next/link';

type Props = {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  small?: boolean;
  outline?: boolean;
  className?: string;
};

export default function PrimaryButton({ href, onClick, children, small, outline, className = '' }: Props) {
  const base = `btn-cta ${outline ? 'btn-outline' : 'primary-cta'} ${small ? 'btn-small' : ''} ${className}`;
  if (href) {
    return (
      <Link href={href} className={base} aria-label={typeof children === 'string' ? children : undefined}>
        <span>{children}</span>
        <svg className="cta-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={base}>
      <span>{children}</span>
      <svg className="cta-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

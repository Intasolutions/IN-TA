import Link from 'next/link';

export type NavLink = { name: string; href: string };

/**
 * The header's page links: plain text, nothing behind them. The page you're on is blue and underlined; pointing at
 * another link darkens it and draws a faint underline in from the left.
 */
export default function MainNav({ links, current }: { links: NavLink[]; current: number }) {
  return (
    <nav aria-label="Main" className="hidden lg:flex items-center gap-1 xl:gap-2">
      {links.map((link, i) => {
        const on = i === current;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={on ? 'page' : undefined}
            className={`group relative rounded-md px-3 py-2.5 font-mono text-[12px] font-semibold uppercase tracking-wider whitespace-nowrap transition-colors duration-200
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue
              ${on ? 'text-brand-blue' : 'text-midnight/70 hover:text-midnight'}`}
          >
            {link.name}
            <span
              aria-hidden="true"
              className={`absolute inset-x-3 bottom-1 h-[2px] origin-left rounded-full transition-[scale,background-color] duration-300 ease-out motion-reduce:transition-none
                ${on ? 'scale-x-100 bg-brand-blue' : 'scale-x-0 bg-midnight/25 group-hover:scale-x-100 group-focus-visible:scale-x-100'}`}
            />
          </Link>
        );
      })}
    </nav>
  );
}

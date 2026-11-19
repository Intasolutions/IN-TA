'use client';

// The floating "Chat on WhatsApp" button, bottom left on every page (the robot's chat button has the bottom right). The
// chat opens with a message written for the page it was opened from (Page wording > WhatsApp messages), and the number
// is Site settings' WhatsApp number, or the phone number when that's empty.
// It steps aside where [data-floating-clear] is on screen (the footer's back-to-top row; the hero's buttons only on the
// screens named by data-whatsapp-clear, where they run the full width), so it never covers them.
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSite, useText } from '../site/SiteContext';
import { whatsappDigits } from '../site/site';
import { useWhatsAppTopic, whatsappLink, whatsappMessage } from './whatsappTopic';

export default function WhatsAppButton() {
  const site = useSite();
  const t = useText();
  const pathname = usePathname();
  const topic = useWhatsAppTopic();
  const href = whatsappLink(whatsappDigits(site), whatsappMessage(site, pathname, topic));
  const label = t('whatsapp_button');
  const [tuckedOn, setTuckedOn] = useState<string | null>(null);
  const tucked = tuckedOn === pathname;

  useEffect(() => {
    const targets = [...document.querySelectorAll<HTMLElement>('[data-floating-clear]')];
    if (!targets.length) return;
    const applies = (el: HTMLElement) => !el.dataset.whatsappClear || window.matchMedia(el.dataset.whatsappClear).matches;
    const seen = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting && applies(e.target as HTMLElement) ? seen.add(e.target) : seen.delete(e.target)));
      setTuckedOn(seen.size ? pathname : null);
    });
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-whatsapp=""
      aria-label={label}
      title={label}
      inert={tucked}
      className={`group fixed z-[9996] bottom-4 left-4 md:bottom-6 md:left-6 flex items-center gap-2.5 h-[52px] rounded-full bg-[#25D366] text-white
        shadow-[0_12px_30px_-8px_rgba(18,140,126,0.55)] ring-1 ring-black/5 pl-[13px] pr-[13px] md:pr-5
        transition-[transform,opacity,background-color,box-shadow] duration-300 ease-out hover:bg-[#1fbe5b] hover:shadow-[0_16px_36px_-8px_rgba(18,140,126,0.65)] active:scale-95
        focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#128C7E] motion-reduce:transition-none
        ${tucked ? 'opacity-0 translate-y-6 pointer-events-none' : 'opacity-100'}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="w-[26px] h-[26px] shrink-0 fill-current">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      {/* the words show from tablets up; on phones the round button is the familiar WhatsApp mark */}
      <span className="hidden md:inline text-[14px] font-semibold tracking-[0.01em] whitespace-nowrap">{label}</span>
    </a>
  );
}

'use client';

// What the visitor is looking at, for the WhatsApp button's ready-written message: a page that is about one service
// (a service's page) or one blog post (with its related service, when it has one) says so with <WhatsAppTopic />.
// Every other page is recognised from its address.
import { useEffect, useSyncExternalStore } from 'react';
import { textOf, type Site } from '../site/site';

type Topic = { path: string; service?: string; post?: string };

let current: Topic | null = null;
const listeners = new Set<() => void>();
const publish = (topic: Topic | null) => {
  current = topic;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The page's subject, as its page reported it (null on pages that don't, and before it has) */
export const useWhatsAppTopic = () => useSyncExternalStore(subscribe, () => current, () => null);

/** Tells the WhatsApp button what this page is about, while the page is on screen */
export function WhatsAppTopic({ service, post }: { service?: string | null; post?: string | null }) {
  useEffect(() => {
    const topic: Topic = { path: window.location.pathname, service: service?.trim() || undefined, post: post?.trim() || undefined };
    publish(topic);
    return () => {
      if (current === topic) publish(null);
    };
  }, [service, post]);
  return null;
}

/** The message a chat opened from this page starts with (from the admin's Page wording: WhatsApp messages) */
export function whatsappMessage(site: Site, pathname: string, topic: Topic | null): string {
  const path = (pathname.replace(/\/+$/, '') || '/').toLowerCase();
  // only what this page reported: a topic left over from the page before is ignored
  const here = topic && topic.path.replace(/\/+$/, '').toLowerCase() === path ? topic : null;

  if (here?.post) {
    return here.service
      ? textOf(site, 'whatsapp_post_service', { post: here.post, service: here.service })
      : textOf(site, 'whatsapp_post', { post: here.post });
  }
  if (path.startsWith('/services/')) {
    // the page's own name for itself, or the service's name from Services while the page is still arriving
    const slug = decodeURIComponent(path.slice('/services/'.length));
    const service = here?.service || site.services.find((s) => s.slug.toLowerCase() === slug)?.title;
    return service ? textOf(site, 'whatsapp_service', { service }) : textOf(site, 'whatsapp_services');
  }
  const page: Record<string, string> = {
    '/services': 'whatsapp_services',
    '/portfolio': 'whatsapp_portfolio',
    '/blog': 'whatsapp_blog',
    '/about': 'whatsapp_about',
    '/contact': 'whatsapp_contact',
  };
  return textOf(site, page[path] ?? 'whatsapp_home');
}

/** A link that opens a chat with the office, with the message ready to send (the visitor can still change it) */
export const whatsappLink = (phoneDigits: string, message: string) =>
  `https://wa.me/${phoneDigits}${message.trim() ? `?text=${encodeURIComponent(message.trim())}` : ''}`;

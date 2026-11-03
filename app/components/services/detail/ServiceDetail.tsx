'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Icon from '../../Icon';
import ProjectForm from '../../blog/ProjectForm';
import { ALL_BLOCKS, LINKS, type Block } from '../floorplan';
import Gallery from './Gallery';
import PartStage, { partsFor, slugOf, Title } from './PartStage';
import Pinout from './Pinout';
import { optimisable, type DetailService, type RelatedService } from './types';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const FORM_ID = 'start-project';
const CONTAINER = 'mx-auto w-full max-w-[1520px] px-4 sm:px-6';
const SHOWN_BENEFITS = 6;

// The enquiry form's options, for the services that have one
const FORM_INTEREST: Record<string, string> = {
  'web-development': 'Web Development',
  'mobile-app': 'Mobile App Development',
  'ui-ux-design': 'UI/UX Design Strategy',
  'software-development': 'Enterprise Web Solutions',
};

function Head({ kicker, plain, bright, light = false }: { kicker: string; plain: string; bright: string; light?: boolean }) {
  return (
    <div data-rv>
      <p className={`inline-flex items-center gap-3 font-mono text-[10px] sm:text-[11px] tracking-[0.2em] sm:tracking-[0.3em] uppercase font-bold ${light ? 'text-[#9dbbff]' : 'text-brand-blue'}`}>
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current animate-pulse" />
        {kicker}
      </p>
      <h2 className={`heading-section mt-2.5 ${light ? 'text-white' : 'text-midnight'}`}>
        {plain} <span className={light ? 'heading-accent-dark' : 'heading-accent'}>{bright}</span>
      </h2>
    </div>
  );
}

const paragraphsOf = (text: string) => text.split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean);

function About({ service }: { service: DetailService }) {
  const [more, setMore] = useState(false);
  const [ratio, setRatio] = useState(16 / 9);
  const paragraphs = paragraphsOf(service.long || service.short);
  const long = (service.long || '').length > 620;
  return (
    <section aria-label="What it does" className="py-10 sm:py-16">
      <div className={`${CONTAINER} grid items-start gap-7 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12`}>
        {service.image && (
          <div className="lg:sticky lg:top-28">
            <div data-wipe className="relative overflow-hidden rounded-3xl border border-brand-blue/15 bg-midnight shadow-xl shadow-brand-blue/10" style={{ aspectRatio: String(Math.max(ratio, 1.1)) }}>
              <Image
                src={service.image}
                alt={service.imageAlt}
                fill
                sizes="(min-width: 1024px) 58vw, 100vw"
                quality={90}
                unoptimized={!optimisable(service.image)}
                className="object-contain"
                onLoad={(e) => {
                  const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                  if (w && h) setRatio(w / h);
                  ScrollTrigger.refresh();
                }}
              />
            </div>
          </div>
        )}
        <div className={service.image ? '' : 'lg:col-span-2 max-w-3xl'}>
          <Head kicker="What it does // In detail" plain="What it" bright="does." />
          <div data-rv className={`relative mt-4 space-y-3.5 overflow-hidden text-[15px] sm:text-lg leading-relaxed text-midnight/85 ${long && !more ? 'max-h-[19rem]' : ''}`}>
            {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            {long && !more && <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-white to-transparent" />}
          </div>
          {long && (
            <button
              type="button"
              aria-expanded={more}
              onClick={() => {
                setMore((v) => !v);
                window.setTimeout(() => ScrollTrigger.refresh(), 60);
              }}
              className="mt-3 inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-brand-blue underline underline-offset-4 hover:text-midnight"
            >
              {more ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function Benefits({ service }: { service: DetailService }) {
  const [all, setAll] = useState(false);
  const shown = all ? service.benefits : service.benefits.slice(0, SHOWN_BENEFITS);
  return (
    <section aria-label="What you get" className="bg-canvas py-10 sm:py-16">
      <div className={CONTAINER}>
        <Head kicker="What you get // The result" plain="What you" bright="get." />
        <ul className="mt-6 sm:mt-9 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((b) => (
            <li key={b.id} data-rv className="group relative overflow-hidden rounded-2xl border border-brand-blue/20 bg-white p-5 sm:p-6 shadow-sm transition-[border-color,box-shadow,transform] duration-500 hover:-translate-y-1 hover:border-brand-blue/50 hover:shadow-xl hover:shadow-brand-blue/10">
              <span aria-hidden="true" className="absolute inset-x-8 top-0 h-0.5 origin-center scale-x-0 rounded-full bg-linear-to-r from-transparent via-brand-blue to-transparent transition-transform duration-500 group-hover:scale-x-100" />
              <h3 className="heading-sub text-midnight">{b.title}</h3>
              {b.description && <p className="mt-2 text-sm sm:text-[15px] leading-relaxed text-midnight/80">{b.description}</p>}
            </li>
          ))}
        </ul>
        {service.benefits.length > SHOWN_BENEFITS && (
          <button
            type="button"
            aria-expanded={all}
            onClick={() => {
              setAll((v) => !v);
              window.setTimeout(() => ScrollTrigger.refresh(), 60);
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-brand-blue/30 bg-white px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-midnight transition-colors duration-300 hover:border-brand-blue hover:text-brand-blue"
          >
            {all ? 'Show fewer' : `Show all ${service.benefits.length}`}
          </button>
        )}
      </div>
    </section>
  );
}

function Tools({ service }: { service: DetailService }) {
  return (
    <section aria-label="Tools we use" className="py-10 sm:py-16">
      <div className={CONTAINER}>
        <Head kicker="Tools we use // Plugged in" plain="Tools we" bright="use." />
        {/* The sockets hang off one live bus */}
        <div className="relative mt-6 sm:mt-9 pt-4">
          <div aria-hidden="true" className="bus-flow absolute inset-x-0 top-0 h-[3px] rounded-full" />
          <ul className="grid grid-cols-2 gap-x-2.5 gap-y-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
            {service.technologies.map((t) => (
              <li key={t.name} data-rv className="relative">
                <span aria-hidden="true" className="absolute -top-4 left-1/2 h-4 w-[2px] -translate-x-1/2 bg-brand-blue/30" />
                <div className="flex h-full min-h-14 items-center gap-2.5 rounded-xl border border-brand-blue/25 bg-white px-3 py-2 shadow-sm transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-brand-blue hover:shadow-lg hover:shadow-brand-blue/15">
                  {t.logo && (
                    <span className="relative h-8 w-8 shrink-0">
                      <Image src={t.logo} alt="" fill sizes="32px" unoptimized={!optimisable(t.logo)} className="object-contain" />
                    </span>
                  )}
                  <span className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-midnight">{t.name}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Work({ service }: { service: DetailService }) {
  return (
    <section aria-label="Work we've done" className="bg-canvas py-10 sm:py-16">
      <div className={CONTAINER}>
        <Head kicker="Work we've done // Built and live" plain="Work we've" bright="done." />
        <ul className="mt-6 sm:mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {service.projects.map((p) => {
            const body = (
              <>
                <span className="relative block aspect-[2/1] overflow-hidden bg-midnight">
                  {p.hero && <Image src={p.hero} alt="" fill sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" quality={90} unoptimized={!optimisable(p.hero)} className="object-contain transition-transform duration-700 group-hover:scale-[1.03]" />}
                </span>
                <span className="block p-4 sm:p-5">
                  {p.role && <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-brand-blue">{p.role}</span>}
                  <span className="heading-sub mt-1 block text-midnight">{p.title}</span>
                  {p.summary && <span className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-midnight/80">{p.summary}</span>}
                  {p.tags.length > 0 && (
                    <span className="mt-2.5 flex flex-wrap gap-1.5">
                      {p.tags.slice(0, 4).map((t) => <span key={t} className="rounded-md border border-brand-blue/30 bg-canvas px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-brand-blue">{t}</span>)}
                    </span>
                  )}
                </span>
              </>
            );
            const card = 'group block h-full overflow-hidden rounded-2xl border border-brand-blue/20 bg-white shadow-sm transition-[border-color,box-shadow,transform] duration-500 hover:-translate-y-1 hover:border-brand-blue/50 hover:shadow-xl hover:shadow-brand-blue/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue';
            return (
              <li key={p.id} data-rv>
                {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" className={card}>{body}</a> : <Link href="/portfolio" className={card}>{body}</Link>}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Faqs({ service }: { service: DetailService }) {
  const [open, setOpen] = useState(0);
  return (
    <section aria-label="Questions" className="py-10 sm:py-16">
      <div className={`${CONTAINER} grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12`}>
        <Head kicker="Questions // Before you start" plain="Good" bright="questions." />
        <ul className="space-y-2.5">
          {service.faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <li key={f.id} data-rv className={`rounded-2xl border bg-white transition-[border-color,box-shadow] duration-300 ${isOpen ? 'border-brand-blue/50 shadow-lg shadow-brand-blue/10' : 'border-brand-blue/20'}`}>
                <h3>
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)} className="flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
                    <span className="heading-sub text-midnight">{f.question}</span>
                    <Icon name="add" className={`shrink-0 text-[20px] text-brand-blue transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
                  </button>
                </h3>
                <div className={`grid transition-[grid-template-rows] duration-400 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <p className="px-4 pb-4 sm:px-5 sm:pb-5 text-[15px] leading-relaxed text-midnight/85">{f.answer}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Connected({ block, related }: { block: Block; related: RelatedService[] }) {
  const near = LINKS.flatMap((l) => (l.from === block.kind ? [l.to] : l.to === block.kind ? [l.from] : []));
  const parts = near.flatMap((kind) => {
    const b = ALL_BLOCKS.find((x) => x.kind === kind);
    const slug = b && slugOf(b);
    const service = related.find((r) => r.slug === slug);
    return b && service ? [{ b, service }] : [];
  });
  if (!parts.length) return null;
  return (
    <section aria-label="Connected parts" className="bg-canvas py-10 sm:py-16">
      <div className={CONTAINER}>
        <Head kicker="Connected parts // On the same board" plain="It connects" bright="to these." />
        <div className="relative mt-6 sm:mt-9 pt-4">
          <div aria-hidden="true" className="bus-flow absolute inset-x-0 top-0 h-[3px] rounded-full" />
          <ul className={`grid grid-cols-2 gap-2.5 sm:gap-3 ${parts.length === 2 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
            {parts.map(({ b, service }) => (
              <li key={b.id} data-rv className="relative">
                <span aria-hidden="true" className="absolute -top-4 left-8 h-4 w-[2px] bg-brand-blue/30" />
                <Link href={`/services/${service.slug}`} className="group relative block h-full overflow-hidden rounded-2xl border border-[#0a2a80] bg-midnight p-3.5 pb-8 text-white sm:p-5 shadow-lg shadow-brand-blue/15 transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-blue/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue">
                  <span aria-hidden="true" className="absolute left-3 top-3 h-0 w-0 border-t-[9px] border-r-[9px] border-t-white border-r-transparent" />
                  <span className="mt-2 block font-mono text-[10px] font-bold uppercase tracking-wider text-[#9dbbff]">{b.part}</span>
                  <span className="heading-sub mt-1 block text-white">{service.title}</span>
                  {service.short && <span className="mt-2 line-clamp-2 pr-6 text-sm leading-relaxed text-white/80 max-sm:hidden">{service.short}</span>}
                  <Icon name="north_east" className="absolute bottom-3 right-3 text-[18px] text-[#9dbbff] transition-transform sm:bottom-4 sm:right-4 duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </li>
            ))}
            <li data-rv className={`relative ${parts.length % 2 === 0 ? 'max-lg:col-span-2' : ''}`}>
              <span aria-hidden="true" className="absolute -top-4 left-8 h-4 w-[2px] bg-brand-blue/30" />
              <Link href="/services" className="group relative block h-full rounded-2xl border border-brand-blue/30 bg-white p-3.5 pb-8 shadow-sm sm:p-5 transition-[transform,box-shadow,border-color] duration-500 hover:-translate-y-1 hover:border-brand-blue hover:shadow-xl hover:shadow-brand-blue/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue">
                <span className="mt-2 block font-mono text-[10px] font-bold uppercase tracking-wider text-brand-blue">All eight parts</span>
                <span className="heading-sub mt-1 block text-midnight">See the whole board</span>
                <Icon name="north_east" className="absolute bottom-3 right-3 text-[18px] text-brand-blue transition-transform sm:bottom-4 sm:right-4 duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default function ServiceDetail({ service, related }: { service: DetailService; related: RelatedService[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { block, others } = partsFor(service.slug, related);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const scrub = window.matchMedia('(pointer: fine)').matches ? true : 0.3;
      gsap.utils.toArray<HTMLElement>('[data-rv]').forEach((el) => {
        gsap.fromTo(el, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'sine.out', scrollTrigger: { trigger: el, start: 'top 94%', end: 'top 72%', scrub } });
      });
      gsap.utils.toArray<HTMLElement>('[data-wipe]').forEach((el) => {
        gsap.fromTo(el, { clipPath: 'inset(8% 8% 8% 8% round 1.5rem)', scale: 0.97 }, { clipPath: 'inset(0% 0% 0% 0% round 1.5rem)', scale: 1, ease: 'sine.out', scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 50%', scrub } });
      });
      ScrollTrigger.refresh();
    },
    { scope: rootRef, dependencies: [service.slug], revertOnUpdate: true },
  );

  return (
    <main ref={rootRef} className="bg-white text-midnight">
      {block ? (
        <PartStage key={service.slug} service={service} block={block} others={others} formId={FORM_ID} />
      ) : (
        <div className={`${CONTAINER} pt-[calc(var(--header-h)+2rem)] pb-6`}>
          <Title title={service.title} />
          {service.short && <p className="mt-4 max-w-2xl text-[15px] sm:text-lg leading-relaxed text-midnight/85">{service.short}</p>}
        </div>
      )}

      {/* The rest of the page slides up over the board, like a sheet of paper */}
      <div className={`relative z-10 bg-white ${block ? '-mt-[8svh] rounded-t-[2rem] sm:rounded-t-[2.5rem] shadow-[0_-24px_60px_-24px_rgb(1_68_181/0.22)]' : ''}`}>
        <About service={service} />

        {service.features.length > 0 && (
          <section aria-label="What's included" className="mx-2 overflow-hidden rounded-[1.75rem] bg-midnight py-10 sm:mx-4 sm:rounded-[2.5rem] sm:py-16">
            <div className={CONTAINER}>
              <Head kicker="What's included // In this service" plain="What's" bright="included." light />
              <Pinout part={block?.part ?? 'Our service'} name={service.title} features={service.features} />
            </div>
          </section>
        )}

        {service.gallery.length > 0 && (
          <section aria-label="In real use" className="overflow-hidden py-10 sm:py-16">
            <div className={CONTAINER}>
              <Head kicker="In real use // Gallery" plain="In real" bright="use." />
              <div className="mt-6 sm:mt-9">
                <Gallery images={service.gallery} />
              </div>
            </div>
          </section>
        )}

        {service.benefits.length > 0 && <Benefits service={service} />}
        {service.technologies.length > 0 && <Tools service={service} />}
        {service.projects.length > 0 && <Work service={service} />}
        {service.faqs.length > 0 && <Faqs service={service} />}
        {block && <Connected block={block} related={related} />}

        <div id={FORM_ID} className="px-3 sm:px-6 py-8 sm:py-12">
          <div data-rv className="mx-auto max-w-[1400px]">
            <ProjectForm defaultInterest={FORM_INTEREST[service.slug]} />
          </div>
        </div>
      </div>
    </main>
  );
}

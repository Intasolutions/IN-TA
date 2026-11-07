'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import ProjectForm from '../../blog/ProjectForm';
import { scrollToY } from '../../SmoothScroll';
import DieScene, { type DieItem } from './DieScene';
import { BoardMap, Questions, Toolchain } from './Extras';
import Gallery from './Gallery';
import PartStage, { partsFor, Title, type Fact } from './PartStage';
import Pinout from './Pinout';
import { refreshSoon } from './refresh';
import ScrollLit from './ScrollLit';
import { optimisable, plainTitle, splitAccent, wordsFor, type DetailService, type RelatedService } from './types';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const FORM_ID = 'start-project';
const INSIDE_ID = 'overview';
// (on large screens the right edge leaves room for the page's rail)
const CONTAINER = 'mx-auto w-full max-w-[1520px] px-4 sm:px-6 lg:pr-14 xl:pr-16';
const SECTION = 'py-12 sm:py-20';
// A service with no capabilities yet shows this many of its benefits on the die, and the rest in the list after it
const MAX_FROM_BENEFITS = 6;

// The enquiry form's options, for the services that have one
const FORM_INTEREST: Record<string, string> = {
  'web-development': 'Web Development',
  'mobile-app': 'Mobile App Development',
  'ui-ux-design': 'UI/UX Design Strategy',
  'software-development': 'Enterprise Web Solutions',
};

function Head({ kicker, title }: { kicker: string; title: string }) {
  const [plain, bright] = splitAccent(title);
  return (
    <div data-rv>
      <p className="inline-flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9dbbff] sm:text-[11px] sm:tracking-[0.3em]">
        <span aria-hidden="true" className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-current" />
        {kicker}
      </p>
      <h2 className="heading-section mt-2.5 text-white">
        {plain} <span className="heading-accent-dark">{bright}</span>
      </h2>
    </div>
  );
}

type StoryProps = { id: string; kicker: string; title: string; text: string; image: string | null; alt: string; flip?: boolean; children?: React.ReactNode };

/** A description that lights up as it's read, beside a picture that stays in view. The picture is never cropped. */
function Story({ id, kicker, title, text, image, alt, flip = false, children }: StoryProps) {
  const [ratio, setRatio] = useState(16 / 9);
  return (
    <section id={id} aria-label={plainTitle(title)} className={SECTION}>
      <div className={`${CONTAINER} grid items-start gap-7 lg:gap-14 ${flip ? 'lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]' : 'lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]'}`}>
        <div className={image ? '' : 'max-w-4xl lg:col-span-2'}>
          <Head kicker={kicker} title={title} />
          <div className="mt-4 sm:mt-6"><ScrollLit text={text} /></div>
          {children}
        </div>
        {image && (
          <div className={`lg:sticky lg:top-24 ${flip ? 'lg:order-first' : ''}`}>
            <div data-wipe className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#040c38] shadow-[0_30px_90px_-30px_rgb(59_123_247/0.8)]" style={{ aspectRatio: String(Math.max(ratio, 1.1)) }}>
              <Image
                src={image}
                alt={alt}
                fill
                sizes="(min-width: 1024px) 46vw, 100vw"
                quality={90}
                unoptimized={!optimisable(image)}
                // with the page, not as it scrolls near: the box takes the picture's shape before anyone reaches it,
                // so the page below never moves under the reader
                loading="eager"
                className="object-contain"
                onLoad={(e) => {
                  const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                  if (w && h) setRatio(w / h);
                  refreshSoon();
                }}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function RightFor({ lines, label }: { lines: string[]; label: string }) {
  return (
    <div data-rv className="mt-6 rounded-2xl border border-white/12 bg-white/[0.03] p-4 sm:p-5">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9dbbff] sm:text-[11px]">{label}</p>
      <ul className="mt-2.5 space-y-1.5">
        {lines.slice(0, 4).map((line) => (
          <li key={line} className="flex items-start gap-2.5 text-[15px] leading-snug text-white/90 sm:text-base">
            <span aria-hidden="true" className="mt-1.5 h-2 w-3 shrink-0 rounded-[2px] bg-[#5b8cff]" />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Where the page has got to, and a way to go straight anywhere */
function PageRail({ items }: { items: { id: string; label: string }[] }) {
  const ref = useRef<HTMLElement>(null);
  const [current, setCurrent] = useState(-1);
  useEffect(() => {
    const seen = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setCurrent(items.findIndex((i) => i.id === e.target.id));
          else if (e.target.id === items[0]?.id && e.boundingClientRect.top > 0) setCurrent(-1);
        });
      },
      { rootMargin: '-48% 0px -48% 0px' },
    );
    items.forEach((i) => {
      const el = document.getElementById(i.id);
      if (el) seen.observe(el);
    });
    return () => seen.disconnect();
  }, [items]);
  return (
    <nav ref={ref} aria-label="On this page" className={`fixed right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-2.5 rounded-full border border-white/12 bg-midnight/80 px-1.5 py-3 transition-opacity duration-500 lg:flex xl:right-5 ${current < 0 ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          aria-current={current === i ? 'true' : undefined}
          onClick={() => {
            const el = document.getElementById(item.id);
            if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY - 20);
          }}
          className="group relative flex h-2.5 w-2.5 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dbbff]"
        >
          <span className="pointer-events-none absolute right-full top-1/2 mr-4 -translate-y-1/2 whitespace-nowrap rounded bg-midnight px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 xl:text-[10px]">{item.label}</span>
          <span className={`block rounded-full transition-[width,height,background-color] duration-300 ${current === i ? 'h-2.5 w-2.5 bg-[#9dbbff]' : 'h-1.5 w-1.5 bg-white/40 group-hover:bg-white'}`} />
        </button>
      ))}
    </nav>
  );
}

export default function ServiceDetail({ service, related }: { service: DetailService; related: RelatedService[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { block, others } = partsFor(service.slug, related);
  const part = service.text.part_name || block?.part || 'Our service';
  const say = wordsFor(service, part);
  const shown = (section: string) => !service.hide.includes(section);

  // What we do comes from the capabilities in the admin. Until a service has some, what it gives you tells the story instead.
  const hasCapabilities = service.capabilities.length > 0;
  const blocks: DieItem[] = hasCapabilities
    ? service.capabilities
    : service.benefits.filter((b) => b.description).slice(0, MAX_FROM_BENEFITS).map((b) => ({ id: b.id, title: b.title, description: b.description, points: [], image: null }));
  const usedBenefits = hasCapabilities ? [] : blocks.map((b) => b.id);
  const outputs = service.benefits.filter((b) => !usedBenefits.includes(b.id));
  const showOverview = shown('overview') && !!(service.long || service.short);
  const showDie = shown('what_we_do') && blocks.length > 0;
  const showCloser = shown('closer') && !!service.second;
  const showPins = shown('in_and_out') && (service.features.length > 0 || outputs.length > 0);
  const showRow = shown('in_use') && (service.gallery.length > 0 || service.projects.length > 0);
  const showTools = shown('tools') && service.technologies.length > 0;
  const showFaqs = shown('questions') && service.faqs.length > 0;
  const showConnected = shown('connected') && !!block;
  const showForm = shown('form');
  const bothLists = service.features.length > 0 && outputs.length > 0;
  const dieTitle = say(hasCapabilities ? 'die_title' : 'die_title_benefits');
  const closerTitle = service.secondTitle || say('closer_title');
  const pinsTitle = say(bothLists ? 'pins_title' : 'pins_title_single');

  const rail = [
    { id: INSIDE_ID, label: plainTitle(say('overview_title')), on: showOverview },
    { id: 'what-we-do', label: plainTitle(dieTitle), on: showDie },
    { id: 'closer', label: plainTitle(closerTitle), on: showCloser },
    { id: 'in-and-out', label: plainTitle(pinsTitle), on: showPins },
    { id: 'in-use', label: plainTitle(say('use_title')), on: showRow },
    { id: 'tools', label: plainTitle(say('tools_title')), on: showTools },
    { id: 'questions', label: plainTitle(say('faq_title')), on: showFaqs },
    { id: 'connected', label: plainTitle(say('connected_title')), on: showConnected },
    { id: FORM_ID, label: plainTitle(say('form_title')), on: showForm },
  ].filter((i) => i.on);
  const afterDie = rail[rail.findIndex((i) => i.id === 'what-we-do') + 1]?.id ?? 'page-end';
  // the buttons in the opening go to the first and last things on the page, whichever those are for this service
  const firstId = rail[0]?.id ?? FORM_ID;
  const lastId = showForm ? FORM_ID : (rail[rail.length - 1]?.id ?? FORM_ID);

  const facts: Fact[] = shown('facts')
    ? [
        { label: say(hasCapabilities ? 'fact_capabilities' : 'fact_features'), value: hasCapabilities ? service.capabilities.length : service.features.length },
        { label: say('fact_tools'), value: service.technologies.length },
        { label: say('fact_projects'), value: service.projects.length },
      ].filter((f) => f.value > 0)
    : [];

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const scrub = window.matchMedia('(pointer: fine)').matches ? true : 0.3;
      gsap.utils.toArray<HTMLElement>('[data-rv]').forEach((el) => {
        gsap.fromTo(el, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'sine.out', scrollTrigger: { trigger: el, start: 'top 94%', end: 'top 72%', scrub } });
      });
      gsap.utils.toArray<HTMLElement>('[data-wipe]').forEach((el) => {
        gsap.fromTo(el, { clipPath: 'inset(10% 10% 10% 10% round 1rem)', scale: 0.96 }, { clipPath: 'inset(0% 0% 0% 0% round 1rem)', scale: 1, ease: 'sine.out', scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 45%', scrub } });
      });
      refreshSoon();
    },
    { scope: rootRef, dependencies: [service.slug], revertOnUpdate: true },
  );

  return (
    <main ref={rootRef} className="bg-midnight text-white">
      {block ? (
        <PartStage key={service.slug} service={service} block={block} others={others} formId={lastId} insideId={firstId} facts={facts} part={part} title={service.text.hero_title || service.title} words={say} />
      ) : (
        <div className={`${CONTAINER} pt-[calc(var(--header-h)+2rem)] pb-6`}>
          <Title title={service.text.hero_title || service.title} dark />
          {service.short && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/85 sm:text-lg">{service.short}</p>}
        </div>
      )}

      <div className="inside-grid relative">
        {showOverview && (
          <Story id={INSIDE_ID} kicker={say('overview_kicker')} title={say('overview_title')} text={service.long || service.short} image={service.image} alt={service.imageAlt}>
            {service.idealFor.length > 0 && <RightFor lines={service.idealFor} label={say('ideal_for_label')} />}
          </Story>
        )}

        {showDie && (
          <DieScene
            id="what-we-do"
            kicker={say(hasCapabilities ? 'die_kicker' : 'die_kicker_benefits')}
            title={dieTitle}
            skipLabel={say('skip')}
            part={part}
            items={blocks}
            seed={service.slug}
            nextId={afterDie}
          />
        )}

        {showCloser && (
          <Story id="closer" kicker={say('closer_kicker')} title={closerTitle} text={service.second} image={service.secondImage} alt={plainTitle(closerTitle)} flip />
        )}

        {showPins && (
          <section id="in-and-out" aria-label={plainTitle(pinsTitle)} className={SECTION}>
            <div className={CONTAINER}>
              <Head kicker={say(bothLists ? 'pins_kicker' : 'pins_kicker_single')} title={pinsTitle} />
              <Pinout part={part} name={service.title} inputs={service.features} outputs={outputs} inLabel={say('pins_in')} outLabel={say('pins_out')} showAll={(count) => say('show_all', { count })} />
            </div>
          </section>
        )}

        {showRow && (
          <section id="in-use" aria-label={plainTitle(say('use_title'))} className={`overflow-hidden ${SECTION}`}>
            <div className={CONTAINER}>
              <Head kicker={say('use_kicker')} title={say('use_title')} />
              <div className="mt-6 sm:mt-9"><Gallery images={service.gallery} projects={service.projects} liveTag={say('live_tag')} /></div>
            </div>
          </section>
        )}

        {showTools && (
          <section id="tools" aria-label={plainTitle(say('tools_title'))} className={SECTION}>
            <div className={CONTAINER}>
              <Head kicker={say('tools_kicker')} title={say('tools_title')} />
              <div data-rv className="mt-6 sm:mt-9"><Toolchain tools={service.technologies} /></div>
            </div>
          </section>
        )}

        {showFaqs && (
          <section id="questions" aria-label={plainTitle(say('faq_title'))} className={SECTION}>
            <div className={`${CONTAINER} grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12`}>
              <Head kicker={say('faq_kicker')} title={say('faq_title')} />
              <div data-rv><Questions faqs={service.faqs} windowTitle={say('faq_window')} /></div>
            </div>
          </section>
        )}

        {block && showConnected && (
          <section id="connected" aria-label={plainTitle(say('connected_title'))} className={SECTION}>
            <div className={CONTAINER}>
              <Head kicker={say('connected_kicker')} title={say('connected_title')} />
              <div data-rv className="mt-6 sm:mt-9"><BoardMap block={block} related={related} formId={FORM_ID} linkLabel={say('board_link')} /></div>
            </div>
          </section>
        )}

        {showForm && (
          <div id={FORM_ID} className="px-3 pb-10 pt-4 sm:px-6 sm:pb-16">
            <div data-rv className="mx-auto max-w-[1400px] rounded-3xl ring-1 ring-white/15">
              <ProjectForm defaultInterest={service.text.form_interest || FORM_INTEREST[service.slug]} kicker={say('form_kicker')} title={say('form_title')} text={say('form_text')} />
            </div>
          </div>
        )}
      </div>

      <div id="page-end" />
      <PageRail items={rail} />
    </main>
  );
}

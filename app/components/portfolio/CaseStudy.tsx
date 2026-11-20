'use client';

import { useRef, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Icon from '../Icon';
import ProjectForm from '../blog/ProjectForm';
import { scrollToY } from '../SmoothScroll';
import PageRail from '../services/detail/PageRail';
import ScrollLit from '../services/detail/ScrollLit';
import { refreshSoon } from '../services/detail/refresh';
import { plainTitle, splitAccent } from '../services/detail/types';
import { WhatsAppTopic } from '../whatsappTopic';
import { usePlayIntro } from '../../context/usePlayIntro';
import { useText } from '../../site/SiteContext';
import { casePath, type CaseLink, type CaseProject } from './caseData';
import { optimisable } from './data';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const FORM_ID = 'start-project';
const STORY_ID = 'brief';
// (on large screens the right edge leaves room for the page's rail, as on a service's page)
const CONTAINER = 'mx-auto w-full max-w-[1520px] px-4 sm:px-6 lg:pr-14 xl:pr-16';
const SECTION = 'py-12 sm:py-20';
const LABEL = 'font-mono text-[10px] font-bold uppercase tracking-[0.2em] sm:text-[11px]';
const PRIMARY = 'kinetic-cta-btn inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white transition-colors duration-300 hover:bg-white hover:text-midnight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dbbff] sm:text-xs';
const SECONDARY = 'inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white transition-colors duration-300 hover:border-[#9dbbff] hover:text-[#9dbbff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dbbff] sm:text-xs';
// A light on the front panels: dark until it's switched on (data-lit on it or a parent marked "group")
const LED = 'block h-2 w-2 shrink-0 rounded-full bg-[#2a3560] transition-[background-color,box-shadow] duration-500';
const LED_ON = 'bg-[#8fb2ff] shadow-[0_0_8px_1px_#5b8cff]';

const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const goTo = (id: string) => {
  const el = document.getElementById(id);
  if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY - 20);
};

function Head({ kicker, title }: { kicker: string; title: string }) {
  const [plain, bright] = splitAccent(title);
  return (
    <div data-rv>
      <p className={`inline-flex items-center gap-3 text-[#9dbbff] sm:tracking-[0.3em] ${LABEL}`}>
        <span aria-hidden="true" className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-current" />
        {kicker}
      </p>
      <h2 className="heading-section mt-2.5 text-white">
        {plain} <span className="heading-accent-dark">{bright}</span>
      </h2>
    </div>
  );
}

/**
 * The project out of the rack: the drawer front it lived behind, and the laptop on it, its lid opening onto the
 * finished work. At rest nothing is transformed, so the screenshot sits one to one on the screen.
 */
function Laptop({ project }: { project: CaseProject }) {
  const t = useText();
  const [ratio, setRatio] = useState(16 / 10);
  return (
    <div data-cs="laptop" className="relative mx-auto mt-10 w-full max-w-[1180px] [perspective:2600px] sm:mt-14" style={{ '--bezel': 'clamp(7px, 1.1vw, 13px)', '--uh': 'clamp(32px, 4vw, 52px)' } as CSSProperties}>
      {/* the screen's light on the floor */}
      <span data-cs="floor" aria-hidden="true" className="pointer-events-none absolute inset-x-[10%] -bottom-12 h-28 rounded-[50%] bg-[#2563eb]/35 blur-3xl" />

      <div data-cs="lid" className="relative mx-[3.5%] origin-bottom [transform-style:preserve-3d]">
        <span data-cs="glow" aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-t-[14px] shadow-[0_0_120px_-20px_rgb(59_123_247/0.75)]" />
        <div className="rack-bezel relative rounded-t-[14px]">
          {/* the camera with its light, the microphone and the two stops the lid shuts on */}
          <span aria-hidden="true" className="rack-lens absolute left-1/2 top-[calc(var(--bezel)*0.45)] -translate-x-1/2" />
          <span data-cs="cam" aria-hidden="true" className="rack-cam-light absolute left-1/2 top-[calc(var(--bezel)*0.66)] ml-[calc(var(--bezel)*0.75)]" />
          <span aria-hidden="true" className="rack-mic absolute left-1/2 top-[calc(var(--bezel)*0.7)] -ml-[calc(var(--bezel)*1.25)]" />
          <span aria-hidden="true" className="rack-stop absolute left-[7%] top-[calc(var(--bezel)*0.5)]" />
          <span aria-hidden="true" className="rack-stop absolute right-[7%] top-[calc(var(--bezel)*0.5)]" />

          <div className="overflow-hidden rounded-[3px] shadow-[0_0_0_1px_#000,0_0_0_2px_rgb(190_210_255/0.07)]">
            {/* the browser's bar, with the project's real address */}
            <div className="relative flex h-[clamp(26px,2.4vw,34px)] items-center gap-2.5 border-b border-white/10 bg-[#0a1438] px-3">
              <span aria-hidden="true" className="flex shrink-0 gap-1">
                <span className="h-2 w-2 rounded-full bg-white/30" />
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span className="h-2 w-2 rounded-full bg-[#5b8cff]" />
              </span>
              {project.url ? (
                <a href={project.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 max-w-md flex-1 items-center gap-1.5 rounded-md bg-white/8 px-2 py-0.5 font-mono text-[10px] text-white/85 transition-colors duration-300 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-[#9dbbff] sm:text-[11px]">
                  <Icon name="lock" className="shrink-0 text-[12px] text-[#9dbbff]" />
                  <span className="truncate">{project.host}</span>
                  <Icon name="north_east" className="ml-auto shrink-0 text-[12px] text-[#9dbbff]" />
                </a>
              ) : (
                <span className="flex min-w-0 max-w-md flex-1 items-center gap-1.5 rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/65 sm:text-[11px]">
                  <Icon name="lock" className="shrink-0 text-[12px]" />
                  <span className="truncate">{t('case_no_link')}</span>
                </span>
              )}
              <span data-cs="load" aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-linear-to-r from-[#2563eb] to-[#9dbbff]" />
            </div>

            <div className="relative block w-full overflow-hidden bg-[#050b2a]" style={{ aspectRatio: String(project.hero ? ratio : 16 / 9) }}>
              {project.hero ? (
                <Image
                  src={project.hero}
                  alt={`${project.title}: the finished work`}
                  fill
                  sizes="(min-width: 1240px) 1100px, 92vw"
                  quality={90}
                  loading="eager"
                  fetchPriority="high"
                  unoptimized={!optimisable(project.hero)}
                  className="object-contain"
                  onLoad={(e) => {
                    // the screen takes the shape of the picture, so nothing is cut and no bars show
                    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                    if (w && h) setRatio(Math.min(2.3, Math.max(1.45, w / h)));
                    refreshSoon();
                  }}
                />
              ) : (
                // no picture of it in the admin (a private system, say): the screen shows its name, on our logo
                <span className="inside-grid absolute inset-0 flex flex-col items-center justify-center gap-[3%] px-6 text-center">
                  <Image src="/logo/logo-inta.png" alt="" width={120} height={50} className="h-[9%] w-auto opacity-70" />
                  <span className="heading-project block text-white">{project.name}</span>
                  {(project.sub || project.role) && <span className={`block text-[#9dbbff] ${LABEL}`}>{project.sub || project.role}</span>}
                </span>
              )}
              {/* the screen waking as the lid comes up: dark, our logo and a bar, then the page behind a line of light */}
              <span data-cs="cover" aria-hidden="true" className="pointer-events-none invisible absolute inset-0 flex items-center justify-center bg-[#02061c] opacity-0">
                <span data-cs="boot" className="flex h-[12%] w-[22%] flex-col items-center justify-center gap-2">
                  <Image src="/logo/logo-inta.png" alt="" width={120} height={50} className="h-full w-auto" />
                  <span className="block h-0.5 w-full shrink-0 overflow-hidden rounded-full bg-white/15">
                    <span data-cs="bootbar" className="block h-full w-full origin-left scale-x-0 rounded-full bg-[#9dbbff]" />
                  </span>
                </span>
              </span>
              <span data-cs="scan" aria-hidden="true" className="rack-scanline pointer-events-none invisible absolute inset-x-0 top-0" />
            </div>
          </div>
        </div>
      </div>

      {/* the hinge, and the drawer front the laptop slid out of */}
      <div aria-hidden="true" className="rack-hinge relative mx-[3.5%] h-[5px]" />
      <div data-cs="plate" data-lit="false" className="rack-plate relative flex items-center gap-[calc(var(--uh)*0.28)] rounded-b-xl px-[calc(var(--uh)*0.3)] font-mono uppercase" style={{ height: 'var(--uh)' }}>
        <span aria-hidden="true" className="rack-screw shrink-0" />
        <span aria-hidden="true" className="rack-grip shrink-0" />
        <span className="min-w-0 flex-[0_1_46%] truncate text-[length:calc(var(--uh)*0.25)] font-bold tracking-wider text-white">{project.name}</span>
        <span aria-hidden="true" className="rack-vent h-[42%] min-w-0 flex-1 rounded-[2px]" />
        <span className="shrink-0 rounded-[3px] border border-[#5b8cff]/60 px-[0.5em] text-[length:calc(var(--uh)*0.18)] font-bold tracking-wider text-[#9dbbff]">Live</span>
        <span aria-hidden="true" className="rack-leds flex shrink-0 items-center gap-[calc(var(--uh)*0.13)]">
          {['PWR', 'NET', 'I/O'].map((name) => (
            <span key={name} className="flex flex-col items-center gap-[calc(var(--uh)*0.055)]">
              <span className="rack-led" />
              <span className="rack-led-name">{name}</span>
            </span>
          ))}
        </span>
        <span aria-hidden="true" className="rack-grip shrink-0" />
        <span aria-hidden="true" className="rack-screw shrink-0" />
        <span aria-hidden="true" className="rack-edge" />
      </div>
    </div>
  );
}

type Part = { id: string; kicker: string; title: string; text: string };

/** Beside the story: the unit's front panel, a light for each part, lit while that part is being read */
function SpecPanel({ project, parts, active }: { project: CaseProject; parts: Part[]; active: number }) {
  return (
    <div className="rack-plate overflow-hidden rounded-2xl ring-1 ring-white/10" style={{ '--uh': '44px' } as CSSProperties}>
      <div className="flex items-center gap-3 border-b border-black/40 px-4 py-3">
        <span aria-hidden="true" className="rack-screw shrink-0" />
        <span className="min-w-0 truncate font-mono text-[11px] font-bold uppercase tracking-wider text-white">{project.name}</span>
        <span aria-hidden="true" className="rack-vent h-3 min-w-6 flex-1 rounded-[2px]" />
        <span aria-hidden="true" className="rack-screw shrink-0" />
      </div>
      <ol className="space-y-1 p-2">
        {parts.map((part, i) => (
          <li key={part.id}>
            <button
              type="button"
              data-lit={i <= active}
              aria-current={i === active ? 'true' : undefined}
              onClick={() => goTo(part.id)}
              className="group flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-left transition-colors duration-300 hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#9dbbff] aria-[current=true]:bg-white/[0.07]"
            >
              <span aria-hidden="true" className={`${LED} group-data-[lit=true]:bg-[#8fb2ff] group-data-[lit=true]:shadow-[0_0_8px_1px_#5b8cff]`} />
              <span className="min-w-0">
                <span className={`block text-[#9dbbff]/80 ${LABEL}`}>{part.kicker}</span>
                <span className="mt-0.5 block font-display text-[17px] font-bold leading-snug text-white/70 transition-colors duration-300 group-aria-[current=true]:text-white">{plainTitle(part.title)}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      {(project.role || project.sub) && (
        <dl className="grid gap-3 border-t border-black/40 px-5 py-4 font-mono text-[10px] uppercase tracking-wider sm:text-[11px]">
          {project.role && (
            <div>
              <dt className="text-white/55">Work</dt>
              <dd className="mt-0.5 font-bold text-white">{project.role}</dd>
            </div>
          )}
          {project.sub && (
            <div>
              <dt className="text-white/55">Product</dt>
              <dd className="mt-0.5 font-bold text-white">{project.sub}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

/** The tools, as a row of labelled lights that come on one after another */
function ToolPanel({ tools }: { tools: string[] }) {
  return (
    <div data-cs="tools" className="rack-plate mt-6 overflow-hidden rounded-2xl ring-1 ring-white/10 sm:mt-9" style={{ '--uh': '44px' } as CSSProperties}>
      <div aria-hidden="true" className="flex items-center gap-3 border-b border-black/40 px-4 py-2.5">
        <span className="rack-screw shrink-0" />
        <span className="rack-vent h-2.5 flex-1 rounded-[2px]" />
        <span className="rack-screw shrink-0" />
      </div>
      <ul className="grid grid-cols-2 gap-px bg-black/30 sm:grid-cols-3 lg:grid-cols-5">
        {tools.map((tool) => (
          <li key={tool} data-tool data-lit="false" className="group flex min-h-16 items-center gap-3 bg-[#1a2758] px-4 py-3.5">
            <span aria-hidden="true" className={`${LED} group-data-[lit=true]:bg-[#8fb2ff] group-data-[lit=true]:shadow-[0_0_8px_1px_#5b8cff]`} />
            <span className="min-w-0 font-mono text-[11px] font-bold uppercase leading-snug tracking-wider text-white/60 transition-colors duration-500 group-data-[lit=true]:text-white sm:text-xs">{tool}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NextProject({ next }: { next: CaseLink }) {
  const t = useText();
  const [plain, bright] = splitAccent(next.name);
  return (
    <Link href={casePath(next.slug)} className={`group grid items-center gap-6 overflow-hidden rounded-3xl border border-white/12 bg-white/[0.03] p-4 transition-colors duration-300 hover:border-[#9dbbff]/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9dbbff] sm:p-6 lg:gap-12 lg:p-8 ${next.hero ? 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]' : ''}`}>
      <span className="block">
        <span className={`inline-flex items-center gap-3 text-[#9dbbff] sm:tracking-[0.3em] ${LABEL}`}>
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current" />
          {t('case_next_kicker')}
        </span>
        <span className="heading-project mt-2.5 block text-white">
          {plain && <>{plain} </>}<span className="heading-accent-dark">{bright}</span>
        </span>
        {(next.role || next.sub) && <span className={`mt-2 block text-white/70 ${LABEL}`}>{next.role || next.sub}</span>}
        <span className={`${PRIMARY} mt-5`}>
          {t('case_next_link')} <Icon name="east" className="text-[14px] transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      </span>
      {next.hero && (
        <span data-wipe className="relative block aspect-[16/10] overflow-hidden rounded-xl border border-white/15 bg-[#050b2a] shadow-[0_30px_90px_-30px_rgb(59_123_247/0.8)]">
          <Image src={next.hero} alt={`${next.name}: the finished work`} fill sizes="(min-width: 1024px) 55vw, 100vw" quality={90} unoptimized={!optimisable(next.hero)} className="object-contain transition-transform duration-700 group-hover:scale-[1.02]" />
        </span>
      )}
    </Link>
  );
}

function BackToRack() {
  const t = useText();
  const [plain, bright] = splitAccent(t('case_end_title'));
  return (
    <Link href="/portfolio" className="group flex flex-col items-start justify-between gap-5 rounded-3xl border border-white/12 bg-white/[0.03] p-6 transition-colors duration-300 hover:border-[#9dbbff]/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9dbbff] sm:flex-row sm:items-end sm:p-8">
      <span className="block">
        <span className="heading-project block text-white">{plain} <span className="heading-accent-dark">{bright}</span></span>
        <span className="mt-2 block max-w-xl text-[15px] leading-relaxed text-white/80 sm:text-base">{t('case_end_text')}</span>
      </span>
      <span className={PRIMARY}>{t('case_back')} <Icon name="east" className="text-[14px]" /></span>
    </Link>
  );
}

export default function CaseStudy({ project, next }: { project: CaseProject; next: CaseLink | null }) {
  const t = useText();
  const rootRef = useRef<HTMLElement>(null);
  const introRef = useRef<gsap.core.Timeline | null>(null);
  const playedRef = usePlayIntro(introRef);
  const [active, setActive] = useState(0);
  const [plain, bright] = splitAccent(project.name);
  const kicker = project.role || project.sub;

  const parts: Part[] = [
    { id: STORY_ID, kicker: t('case_need_kicker'), title: t('case_need_title'), text: project.challenge },
    { id: 'build', kicker: t('case_built_kicker'), title: t('case_built_title'), text: project.solution },
    ...(project.outcome ? [{ id: 'result', kicker: t('case_result_kicker'), title: t('case_result_title'), text: project.outcome }] : []),
  ];
  const rail = [
    ...parts.map((p) => ({ id: p.id, label: plainTitle(p.title) })),
    ...(project.stack.length ? [{ id: 'tools', label: plainTitle(t('case_tools_title')) }] : []),
    ...(project.services.length ? [{ id: 'services', label: plainTitle(t('case_services_title')) }] : []),
    { id: FORM_ID, label: plainTitle(t('case_form_title')) },
  ];

  useGSAP(
    () => {
      const root = rootRef.current!;
      const plate = root.querySelector<HTMLElement>('[data-cs="plate"]')!;
      const tools = gsap.utils.toArray<HTMLElement>('[data-tool]');
      const lightTools = () => tools.forEach((el) => (el.dataset.lit = 'true'));

      // ---- Which part of the story is being read ----
      parts.forEach((part, i) => {
        ScrollTrigger.create({
          trigger: `#${part.id}`,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: (self) => self.isActive && setActive(i),
        });
      });

      if (calm()) {
        plate.dataset.lit = 'true';
        lightTools();
        return;
      }

      // ---- The opening, once: the unit slides out, the lid comes up and the screen wakes ----
      // (the screen is dark until it wakes: the cover is hidden in the page itself, so it never hides the work without this)
      gsap.set('[data-cs="cover"]', { autoAlpha: 1 });
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
      tl.from('[data-cs="in"]', { y: 18, autoAlpha: 0, duration: 0.9, stagger: 0.07 }, 0)
        .from('[data-cs="word"]', { y: 44, autoAlpha: 0, duration: 1.2, stagger: 0.12 }, 0.05)
        .from(plate, { y: 40, autoAlpha: 0, duration: 1, ease: 'power3.out' }, 0.25)
        .set(plate, { attr: { 'data-lit': 'true' } }, 0.75)
        .from('[data-cs="lid"]', { rotateX: -94, duration: 1.5, ease: 'power3.inOut', clearProps: 'transform' }, 0.55)
        .from(['[data-cs="glow"]', '[data-cs="floor"]', '[data-cs="cam"]'], { autoAlpha: 0, duration: 0.8, ease: 'sine.out' }, 1.5)
        .from('[data-cs="boot"]', { autoAlpha: 0, duration: 0.4, ease: 'sine.out' }, 1.25)
        .fromTo('[data-cs="bootbar"]', { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'power2.inOut' }, 1.35)
        .fromTo('[data-cs="load"]', { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'power2.inOut' }, 1.4)
        .to('[data-cs="load"]', { autoAlpha: 0, duration: 0.3 }, 2.3)
        .fromTo('[data-cs="scan"]', { autoAlpha: 1, top: '0%' }, { top: '100%', duration: 0.75, ease: 'power2.in' }, 1.95)
        .fromTo('[data-cs="cover"]', { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(100% 0% 0% 0%)', duration: 0.75, ease: 'power2.in' }, 1.95)
        .set(['[data-cs="cover"]', '[data-cs="scan"]'], { autoAlpha: 0 }, 2.7);
      introRef.current = tl;
      if (playedRef.current) tl.progress(1);

      // ---- On the way down ----
      const scrub = window.matchMedia('(pointer: fine)').matches ? true : 0.3;
      gsap.utils.toArray<HTMLElement>('[data-rv]').forEach((el) => {
        gsap.fromTo(el, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'sine.out', scrollTrigger: { trigger: el, start: 'top 94%', end: 'top 72%', scrub } });
      });
      gsap.utils.toArray<HTMLElement>('[data-wipe]').forEach((el) => {
        gsap.fromTo(el, { clipPath: 'inset(10% 10% 10% 10% round 1rem)', scale: 0.96 }, { clipPath: 'inset(0% 0% 0% 0% round 1rem)', scale: 1, ease: 'sine.out', scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 45%', scrub } });
      });
      if (tools.length) {
        ScrollTrigger.create({
          trigger: '[data-cs="tools"]',
          start: 'top 80%',
          once: true,
          onEnter: () => tools.forEach((el, i) => gsap.delayedCall(i * 0.09, () => (el.dataset.lit = 'true'))),
        });
      }
      refreshSoon();
    },
    { scope: rootRef, dependencies: [project.slug], revertOnUpdate: true },
  );

  return (
    <main id="main" ref={rootRef} className="bg-midnight text-white">
      <WhatsAppTopic project={project.name} />

      {/* ---- The project, out of the rack ---- */}
      <section aria-labelledby="case-title" className="rack-room relative overflow-x-clip pb-16 pt-[calc(var(--header-h)+1.25rem)] sm:pb-24 sm:pt-[calc(var(--header-h)+2rem)]">
        <div className={CONTAINER}>
          <nav data-cs="in" aria-label="Breadcrumb" className={`flex min-w-0 items-center gap-2 text-white/70 ${LABEL}`}>
            <Link href="/portfolio" className="group inline-flex shrink-0 items-center gap-1.5 transition-colors duration-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dbbff]">
              <Icon name="arrow_back" className="text-[14px] transition-transform duration-300 group-hover:-translate-x-0.5" />
              {t('case_back')}
            </Link>
            <span aria-hidden="true" className="text-white/35">/</span>
            <span aria-current="page" className="truncate text-[#9dbbff]">{project.name}</span>
          </nav>

          <div className="mt-6 grid gap-6 sm:mt-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-14">
            <div>
              <p data-cs="in" className={`inline-flex items-center gap-3 text-[#9dbbff] sm:tracking-[0.3em] ${LABEL}`}>
                <span aria-hidden="true" className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-current" />
                {t('case_kicker')}{kicker && <> {'//'} {kicker}</>}
              </p>
              <h1 id="case-title" className="heading-page mt-3 text-white">
                {plain && <><span data-cs="word" className="inline-block">{plain}</span>{' '}</>}
                <span data-cs="word" className="heading-accent-dark heading-serif inline-block">{bright}</span>
              </h1>
              {project.sub && project.role && <p data-cs="in" className={`mt-3 text-white/75 ${LABEL}`}>{project.sub}</p>}
            </div>
            <div>
              {project.summary && <p data-cs="in" className="text-[15px] leading-relaxed text-white/85 [text-wrap:pretty] sm:text-lg">{project.summary}</p>}
              {project.tags.length > 0 && (
                <ul data-cs="in" className="mt-4 flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => <li key={tag} className="rounded-md border border-white/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#9dbbff]">{tag}</li>)}
                </ul>
              )}
              <div data-cs="in" className="mt-5 flex flex-wrap gap-2">
                {project.url && (
                  <a href={project.url} target="_blank" rel="noopener noreferrer" className={PRIMARY}>
                    {t('case_visit')} <Icon name="north_east" className="text-[14px]" />
                  </a>
                )}
                <button type="button" onClick={() => goTo(STORY_ID)} className={SECONDARY}>
                  {t('case_read')} <Icon name="south" className="text-[14px]" />
                </button>
              </div>
            </div>
          </div>

          <Laptop project={project} />
        </div>
      </section>

      <div className="inside-grid relative overflow-x-clip">
        {/* ---- The story: what they needed, what we built, and what changed ---- */}
        <section aria-label={plainTitle(t('case_need_title'))} className={SECTION}>
          <div className={`${CONTAINER} grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16`}>
            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <SpecPanel project={project} parts={parts} active={active} />
              </div>
            </aside>
            <div className="space-y-16 sm:space-y-24">
              {parts.map((part) => (
                <article key={part.id} id={part.id} className="scroll-mt-24">
                  <Head kicker={part.kicker} title={part.title} />
                  <div className="mt-5 max-w-4xl sm:mt-7"><ScrollLit text={part.text} /></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {project.stack.length > 0 && (
          <section id="tools" aria-label={plainTitle(t('case_tools_title'))} className={SECTION}>
            <div className={CONTAINER}>
              <Head kicker={t('case_tools_kicker')} title={t('case_tools_title')} />
              <ToolPanel tools={project.stack} />
            </div>
          </section>
        )}

        {project.services.length > 0 && (
          <section id="services" aria-label={plainTitle(t('case_services_title'))} className={SECTION}>
            <div className={CONTAINER}>
              <Head kicker={t('case_services_kicker')} title={t('case_services_title')} />
              <ul className="mt-6 grid gap-3 sm:mt-9 sm:grid-cols-2 lg:grid-cols-3">
                {project.services.map((s) => (
                  <li key={s.slug} data-rv>
                    <Link href={`/services/${s.slug}`} className="group flex h-full items-center gap-4 rounded-2xl border border-white/12 bg-white/[0.03] p-5 transition-colors duration-300 hover:border-[#9dbbff]/60 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9dbbff] sm:p-6">
                      <span aria-hidden="true" className={`${LED} ${LED_ON}`} />
                      <span className="min-w-0 flex-1">
                        <span className="heading-sub block text-white">{s.title}</span>
                        <span className={`mt-1 block text-[#9dbbff] ${LABEL}`}>{t('case_services_link')}</span>
                      </span>
                      <Icon name="north_east" className="shrink-0 text-[20px] text-[#9dbbff] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section aria-label={next ? `${t('case_next_kicker')}: ${next.name}` : plainTitle(t('case_end_title'))} className="py-8 sm:py-12">
          <div data-rv className={CONTAINER}>{next ? <NextProject next={next} /> : <BackToRack />}</div>
        </section>

        <div id={FORM_ID} className="px-3 pb-10 pt-8 sm:px-6 sm:pb-16 sm:pt-12">
          <div data-rv className="mx-auto max-w-[1400px] rounded-3xl ring-1 ring-white/15">
            <ProjectForm defaultInterest={project.services[0]?.title} kicker={t('case_form_kicker')} title={t('case_form_title')} text={t('case_form_text')} />
          </div>
        </div>
      </div>

      <PageRail items={rail} />
    </main>
  );
}

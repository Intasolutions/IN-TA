'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Icon from '../Icon';
import ProjectForm from '../blog/ProjectForm';
import { apiBase } from '../blog/data';
import { refreshSoon } from '../services/detail/refresh';
import { splitAccent } from '../services/detail/types';
import { optimisable, toWork, type RackProject, type RackSite, type Work } from './data';
import RackStage from './RackStage';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const FORM_ID = 'start-project';
const MORE_ID = 'more-sites';
const CONTAINER = 'mx-auto w-full max-w-[1520px] px-4 sm:px-6';
const ROUND = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/5 text-white transition-colors duration-300 hover:bg-white hover:text-midnight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dbbff]';
const VISIT = 'kinetic-cta-btn inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white transition-colors duration-300 hover:bg-white hover:text-midnight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dbbff] sm:text-xs';

// Whether the visitor has asked for less motion, the same on the server and in the first paint
const subscribeMotion = (notify: () => void) => {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};
const useReducedMotion = () => useSyncExternalStore(subscribeMotion, () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => false);

function Head({ kicker, plain, bright }: { kicker: string; plain: string; bright: string }) {
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

// The first row takes up the slack, so that the rows below are always full
function spanOf(index: number, count: number) {
  const rest = count % 3;
  if (rest === 2 && index < 2) return 'lg:col-span-3';
  if (rest === 1 && count >= 4 && index < 4) return 'lg:col-span-3';
  if (count === 1) return 'lg:col-span-6';
  return 'lg:col-span-2';
}

/** More sites: small consoles of their own, whose screens flip up as they come into view */
function MoreSites({ sites }: { sites: RackSite[] }) {
  return (
    <ul className="mt-6 grid grid-cols-1 gap-4 sm:mt-9 sm:grid-cols-2 lg:grid-cols-6 max-lg:sm:[&>li:last-child:nth-child(odd)]:col-span-2">
      {sites.map((site, i) => {
        const body = (
          <>
            <span className="block [perspective:1100px]">
              <span data-flip className="relative block aspect-[16/9] origin-bottom overflow-hidden rounded-t-xl border border-b-0 border-white/15 bg-[#050b2a] shadow-[0_0_60px_-18px_rgb(59_123_247/0.7)]">
                {site.image && <Image src={site.image} alt={`${site.title}: the finished site`} fill sizes="(min-width: 1024px) 50vw, (min-width: 640px) 50vw, 100vw" quality={90} unoptimized={!optimisable(site.image)} className="object-contain" />}
              </span>
            </span>
            <span className="rack-plate relative flex min-h-16 items-center gap-3 rounded-b-xl px-4 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="heading-sub block text-white transition-colors duration-300 group-hover:text-[#9dbbff]">{site.title}</span>
                {(site.sub || site.host) && <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-wider text-white/70 sm:text-[11px]">{site.sub || site.host}</span>}
              </span>
              <span className="shrink-0 rounded-[3px] border border-[#5b8cff]/60 px-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#9dbbff]">Live</span>
              <Icon name="north_east" className="shrink-0 text-[18px] text-[#9dbbff] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </>
        );
        const card = 'group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9dbbff]';
        return (
          <li key={site.id} data-site className={`min-w-0 ${spanOf(i, sites.length)}`}>
            {site.url ? <a href={site.url} target="_blank" rel="noopener noreferrer" className={card}>{body}</a> : <div className={card}>{body}</div>}
          </li>
        );
      })}
    </ul>
  );
}

/** With animations off: the same work, one project after another */
function StillList({ projects, onView }: { projects: RackProject[]; onView: (p: RackProject) => void }) {
  return (
    <section aria-label="Our projects" className={`${CONTAINER} pb-6 pt-[calc(var(--header-h)+1.5rem)]`}>
      <p className="inline-flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9dbbff] sm:text-[11px] sm:tracking-[0.3em]">Our work {'//'} The rack</p>
      <h1 className="heading-page mt-3 text-white">
        <span className="block">One rack.</span>
        <span className="block"><span className="heading-accent-dark heading-serif">All our work.</span></span>
      </h1>
      <ul className="mt-6 space-y-10 sm:space-y-14">
        {projects.map((p) => {
          const [plain, bright] = splitAccent(p.title);
          return (
            <li key={p.id} className="grid items-center gap-5 lg:grid-cols-2 lg:gap-10">
              <button type="button" onClick={() => onView(p)} aria-label={`Full view: ${p.title}`} className="relative block aspect-[16/9] w-full cursor-zoom-in overflow-hidden rounded-xl border border-white/15 bg-[#050b2a]">
                {p.hero && <Image src={p.hero} alt={`${p.title}: the finished work`} fill sizes="(min-width: 1024px) 50vw, 100vw" quality={90} unoptimized={!optimisable(p.hero)} className="object-contain" />}
              </button>
              <div>
                {(p.role || p.sub) && <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9dbbff] sm:text-[11px]">{p.role || p.sub}</p>}
                <h2 className="heading-project mt-2 text-white">{plain && <>{plain} </>}<span className="heading-accent-dark">{bright}</span></h2>
                <p className="mt-3 text-[15px] leading-relaxed text-white/85 sm:text-base">{p.summary}</p>
                {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className={`${VISIT} mt-4`}>Visit the site <Icon name="north_east" className="text-[14px]" /></a>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Everything about one project, with its picture at full size */
function FullView({ project, onClose }: { project: RackProject | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (project && !d.open) d.showModal();
    if (!project && d.open) d.close();
  }, [project]);
  const [plain, bright] = splitAccent(project?.title ?? '');
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={project ? `Full view: ${project.title}` : 'Full view'}
      className="fixed inset-0 m-0 h-svh max-h-none w-screen max-w-none bg-midnight/95 p-3 text-white backdrop:bg-midnight/80 sm:p-6"
    >
      {project && (
        <div data-lenis-prevent className="mx-auto flex h-full max-w-[1400px] flex-col gap-4 overflow-y-auto lg:flex-row lg:items-center lg:gap-8 lg:overflow-hidden">
          <div className="relative w-full shrink-0 lg:min-h-0 lg:flex-[1.9] lg:self-stretch">
            <div className="relative aspect-[16/9] w-full lg:absolute lg:inset-0 lg:aspect-auto">
              {project.hero && <Image key={project.id} src={project.hero} alt={`${project.title}: the finished work`} fill sizes="(min-width: 1024px) 66vw, 100vw" quality={90} unoptimized={!optimisable(project.hero)} className="object-contain" />}
            </div>
          </div>
          <div className="lg:flex-1">
            {(project.role || project.sub) && <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9dbbff] sm:text-[11px]">{project.role || project.sub}</p>}
            <h2 className="heading-project mt-2 text-white">{plain && <>{plain} </>}<span className="heading-accent-dark">{bright}</span></h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/85 sm:text-base">{project.summary}</p>
            {project.tags.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {project.tags.map((t) => <li key={t} className="rounded-md border border-white/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#9dbbff]">{t}</li>)}
              </ul>
            )}
            {project.url && <a href={project.url} target="_blank" rel="noopener noreferrer" className={`${VISIT} mt-5`}>Visit the site <Icon name="north_east" className="text-[14px]" /></a>}
          </div>
        </div>
      )}
      <button type="button" onClick={onClose} aria-label="Close" className={`${ROUND} absolute right-3 top-3 sm:right-5 sm:top-5`}><Icon name="close" className="text-[18px]" /></button>
    </dialog>
  );
}

export default function PortfolioPage({ initial }: { initial: Work }) {
  const rootRef = useRef<HTMLElement>(null);
  const [work, setWork] = useState(initial);
  const [view, setView] = useState<RackProject | null>(null);
  const reduced = useReducedMotion();
  const onView = useCallback((p: RackProject) => setView(p), []);
  const onClose = useCallback(() => setView(null), []);

  // Our API host can be asleep when the page is built: if nothing came through, ask again from here
  const empty = work.projects.length === 0;
  useEffect(() => {
    if (!empty) return;
    const stop = new AbortController();
    const base = apiBase();
    Promise.all([
      fetch(`${base}/api/portfolio/projects/`, { signal: stop.signal }).then((r) => r.json()),
      fetch(`${base}/api/portfolio/gallery/`, { signal: stop.signal }).then((r) => r.json()),
    ])
      .then(([projects, sites]) => setWork(toWork(Array.isArray(projects) ? projects : projects.results ?? [], Array.isArray(sites) ? sites : sites.results ?? [], base)))
      .catch(() => {});
    return () => stop.abort();
  }, [empty]);

  useGSAP(
    () => {
      if (reduced) return;
      const scrub = window.matchMedia('(pointer: fine)').matches ? true : 0.3;
      gsap.utils.toArray<HTMLElement>('[data-rv]').forEach((el) => {
        gsap.fromTo(el, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'sine.out', scrollTrigger: { trigger: el, start: 'top 94%', end: 'top 72%', scrub } });
      });
      gsap.utils.toArray<HTMLElement>('[data-site]').forEach((site) => {
        gsap.fromTo(site.querySelector('[data-flip]'), { rotateX: -72 }, { rotateX: 0, ease: 'none', scrollTrigger: { trigger: site, start: 'top 98%', end: 'top 58%', scrub } });
      });
      refreshSoon();
    },
    { scope: rootRef, dependencies: [reduced, work.sites.length], revertOnUpdate: true },
  );

  return (
    <main ref={rootRef} className="bg-midnight text-white">
      {reduced ? <StillList projects={work.projects} onView={onView} /> : <RackStage projects={work.projects} siteCount={work.sites.length} formId={FORM_ID} nextId={work.sites.length ? MORE_ID : FORM_ID} onView={onView} />}

      <div className="inside-grid relative overflow-x-clip">
        {work.sites.length > 0 && (
          <section id={MORE_ID} aria-label="Also built by us" className="py-12 sm:py-20">
            <div className={CONTAINER}>
              <Head kicker="More work // Websites" plain="Also built" bright="by us." />
              <MoreSites sites={work.sites} />
            </div>
          </section>
        )}

        <div id={FORM_ID} className="px-3 pb-10 pt-4 sm:px-6 sm:pb-16">
          <div data-rv className="mx-auto max-w-[1400px] rounded-3xl ring-1 ring-white/15">
            <ProjectForm />
          </div>
        </div>
      </div>

      <FullView project={view} onClose={onClose} />
    </main>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Icon from '../Icon';
import ProjectForm from '../blog/ProjectForm';
import { apiBase } from '../blog/data';
import { jumpToY } from '../SmoothScroll';
import { useReveal } from '../../context/RevealContext';
import { createChip, type ChipEngine } from './chipEngine';
import { AI_BLOCK, AI_SLUG, BLOCKS, centreOf, CLOSE, HERO, KIND, linkBetween, NOW, PLAN, YOUR_BLOCK, type Block, type ChipService, type Point } from './floorplan';
import { errorAt, routeOrder, type OrderChoice } from './orders';
import { buildScore, cameraAt, flyBetween, FOV, mixCameras, orderKeys, ramp, smooth, smoother, type Camera, type Key, fieldOfView } from './score';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export type { ChipService };

const POSTERS = '/services/chip';
const CONTAINER = 'mx-auto w-full max-w-[1520px] px-4 sm:px-6';
const KICKER = 'inline-flex items-center gap-3 font-mono text-[10px] sm:text-[11px] tracking-[0.2em] sm:tracking-[0.3em] uppercase font-bold text-brand-blue';
const BODY = 'text-midnight/85';
const TAG = 'rounded-md border border-brand-blue/30 bg-canvas px-2 py-1 sm:px-2.5 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-brand-blue';
const CTA = 'kinetic-cta-btn rounded-xl bg-brand-blue text-white hover:bg-midnight';
const CHIP = 'border-brand-blue/30 bg-white text-midnight hover:border-brand-blue hover:text-brand-blue';
const CHIP_ON = 'border-brand-blue bg-brand-blue text-white shadow-[0_8px_24px_-8px_rgb(1_68_181/0.6)] hover:bg-midnight';
const FIELD = 'border-brand-blue/30 bg-white focus-within:border-brand-blue';
const FIELD_TEXT = 'text-midnight placeholder:text-midnight/55';
const READOUT_KEY = 'text-midnight/65';
// The words sit on clean white cards, as on the Home page, so that the board stays sharp all the way across the screen
const CARD = 'pointer-events-auto rounded-3xl border border-brand-blue/20 bg-white p-5 sm:p-7 shadow-xl shadow-brand-blue/10 [@media(max-height:480px)]:rounded-2xl [@media(max-height:480px)]:p-3';
const LINE_CARD = 'pointer-events-auto inline-block rounded-2xl border border-brand-blue/20 bg-white px-5 py-3 sm:px-7 sm:py-4 shadow-xl shadow-brand-blue/10';
// (on a tall screen the opening words and the board share the height, so the top of the board fades under the words)
const SHADE_HERO = 'absolute inset-0 bg-linear-to-b from-white from-55% to-transparent to-66% [@media(min-aspect-ratio:23/20)]:hidden';
const SHADE_PLAN = 'absolute inset-x-0 top-0 h-[28%] bg-linear-to-b from-white from-60% to-transparent [@media(min-aspect-ratio:23/20)]:hidden';
const CARD_PLACE = 'absolute inset-x-0 bottom-[max(1rem,2.5svh)] [@media(min-aspect-ratio:23/20)]:inset-y-0 [@media(min-aspect-ratio:23/20)]:bottom-0 [@media(min-aspect-ratio:23/20)]:flex [@media(min-aspect-ratio:23/20)]:items-center';
const CARD_WIDTH = 'max-w-[36rem] [@media(min-aspect-ratio:23/20)]:max-w-[min(34rem,42vw)]';

// Large monitors: the words grow with the screen instead of sitting small in a corner of it (as on the About page)
const ZOOMED = '[data-zoom]';
const screenZoom = (w: number, h: number) => Math.min(1.9, Math.max(1, Math.min(w / 1480, h / 800))).toFixed(3);

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
// The readout changes over to the next part a little way into the flight
const TARGET_AT = 0.55;

function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(' ').map((w, i) => (
        <span key={i} data-w className="inline-block">
          {w}&nbsp;
        </span>
      ))}
    </>
  );
}

function Features({ names }: { names: string[] }) {
  if (!names.length) return null;
  return (
    <ul className="mt-3.5 sm:mt-5 flex flex-wrap gap-1.5 sm:gap-2 max-sm:[&>li:nth-child(n+7)]:hidden [@media(max-height:640px)]:hidden">
      {names.map((n) => (
        <li key={n} data-f className={TAG}>
          {n}
        </li>
      ))}
    </ul>
  );
}

function OpenLink({ slug, label }: { slug: string; label: string }) {
  return (
    <Link
      data-link
      href={`/services/${slug}`}
      className={`group pointer-events-auto mt-3.5 sm:mt-5 inline-flex items-center gap-2.5 px-5 py-3 font-mono text-[11px] sm:text-xs uppercase tracking-wider font-semibold
        transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue [@media(max-height:480px)]:mt-2 [@media(max-height:480px)]:py-1.5 ${CTA}`}
    >
      {label}
      <Icon name="north_east" className="text-[15px] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}

function ServiceCard({ service, kicker, featured = false }: { service: ChipService; kicker: string; featured?: boolean }) {
  return (
    <>
      <p data-k className={KICKER}>
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current animate-pulse" />
        {kicker}
        {featured && <span className="rounded bg-brand-blue px-1.5 py-0.5 tracking-wider text-white">Featured</span>}
      </p>
      <h2 className="heading-section mt-2.5 sm:mt-3 overflow-hidden pb-[0.05em] text-midnight">
        <span data-t className="block">{service.title}</span>
      </h2>
      {service.description && <p data-d className={`mt-2.5 sm:mt-4 text-[15px] sm:text-lg leading-relaxed [@media(max-height:480px)]:mt-1 [@media(max-height:480px)]:text-[13px] [@media(max-height:480px)]:leading-snug ${BODY}`}>{service.description}</p>}
      <Features names={service.features} />
      <OpenLink slug={service.slug} label={`Explore ${featured ? 'AI services' : service.title}`} />
    </>
  );
}

type ActiveOrder = { text: string; block: Block; service: ChipService | null };
type LiveData = { ms: number; status: number; description: string; features: string[]; technologies: string[] };

const namesOf = (list: unknown): string[] => (Array.isArray(list) ? list.map((x) => (typeof x === 'string' ? x : ((x as { name?: string }).name ?? ''))).filter(Boolean) : []);

/** Give the board an order: the words a visitor would really use */
function OrderConsole({ onOrder }: { onOrder: (text: string) => void }) {
  const [value, setValue] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = value.replace(/[^\p{L}\p{M}\p{N} ,.&'+#/-]/gu, '').trim().slice(0, 120);
    if (!text) return;
    setValue('');
    onOrder(text);
  };
  return (
    <div className="pointer-events-auto">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        {NOW.orders.map((order) => (
          <li key={order}>
            <button
              type="button"
              onClick={() => onOrder(order)}
              className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider font-bold transition-[color,background-color,border-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${CHIP}`}
            >
              {order}
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className={`mt-2.5 mx-auto flex max-w-md items-center gap-2 rounded-xl border p-1 pl-3.5 ${FIELD}`}>
        <label htmlFor="chip-order" className="sr-only">Your order for the board</label>
        <input
          id="chip-order"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={120}
          placeholder="Or type your own order"
          autoComplete="off"
          className={`min-w-0 flex-1 bg-transparent text-[16px] sm:text-sm outline-none ${FIELD_TEXT}`}
        />
        <button type="submit" className="shrink-0 rounded-lg bg-brand-blue px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-wider font-bold text-white transition-colors duration-300 hover:bg-midnight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
          Send
        </button>
      </form>
    </div>
  );
}

/** What comes back: the part that took the order, its real data read from the API just now, and a way to send the order to the team */
function OrderAnswer({ order, onClose }: { order: ActiveOrder; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<LiveData | null>(null);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState<'answer' | 'form' | 'sending' | 'sent' | 'error'>('answer');
  const [who, setWho] = useState({ name: '', email: '', phone: '', country: '', company: '' });
  const service = order.service;
  const path = service ? `/api/services/${service.slug}/` : '';

  useEffect(() => {
    if (!path) return;
    let gone = false;
    const started = performance.now();
    fetch(`${apiBase()}${path}`, { signal: AbortSignal.timeout(9000) })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (gone) return;
        setLive({
          ms: Math.round(performance.now() - started),
          status: res.status,
          description: typeof data.short_description === 'string' ? data.short_description.trim() : '',
          features: namesOf(data.features),
          technologies: namesOf(data.technologies),
        });
      })
      .catch(() => {
        if (!gone) setFailed(true);
      });
    return () => {
      gone = true;
    };
  }, [path]);

  useGSAP(() => {
    gsap.fromTo(ref.current, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8, delay: order.block.kind === 'ai' ? 0.5 : 1.5, ease: 'sine.out' });
  }, { scope: ref });

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (step === 'sending') return;
    setStep('sending');
    try {
      let token = '';
      try {
        const r = await fetch(`${apiBase()}/api/csrf/`);
        if (r.ok) token = (await r.json()).csrfToken ?? '';
      } catch {
        // the API doesn't require it for anonymous posts; send without
      }
      const res = await fetch(`${apiBase()}/api/contact/messages/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'X-CSRFToken': token } : {}) },
        body: JSON.stringify({
          name: who.name.trim(),
          email: who.email.trim(),
          phone: who.phone.trim(),
          country: who.country.trim(),
          message: `Order from the Services page, for ${service?.title ?? 'something new (no matching service)'}: "${order.text}"`,
          is_request: true,
          honeypot: who.company,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStep('sent');
    } catch {
      setStep('error');
    }
  };

  const features = (live?.features.length ? live.features : (service?.features ?? [])).slice(0, 6);
  const technologies = (live?.technologies ?? []).slice(0, 6);
  const description = live?.description || service?.description || '';
  const input = `block h-11 w-full rounded-lg border px-3 text-[16px] sm:text-sm outline-none ${FIELD} ${FIELD_TEXT}`;
  const secondary = `inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider font-bold transition-[color,background-color,border-color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${CHIP}`;
  const primary = `inline-flex items-center gap-2.5 px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:opacity-60 ${CTA}`;

  return (
    <div ref={ref} data-chip="answer" className="invisible pointer-events-none absolute inset-0">
      <div data-zoom className={CARD_PLACE}>
        <div className={CONTAINER}>
          <div data-lenis-prevent data-card className={`${CARD} max-h-[60svh] overflow-y-auto [@media(min-aspect-ratio:23/20)]:max-h-[86svh] ${CARD_WIDTH}`}>
            <p className={KICKER}>
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current animate-pulse" />
              {service ? `Order routed // ${order.block.part}` : 'Not on the board yet // Empty socket'}
            </p>
            <p className={`mt-2 font-mono text-[11px] sm:text-xs ${BODY}`}>&ldquo;{order.text}&rdquo;</p>
            <h2 className="heading-section mt-2 text-midnight">{service ? service.title : 'This one is for the empty socket.'}</h2>

            {step === 'answer' && (
              <>
                <p className={`mt-2.5 text-[15px] sm:text-base leading-relaxed ${BODY}`}>{service ? description : 'None of our parts matches this order yet. Send it to us anyway, and we will tell you honestly whether we can build it.'}</p>
                {features.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {features.map((n) => <li key={n} className={TAG}>{n}</li>)}
                  </ul>
                )}
                {technologies.length > 0 && (
                  <p className={`mt-2.5 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider ${READOUT_KEY}`}>Tools: <span className="text-midnight">{technologies.join(', ')}</span></p>
                )}
                {service && (
                  <p className={`mt-2.5 font-mono text-[10px] sm:text-[11px] tracking-wide ${READOUT_KEY}`} aria-live="polite">
                    {live ? (
                      <><span aria-hidden="true" className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle bg-brand-blue" />GET {path} <span className="text-midnight">{live.status}</span> in <span className="text-midnight">{live.ms} ms</span></>
                    ) : failed ? (
                      'Live data could not be reached, so this is the saved copy.'
                    ) : (
                      `GET ${path} reading...`
                    )}
                  </p>
                )}
                <div className="mt-3.5 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setStep('form')} className={primary}>
                    Send this order to our team <Icon name="north_east" className="text-[15px]" />
                  </button>
                  {service && <Link href={`/services/${service.slug}`} className={secondary}>Explore</Link>}
                  <button type="button" onClick={onClose} className={secondary}>New order</button>
                </div>
              </>
            )}

            {(step === 'form' || step === 'sending' || step === 'error') && (
              <form onSubmit={send} className="mt-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="block"><span className="sr-only">Your name</span><input required minLength={2} value={who.name} onChange={(e) => setWho({ ...who, name: e.target.value })} placeholder="Your name" autoComplete="name" className={input} /></label>
                  <label className="block"><span className="sr-only">Email</span><input required type="email" value={who.email} onChange={(e) => setWho({ ...who, email: e.target.value })} placeholder="Email" autoComplete="email" className={input} /></label>
                  <label className="block"><span className="sr-only">Phone number</span><input required minLength={7} type="tel" value={who.phone} onChange={(e) => setWho({ ...who, phone: e.target.value })} placeholder="Phone number" autoComplete="tel" className={input} /></label>
                  <label className="block"><span className="sr-only">Country</span><input required value={who.country} onChange={(e) => setWho({ ...who, country: e.target.value })} placeholder="Country" autoComplete="country-name" className={input} /></label>
                </div>
                {/* (left empty by people: the API turns away anything that fills it) */}
                <input tabIndex={-1} aria-hidden="true" autoComplete="off" value={who.company} onChange={(e) => setWho({ ...who, company: e.target.value })} className="hidden" />
                {step === 'error' && <p role="alert" className={`mt-2 text-sm ${BODY}`}>That didn&apos;t reach us. Please try again, or use the form further down the page.</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="submit" disabled={step === 'sending'} className={primary}>{step === 'sending' ? 'Sending...' : 'Send order'}</button>
                  <button type="button" onClick={() => setStep('answer')} className={secondary}>Back</button>
                </div>
              </form>
            )}

            {step === 'sent' && (
              <div role="status">
                <p className={`mt-3 text-[15px] sm:text-base leading-relaxed ${BODY}`}>Order received. Our team will get back to you.</p>
                <button type="button" onClick={onClose} className={`mt-3 ${secondary}`}>New order</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type NavItem = { id: string; label: string };

/** Shortcuts between the parts. On its own, so that passing a part while scrolling doesn't re-render the page. */
function StopsNav({ items, currentRef, onGo }: { items: NavItem[]; currentRef: RefObject<(i: number) => void>; onGo: (id: string) => void }) {
  const [current, setCurrent] = useState(-1);
  useEffect(() => {
    currentRef.current = setCurrent;
  }, [currentRef]);
  return (
    <nav data-chip="nav" data-zoom aria-label="Parts on the board" className="invisible opacity-0 fixed right-3 xl:right-5 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-2.5 rounded-full bg-white/95 px-2 py-3 shadow-md ring-1 ring-brand-blue/15 transition-opacity duration-500 lg:flex">
      {items.map((item, i) => (
        <button key={item.id} type="button" onClick={() => onGo(item.id)} aria-current={current === i ? 'true' : undefined} className="group relative flex h-2.5 w-2.5 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue">
          <span className="pointer-events-none absolute right-full top-1/2 mr-4 -translate-y-1/2 whitespace-nowrap rounded bg-white px-1.5 py-0.5 font-mono text-[9px] xl:text-[10px] uppercase tracking-wider text-midnight opacity-0 shadow-sm ring-1 ring-brand-blue/20 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
            {item.label}
          </span>
          <span className={`block rounded-full transition-[width,height,background-color] duration-300 ${current === i ? 'h-2.5 w-2.5 bg-brand-blue' : 'h-1.5 w-1.5 bg-midnight/25 group-hover:bg-midnight'}`} />
        </button>
      ))}
    </nav>
  );
}

/** How the picture is made, and where the one outside figure comes from */
function Credits({ id, className, popover }: { id: string; className: string; popover: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div data-chip={id === 'chip-credits' ? 'credits' : undefined} className={className}>
      {open && (
        <p id={id} className={`absolute bottom-full mb-2 w-[min(20rem,80vw)] rounded-xl border border-brand-blue/20 bg-white p-3 text-left text-[11px] leading-relaxed text-midnight/80 shadow-lg ${popover}`}>
          Drawn live by your device, not a video. The board is an illustration, not a real product, and the training scene is an illustration too. Orders are matched to a service by keywords in your browser, not by an AI model, and nothing you type is sent until you press Send order. Figure from Wikipedia:{' '}
          <a href={NOW.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-midnight">Transistor count</a>.
        </p>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="rounded-md bg-white/95 px-2 py-1 font-mono text-[9px] sm:text-[10px] uppercase tracking-wider underline underline-offset-2 text-midnight/70 shadow-sm ring-1 ring-brand-blue/15 hover:text-midnight"
      >
        About this animation
      </button>
    </div>
  );
}

/** A still of the part, for visitors who ask for less motion or whose device can't draw the board */
function Still({ name }: { name: string }) {
  return <Image src={`${POSTERS}/${name}.jpg`} alt="" fill sizes="100vw" className="object-cover object-[72%_50%]" />;
}

export default function ServiceChip({ services }: { services: ChipService[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ChipEngine | null>(null);
  const introRef = useRef<gsap.core.Timeline | null>(null);
  const askedRef = useRef(false);
  const navChangedRef = useRef<(i: number) => void>(() => {});
  const flyRef = useRef<((y: number) => void) | null>(null);
  const [still, setStill] = useState(false);
  const [attempt, setAttempt] = useState(0); // goes up if the graphics context is lost: the board restarts on a new canvas
  const [order, setOrder] = useState<ActiveOrder | null>(null);
  const orderRef = useRef<Block | null>(null);
  const { isIntroReady } = useReveal();

  const bySlug = useMemo(() => new Map(services.map((s) => [s.slug, s])), [services]);
  const ai: ChipService = bySlug.get(AI_SLUG) ?? { slug: AI_SLUG, title: NOW.fallbackTitle, description: '', features: [] };
  // (if the API can't be reached the page keeps the names it knows; a service switched off in the admin drops out)
  const serviceOf = (b: Block): ChipService | null => {
    if (!b.service) return null;
    return bySlug.get(b.service.slug) ?? (services.length ? null : { slug: b.service.slug, title: b.service.fallbackTitle, description: '', features: [] });
  };
  const score = useMemo(() => {
    const labels = new Map<string, string>();
    BLOCKS.forEach((b) => {
      const title = b.service && bySlug.get(b.service.slug)?.title;
      labels.set(b.id, title || b.service?.fallbackTitle || b.short);
    });
    return buildScore(labels, bySlug.get(AI_SLUG)?.title ?? NOW.fallbackTitle, (b) => !services.length || (!!b.service && bySlug.has(b.service.slug)));
  }, [bySlug, services.length]);
  const shown = score.services.map((b) => ({ beat: b, service: serviceOf(b.block)! }));
  // A service added in the admin that the board has no part for yet still gets a way in
  const extras = services.filter((s) => s.slug !== AI_SLUG && !BLOCKS.some((b) => b.service?.slug === s.slug));
  const planHeading = PLAN.plain.replace('{n}', NUMBER_WORDS[shown.length + 1] ?? String(shown.length + 1));
  const planParts = [...shown.map(({ beat }) => beat.block), AI_BLOCK, YOUR_BLOCK];
  const jumpList = [{ id: AI_BLOCK.id, name: ai.title, featured: true }, ...shown.map(({ beat, service }) => ({ id: beat.block.id, name: service.title, featured: false }))];

  /** To any part of the board: the camera flies there, rather than the page racing through everything in between */
  const go = (id: string) => {
    const stage = rootRef.current?.querySelector<HTMLElement>('[data-chip="stage"]');
    const stop = score.stops.find((st) => st.id === id);
    if (!stage || !stop) return;
    const top = stage.getBoundingClientRect().top + window.scrollY;
    const run = Math.max(1, stage.offsetHeight - window.innerHeight);
    const target = id === YOUR_BLOCK.id ? top + run : top + (stop.s / score.total) * run;
    if (flyRef.current) flyRef.current(target);
    else jumpToY(target);
  };

  const closeOrder = () => {
    orderRef.current = null;
    setOrder(null);
  };
  /** An order: the surface spells where it is going, the camera follows it along the copper, and the part answers */
  const giveOrder = (text: string) => {
    const choices: OrderChoice[] = [...shown.map(({ beat, service }) => ({ block: beat.block, service })), { block: AI_BLOCK, service: ai }];
    const match = routeOrder(text, choices);
    const block = match?.block ?? YOUR_BLOCK;
    askedRef.current = true;
    engineRef.current?.spell(match ? block.short.replace(/ \/ /g, ' ') : 'NEW');
    orderRef.current = block;
    setOrder({ text, block, service: match?.service ?? null });
  };

  /** Skip: straight to the whole form */
  const skip = () => {
    const box = rootRef.current?.querySelector<HTMLElement>('[data-chip="form"]');
    if (!box) return;
    const target = box.getBoundingClientRect().top + window.scrollY - 64;
    if (flyRef.current) flyRef.current(target);
    else jumpToY(target);
  };

  // ---- The opening words rise in once the page loader has cleared ----
  useEffect(() => {
    if (isIntroReady) introRef.current?.restart();
  }, [isIntroReady]);

  useGSAP(
    () => {
      const root = rootRef.current!;
      if (attempt > 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setStill(true);
        return;
      }
      const canvas = root.querySelector<HTMLCanvasElement>('[data-chip="canvas"]')!;
      const engine = createChip(canvas, () => setAttempt((n) => n + 1), () => setStill(true));
      if (!engine) {
        setStill(true);
        return;
      }
      engineRef.current = engine;

      // ---- Words ----
      const S = score;
      const scrub = window.matchMedia('(pointer: fine)').matches ? true : 0.3;
      const rise = { y: 0, autoAlpha: 1, ease: 'sine.out' };
      const stageEl = root.querySelector<HTMLElement>('[data-chip="stage"]')!;
      const wordsEl = root.querySelector<HTMLElement>('[data-chip="words"]')!;

      introRef.current = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('[data-hero="kicker"]', { y: 12, autoAlpha: 0, duration: 0.8 }, 0.05)
        .from('[data-hero="word"]', { yPercent: 110, duration: 1.2, stagger: 0.12 }, 0.1)
        .from('[data-hero="in"]', { y: 18, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0.5);
      if (attempt > 0) introRef.current.progress(1); // (restarting: the page is long past its opening)

      // One timeline for all the words on the page, in screens of scrolling
      const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: stageEl, start: 'top top', end: 'bottom bottom', scrub } });
      tl.to({}, { duration: S.total }, 0);
      tl.to('[data-hero="copy"]', { y: -50, autoAlpha: 0, duration: 0.34, ease: 'sine.in' }, S.hero.out).to('[data-hero="shade"]', { autoAlpha: 0, duration: 0.3 }, S.hero.out + 0.08);

      const planEl = root.querySelector('[data-beat="plan"]');
      const planQ = gsap.utils.selector(planEl);
      tl.fromTo(planEl, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.14, ease: 'sine.inOut' }, S.plan.in)
        .fromTo(planQ('[data-w]'), { y: 14, autoAlpha: 0 }, { ...rise, duration: 0.14, stagger: 0.012 }, S.plan.in)
        .fromTo(planQ('[data-b]'), { y: 14, autoAlpha: 0 }, { ...rise, duration: 0.14 }, S.plan.in + 0.1)
        .to(planEl, { autoAlpha: 0, duration: 0.14, ease: 'sine.inOut' }, S.plan.out);

      const card = (el: Element | null, a: number, b: number) => {
        if (!el) return;
        const q = gsap.utils.selector(el);
        tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.16, ease: 'sine.inOut' }, a)
          .fromTo(q('[data-in]'), { y: 22 }, { y: 0, duration: 0.2, ease: 'sine.out' }, a)
          .fromTo(q('[data-k]'), { y: 8, autoAlpha: 0 }, { ...rise, duration: 0.1 }, a + 0.03)
          .fromTo(q('[data-t]'), { yPercent: 100 }, { yPercent: 0, duration: 0.16, ease: 'sine.out' }, a + 0.04)
          .fromTo(q('[data-link]'), { y: 8, autoAlpha: 0 }, { ...rise, duration: 0.1 }, a + 0.13)
          .to(q('[data-in]'), { y: -18, duration: 0.14, ease: 'sine.in' }, b)
          .to(el, { autoAlpha: 0, duration: 0.14, ease: 'sine.inOut' }, b);
        // (a service may have no description or features in the admin)
        if (q('[data-d]').length) tl.fromTo(q('[data-d]'), { y: 10, autoAlpha: 0 }, { ...rise, duration: 0.12 }, a + 0.07);
        if (q('[data-f]').length) tl.fromTo(q('[data-f]'), { y: 6, autoAlpha: 0 }, { ...rise, duration: 0.07, stagger: 0.006 }, a + 0.1);
      };
      S.services.forEach((b) => card(root.querySelector(`[data-beat="${b.block.id}"]`), b.arrive - 0.32, b.leave - 0.04));
      card(root.querySelector('[data-beat="ai-card"]'), S.ai.card[0], S.ai.card[1]);

      // The centre of the board
      const line = (name: string, a: number, b: number) => {
        const el = root.querySelector(`[data-beat="${name}"]`);
        const q = gsap.utils.selector(el);
        tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06, ease: 'sine.inOut' }, a)
          .fromTo(q('[data-w]'), { y: 14, autoAlpha: 0 }, { ...rise, duration: 0.12, stagger: 0.01 }, a)
          .to(el, { autoAlpha: 0, duration: 0.12, ease: 'sine.inOut' }, b);
      };
      line('ai-fact', S.ai.from + 0.42, S.ai.factOut - 0.1);
      line('ai-b1', S.ai.b1[0], S.ai.b1[1] - 0.04);
      line('ai-b2', S.ai.b2[0], S.ai.b2[1] - 0.04);
      line('ai-b3', S.ai.b3[0], S.ai.b3[1] - 0.04);
      const askEl = root.querySelector('[data-beat="ai-ask"]');
      tl.fromTo(askEl, { y: 18, autoAlpha: 0 }, { ...rise, duration: 0.16 }, S.ai.ask[0]).to(askEl, { y: -14, autoAlpha: 0, duration: 0.12, ease: 'sine.in' }, S.ai.ask[1] - 0.04);

      const closeEl = root.querySelector('[data-beat="close"]');
      const closeQ = gsap.utils.selector(closeEl);
      tl.fromTo(closeEl, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08, ease: 'sine.inOut' }, S.close.arrive - 0.3)
        .fromTo(closeQ('[data-w]'), { y: 14, autoAlpha: 0 }, { ...rise, duration: 0.14, stagger: 0.012 }, S.close.arrive - 0.3)
        .fromTo(closeQ('[data-b]'), { y: 14, autoAlpha: 0 }, { ...rise, duration: 0.16 }, S.close.arrive - 0.12);

      // ---- The page, measured ----
      let top = 0;
      let run = 1;
      const measure = () => {
        const zoom = screenZoom(window.innerWidth, window.innerHeight);
        root.querySelectorAll<HTMLElement>(ZOOMED).forEach((el) => {
          el.style.zoom = zoom;
        });
        top = stageEl.getBoundingClientRect().top + window.scrollY;
        run = Math.max(1, stageEl.offsetHeight - window.innerHeight);
      };
      measure();
      ScrollTrigger.addEventListener('refresh', measure);

      // ---- The visitor's hand: hover to light a part, click to fly to it or send a ring through its pins, drag to turn the board ----
      const pickable: Block[] = [...S.services.map((b) => b.block), AI_BLOCK, YOUR_BLOCK];
      const partAt = (p: [number, number] | null) => (p ? (pickable.find((b) => p[0] >= b.rect[0] && p[0] <= b.rect[2] && p[1] >= b.rect[1] && p[1] <= b.rect[3]) ?? null) : null);
      const onWords = (t: EventTarget | null) => t instanceof Element && !!t.closest('a, button, input, label, form, header, footer, [data-card], [data-chip="form"], [data-hero="copy"]');
      let handX = -1;
      let handY = -1;
      let handLive = false;
      let handFade = 0;
      let handOnWords = false;
      let pressed = false;
      let pressX = 0;
      let pressY = 0;
      let dragX = 0;
      let moved = 0;
      let orbit = 0;
      let orbitGoal = 0;
      let currentPart: Block | null = null;
      const tap: [number, number, number] = [0, 0, -1];
      let tapAt = -10;
      let clock = 0;

      const onDown = (e: PointerEvent) => {
        handX = e.clientX;
        handY = e.clientY;
        handLive = true;
        handOnWords = onWords(e.target);
        if (handOnWords) return;
        pressed = true;
        moved = 0;
        pressX = e.clientX;
        pressY = e.clientY;
        dragX = e.clientX;
      };
      const onMove = (e: PointerEvent) => {
        handX = e.clientX;
        handY = e.clientY;
        handLive = true;
        handOnWords = onWords(e.target);
        if (!pressed) return;
        moved = Math.max(moved, Math.abs(e.clientX - pressX), Math.abs(e.clientY - pressY));
        // (mostly sideways is a turn of the board; mostly up and down is the page scrolling)
        if (Math.abs(e.clientX - pressX) > Math.abs(e.clientY - pressY)) orbitGoal = Math.max(-60, Math.min(60, orbitGoal + (e.clientX - dragX) * 0.24));
        dragX = e.clientX;
      };
      const onUp = (e: PointerEvent) => {
        if (pressed && moved < 7 && window.scrollY < top + run) {
          const point = engine.onBoard(e.clientX, e.clientY);
          const part = partAt(point);
          if (part && part !== currentPart) go(part.id);
          else if (point) {
            tap[0] = point[0];
            tap[1] = point[1];
            tapAt = clock;
          }
        }
        pressed = false;
        if (e.pointerType !== 'mouse') handLive = false;
      };
      const onCancel = () => {
        pressed = false;
        handLive = false;
      };
      const onTouch = (e: TouchEvent) => {
        const t = e.touches[0];
        if (!t) return;
        handX = t.clientX;
        handY = t.clientY;
        handLive = true;
      };
      window.addEventListener('pointerdown', onDown, { passive: true });
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerup', onUp, { passive: true });
      window.addEventListener('pointercancel', onCancel, { passive: true });
      window.addEventListener('touchmove', onTouch, { passive: true });

      // ---- Only runs while the board is on screen ----
      let onScreen = true;
      const seen = new IntersectionObserver(([e]) => {
        onScreen = e.isIntersecting;
      });
      seen.observe(root);

      const hudRoot = root.querySelector<HTMLElement>('[data-chip="hud"]')!;
      const hudTarget = root.querySelector<HTMLElement>('[data-hud="target"]')!;
      const hudField = root.querySelector<HTMLElement>('[data-hud="field"]')!;
      const tipEl = root.querySelector<HTMLElement>('[data-chip="tip"]')!;
      const chrome = gsap.utils.toArray<HTMLElement>('[data-chip="nav"], [data-chip="credits"], [data-chip="skip"]', root);
      const labelEls = gsap.utils.toArray<HTMLElement>('[data-label]', root);
      const labelCentres = labelEls.map((el) => centreOf(planParts.find((x) => x.id === el.dataset.label)!));
      let chromeShown = false;
      let hudShown = true;
      let shownTarget = '';
      let shownField = '';
      let shownNav = -2;
      let shownTip = '';
      let shownCursor = '';
      let lastTime = gsap.ticker.time;
      let wordIndex = 0;
      let nextWordAt = 0;
      let formed = false;
      let smoothed = -1;
      const lean: [number, number] = [0, 0];
      const on = new Float32Array(9);
      const prog = new Float32Array(9);
      const openGoal = new Float32Array(9);
      const open = new Float32Array(9);
      open[KIND.yours] = 1;
      const hand: [number, number, number] = [0, 0, 0];
      const arrow: [number, number] = [0, 0];
      const uiPart = BLOCKS.find((b) => b.kind === 'ui')!;
      const mediaPart = BLOCKS.find((b) => b.kind === 'media')!;
      const [uiX, uiZ] = centreOf(uiPart);
      arrow[0] = uiX;
      arrow[1] = uiZ;
      const hover = { rect: [0, 0, 0, 0] as [number, number, number, number], kind: -1, on: 0 };
      const errorEl = root.querySelector<HTMLElement>('[data-ai="error"]');
      let shownError = '';
      let orderPhase = 0;
      let orderClock = 0;
      let orderBlock: Block | null = null;
      let orderCam: Key[] = [];
      let orderLink: Point[] | null = null;
      let mediaHand = 0;
      let lastCam: Camera | null = null;
      let flight = -1;
      let flightFrom: Camera | null = null;
      let wordsBack = true;

      flyRef.current = (y: number) => {
        if (!lastCam) {
          jumpToY(y);
          return;
        }
        wordsBack = false;
        gsap.to(wordsEl, {
          autoAlpha: 0,
          duration: 0.22,
          ease: 'sine.in',
          overwrite: true,
          onComplete: () => {
            flightFrom = lastCam;
            flight = 0;
            jumpToY(y);
            smoothed = -1;
          },
        });
      };

      const showChrome = (visible: boolean) => {
        chromeShown = visible;
        chrome.forEach((el) => {
          el.classList.toggle('invisible', !visible);
          el.classList.toggle('opacity-0', !visible);
        });
      };

      const tick = (time: number) => {
        if (!onScreen || document.hidden) return;
        const dt = Math.min(0.25, Math.max(0.001, time - lastTime));
        lastTime = time;
        clock = time;
        const y = window.scrollY;
        const raw = Math.min(1, Math.max(0, (y - top) / run)) * S.total;
        // (a little weight on the camera, so that scrolling turns into one long, even glide)
        if (smoothed < 0) smoothed = raw;
        else smoothed += (raw - smoothed) * (1 - Math.exp(-dt * 8));
        const s = smoothed;

        const w = window.innerWidth;
        const h = window.innerHeight;
        const aspect = w / h;

        // ---- Which parts are open, and which are awake ----
        on.fill(0);
        prog.fill(0);
        openGoal.fill(0);
        openGoal[KIND.yours] = 1;
        let web = 0;
        S.services.forEach((b) => {
          const k = KIND[b.block.kind];
          openGoal[k] = smooth(s, b.arrive - 0.42, b.arrive - 0.14) * (1 - smooth(s, b.leave + 0.06, b.leave + 0.34));
          on[k] = smooth(s, b.arrive - 0.3, b.arrive) * (1 - smooth(s, b.leave + 0.02, b.leave + 0.28));
          prog[k] = ramp(s, b.arrive - 0.18, b.leave - 0.02);
          if (b.block.kind === 'web') web = on[k] * smooth(prog[k], 0.02, 0.3);
        });
        const A = S.ai;
        openGoal[KIND.ai] = smooth(s, A.arrive - 0.42, A.arrive - 0.14) * (1 - smooth(s, A.leave + 0.06, A.leave + 0.34));
        on[KIND.ai] = smooth(s, A.arrive - 0.3, A.arrive) * (1 - smooth(s, A.leave + 0.02, A.leave + 0.3));
        on[KIND.yours] = smooth(s, S.close.from + 0.2, S.close.arrive);

        const dim = smooth(s, A.dim[0], A.dim[1]);
        const one = smooth(s, A.oneIn, A.oneIn + 0.1) * (1 - smooth(s, A.wake[0] + 0.08, A.wake[0] + 0.3));
        const wake = Math.pow(ramp(s, A.wake[0], A.wake[1]), 1.6) * 0.86;
        const sync = smooth(s, A.sync[0], A.sync[1]);
        const form = smooth(s, A.form[0], A.form[1]);
        const net = smooth(s, A.net[0], A.net[1]) * (1 - smooth(s, A.form[0] - 0.08, A.form[0] + 0.14));

        // until the visitor gives it an order, it practises
        if (form > 0.02 && !askedRef.current) {
          if (!formed) {
            formed = true;
            engine.spell(NOW.words[0]);
            nextWordAt = time + 5;
          } else if (time > nextWordAt) {
            wordIndex = (wordIndex + 1) % NOW.words.length;
            engine.spell(NOW.words[wordIndex]);
            nextWordAt = time + 4.2;
          }
        }

        // ---- The camera ----
        const leanEase = 1 - Math.exp(-dt * 2.4);
        const nx = handLive && handX >= 0 ? (handX / w) * 2 - 1 : 0;
        const ny = handLive && handY >= 0 ? 1 - (handY / h) * 2 : 0;
        lean[0] += (nx - lean[0]) * leanEase;
        lean[1] += (ny - lean[1]) * leanEase;
        // a turned board comes back on its own as the page moves on
        if (!pressed && Math.abs(raw - smoothed) > 0.004) orbitGoal *= Math.exp(-dt * 2.6);
        orbit += (orbitGoal - orbit) * (1 - Math.exp(-dt * 7));
        const inHero = 1 - smooth(s, 0, 0.5);
        let cam = cameraAt(S.keys, s, aspect, lean, 2 + inHero * 5, orbit);

        // ---- Training: how far it has come, and how wrong it still is ----
        const learnMix = smooth(s, A.learn[0], A.learn[0] + 0.24) * (1 - smooth(s, A.form[0] - 0.05, A.form[0] + 0.2));
        const learnT = ramp(s, A.learn[0] + 0.12, A.learn[1] - 0.02);
        if (errorEl && s > A.learn[0] && s < A.net[1]) {
          const errorText = errorAt(learnT).toFixed(2);
          if (errorText !== shownError) {
            shownError = errorText;
            errorEl.textContent = errorText;
          }
        }

        // ---- The copper the camera is following ----
        let linkPath: Point[] | null = null;
        let linkT = 0;
        let linkAlpha = 0;
        const follow = (path: Point[] | null, from: number, arrive: number) => {
          if (!path || s < from - 0.02 || s > arrive + 0.3) return;
          linkPath = path;
          linkT = ramp(s, from, arrive - 0.12);
          linkAlpha = smooth(s, from - 0.02, from + 0.06) * (1 - smooth(s, arrive + 0.02, arrive + 0.26));
        };
        S.services.forEach((b) => follow(b.link, b.from, b.arrive));
        follow(A.link, A.from, A.arrive);
        follow(S.close.link, S.close.from, S.close.arrive);

        // ---- An order on its way: the camera goes out over the whole board, then down onto the part that took it ----
        if (orderRef.current && (s < A.ask[0] - 0.04 || s > A.ask[1] + 0.04)) closeOrder();
        const wantedBlock = orderRef.current;
        if (wantedBlock && wantedBlock !== orderBlock) {
          orderBlock = wantedBlock;
          orderCam = orderKeys(S, wantedBlock);
          orderLink = wantedBlock.kind === 'ai' ? null : linkBetween('ai', wantedBlock.kind);
          orderPhase = Math.min(orderPhase, 1);
          orderClock = 0;
        }
        const phaseGoal = wantedBlock ? 2 : 0;
        const phaseStep = dt * 0.9;
        orderPhase += Math.max(-phaseStep, Math.min(phaseStep, phaseGoal - orderPhase));
        orderClock = orderPhase >= 1.3 ? orderClock + dt : 0;
        if (orderPhase > 0.001 && orderBlock) {
          cam = mixCameras(cam, cameraAt(orderCam, orderPhase, aspect, lean, 2, orbit), smooth(orderPhase, 0, 0.3));
          const k = KIND[orderBlock.kind];
          openGoal[k] = Math.max(openGoal[k], smooth(orderPhase, 0.9, 1.5));
          on[k] = Math.max(on[k], smooth(orderPhase, 1.05, 1.85));
          if (orderBlock.kind !== 'ai') {
            prog[k] = ramp(orderClock, 0, 3.4);
            if (orderBlock.kind === 'web') web = on[k] * smooth(prog[k], 0.02, 0.3);
          }
          if (orderLink) {
            linkPath = orderLink;
            linkT = smooth(orderPhase, 0.2, 1.2);
            linkAlpha = smooth(orderPhase, 0, 0.15);
          }
        }

        // ---- A jump across the board: lift off, cross, come down ----
        if (flight >= 0 && flightFrom) {
          flight = Math.min(1, flight + dt / 1.6);
          cam = flyBetween(flightFrom, cam, smoother(flight));
          if (flight > 0.6 && !wordsBack) {
            wordsBack = true;
            gsap.to(wordsEl, { autoAlpha: 1, duration: 0.6, ease: 'sine.out', overwrite: true });
          }
          if (flight >= 1) flight = -1;
        }
        lastCam = cam;

        // ---- The lids: they ease on and off in their own time, so that nothing ever pops ----
        const lidEase = 1 - Math.exp(-dt * 5.5);
        for (let i = 0; i < 9; i++) {
          const next = open[i] + (openGoal[i] - open[i]) * lidEase;
          open[i] = Math.abs(openGoal[i] - next) < 0.002 ? openGoal[i] : next;
        }

        // ---- The part the camera is on ----
        let current: Block | null = null;
        S.services.forEach((b) => {
          if (s >= b.arrive - 0.2 && s <= b.leave + 0.1) current = b.block;
        });
        if (s >= A.arrive - 0.2 && s <= A.leave + 0.1) current = AI_BLOCK;
        if (s >= S.close.arrive - 0.2) current = YOUR_BLOCK;
        if (orderPhase > 1.2 && orderBlock) current = orderBlock;
        currentPart = current;

        // ---- The hand on the board ----
        const point = handLive && handX >= 0 && !handOnWords ? engine.onBoard(handX, handY) : null;
        handFade += ((point ? 1 : 0) - handFade) * (1 - Math.exp(-dt * 6));
        if (point) {
          hand[0] = point[0];
          hand[1] = point[1];
        }
        hand[2] = handFade;
        const under = partAt(point);
        // a part that isn't the one in view lights up and offers to fly there
        const offered = under && under !== current && y < top + run ? under : null;
        hover.on += ((offered ? 1 : 0) - hover.on) * (1 - Math.exp(-dt * 9));
        if (offered) {
          hover.rect = offered.rect;
          hover.kind = KIND[offered.kind];
        }
        const tipText = offered ? offered.short : '';
        if (tipText !== shownTip) {
          shownTip = tipText;
          tipEl.textContent = tipText;
          tipEl.style.opacity = tipText ? '1' : '0';
        }
        if (tipText) tipEl.style.transform = `translate3d(${handX + 16}px,${handY + 18}px,0)`;
        const cursor = offered ? 'pointer' : pressed && moved > 6 ? 'grabbing' : point ? 'grab' : '';
        if (cursor !== shownCursor) {
          shownCursor = cursor;
          stageEl.style.cursor = cursor;
        }

        // the media part's timeline runs under the hand
        const overMedia = under === mediaPart && current === mediaPart && point;
        if (overMedia) mediaHand = (point[0] - mediaPart.rect[0]) / (mediaPart.rect[2] - mediaPart.rect[0]);
        if (overMedia) prog[KIND.media] = Math.max(0, Math.min(1, mediaHand));

        // the arrow on the interface part follows the hand when it is over the part, and otherwise wanders
        const overUi = under === uiPart && point;
        const wantX = overUi ? point[0] : uiX + Math.sin(time * 0.53) * 0.18 + Math.sin(time * 1.3) * 0.03;
        const wantZ = overUi ? point[1] : uiZ + Math.cos(time * 0.41) * 0.14;
        const arrowEase = 1 - Math.exp(-dt * (overUi ? 14 : 2.2));
        arrow[0] += (wantX - arrow[0]) * arrowEase;
        arrow[1] += (wantZ - arrow[1]) * arrowEase;

        tap[2] = time - tapAt;

        engine.frame({
          time,
          dt,
          cam,
          boot: ramp(s, S.boot[0], S.boot[1]) * 2.5,
          open,
          on,
          prog,
          hand,
          arrow,
          tap,
          hover,
          ai: [dim, one, wake, sync],
          form,
          net,
          web,
          learn: [learnMix, learnT],
          link: { path: linkPath, t: linkT, alpha: linkAlpha },
          quiet: Math.max(...on),
          // the lights inside the part go down for the first switch, and come part way back as the rest wake
          room: 1 - 0.92 * dim * (1 - 0.3 * smooth(s, A.wake[1] - 0.1, A.net[1])) * (1 - smooth(s, A.leave, A.leave + 0.4)),
        });

        // ---- The names of the parts stay on their parts, for keyboards ----
        if (s > S.plan.in - 0.06 && s < S.plan.out + 0.2) {
          labelEls.forEach((el, i) => {
            const [px, py] = engine.project(labelCentres[i][0], 0.03, labelCentres[i][1]);
            el.style.transform = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0) translate(-50%,-50%)`;
          });
        }

        // ---- The readout: written only when it changes ----
        let target = 'Board';
        S.services.forEach((b) => {
          if (s >= b.from + TARGET_AT * (b.arrive - b.from)) target = b.block.short;
        });
        if (s >= A.from + TARGET_AT * (A.arrive - A.from)) target = AI_BLOCK.short;
        if (s >= A.oneIn && s < A.wake[0] + 0.1) target = 'One switch';
        if (s >= S.close.from + TARGET_AT * (S.close.arrive - S.close.from)) target = YOUR_BLOCK.short;
        if (orderPhase > 1.2 && orderBlock) target = orderBlock.short;
        if (target !== shownTarget) {
          shownTarget = target;
          hudTarget.textContent = target;
          gsap.fromTo(hudTarget, { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out', overwrite: true });
        }
        const fieldText = fieldOfView(2 * cam.dist * aspect * Math.tan(FOV / 2));
        if (fieldText !== shownField) {
          shownField = fieldText;
          hudField.textContent = fieldText;
        }

        // ---- Side menu and credits, once past the opening words ----
        const wantChrome = s > 0.32 && s < S.total - 0.32;
        if (wantChrome !== chromeShown) showChrome(wantChrome);
        // (on a short laptop screen the opening words need the corner the readout sits in)
        const wantHud = s < S.total - 0.32 && (s > 0.3 || h >= 780 || aspect < 1.15 || w < 1024);
        if (wantHud !== hudShown) {
          hudShown = wantHud;
          hudRoot.style.opacity = wantHud ? '1' : '0';
        }
        let currentStop = -1;
        S.stops.forEach((st, i) => {
          if (s >= st.s - 0.45) currentStop = i;
        });
        if (currentStop !== shownNav) {
          shownNav = currentStop;
          navChangedRef.current(currentStop);
        }
      };
      gsap.ticker.add(tick);

      const ro = new ResizeObserver(() => {
        engine.resize();
        ScrollTrigger.refresh();
      });
      ro.observe(canvas);

      // Arriving with a part's name in the address
      const hash = window.location.hash.slice(1);
      if (hash && S.stops.some((st) => st.id === decodeURIComponent(hash))) {
        const stop = S.stops.find((st) => st.id === decodeURIComponent(hash))!;
        jumpToY(top + (stop.s / S.total) * run);
      }

      return () => {
        gsap.ticker.remove(tick);
        flyRef.current = null;
        ScrollTrigger.removeEventListener('refresh', measure);
        window.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('touchmove', onTouch);
        seen.disconnect();
        ro.disconnect();
        engine.destroy();
        engineRef.current = null;
      };
    },
    { scope: rootRef, dependencies: [attempt, score], revertOnUpdate: true },
  );

  const heroCopy = (
    <div className="max-w-[46rem] [@media(min-aspect-ratio:23/20)]:max-w-[min(46rem,50vw)]">
      <p data-hero="kicker" className={`${KICKER} mb-3 sm:mb-4`}>
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current animate-pulse" />
        {HERO.kicker}
      </p>
      <h1 id="chip-title" className="heading-page text-midnight">
        <span className="block overflow-hidden pb-[0.05em]"><span data-hero="word" className="block">{HERO.plain}</span></span>
        <span className="block overflow-hidden pb-[0.05em]"><span data-hero="word" className="heading-accent heading-serif">{HERO.bright}</span></span>
      </h1>
      <p data-hero="in" className={`mt-3 sm:mt-5 max-w-2xl text-[15px] sm:text-base lg:text-lg leading-relaxed [@media(max-height:480px)]:hidden ${BODY}`}>{HERO.text}</p>
      <nav data-hero="in" aria-label="Jump to a service" className="mt-3.5 sm:mt-6 [@media(max-height:620px)]:hidden">
        <ul className="flex flex-wrap gap-1.5 sm:gap-2">
          {jumpList.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => go(item.id)}
                className={`inline-flex items-center gap-2 rounded-lg border px-2.5 sm:px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider font-bold transition-[color,background-color,border-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue
                  ${item.featured ? CHIP_ON : CHIP}`}
              >
                {item.featured && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full animate-pulse bg-white" />}
                {item.name}
              </button>
            </li>
          ))}
          {extras.map((s) => (
            <li key={s.slug}>
              <Link href={`/services/${s.slug}`} className={`inline-flex items-center gap-2 rounded-lg border px-2.5 sm:px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider font-bold transition-[color,background-color,border-color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${CHIP}`}>
                {s.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p data-hero="in" className={`mt-3.5 sm:mt-6 ${KICKER} [@media(max-height:480px)]:hidden`}>
        <Icon name="south" className="text-[15px] animate-bounce" /> {HERO.hint}
      </p>
    </div>
  );

  // ---- Animations off, or no way to draw the board: the same words, in order, over stills ----
  if (still) {
    return (
      <div ref={rootRef} className="relative bg-white text-midnight">
        <section aria-labelledby="chip-title" className="relative min-h-svh overflow-hidden">
          <Still name="package" />
          <div className={`relative flex min-h-svh items-center bg-white/72 ${CONTAINER} pt-32 pb-16`}>{heroCopy}</div>
        </section>
        {[...shown.map(({ beat, service }) => ({ id: beat.block.id, part: beat.block.part, service, featured: false })), { id: AI_BLOCK.id, part: AI_BLOCK.part, service: ai, featured: true }].map(({ id, part, service, featured }) => (
          <section key={id} id={id} className="relative min-h-svh overflow-hidden">
            <Still name={id} />
            <div className="relative flex min-h-svh flex-col justify-end px-4 sm:px-6 py-16 bg-white/72">
              <div className="max-w-xl">
                <ServiceCard service={service} kicker={`${part} // Our service`} featured={featured} />
              </div>
            </div>
          </section>
        ))}
        <section id={YOUR_BLOCK.id} className="relative px-4 pt-24 pb-10 text-center">
          <p className={`${KICKER} mb-3`}>{CLOSE.kicker}</p>
          <h2 className="heading-section mx-auto max-w-5xl text-midnight">
            <span className="block">{CLOSE.plain}</span>
            <span className="heading-accent block">{CLOSE.bright}</span>
          </h2>
        </section>
        <div className="relative px-3 sm:px-6 pb-10">
          <div className="mx-auto max-w-[1400px]">
            <ProjectForm />
          </div>
          <Credits id="chip-credits-flow" className="relative mt-4 text-center" popover="left-1/2 -translate-x-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative bg-white text-midnight">
      <canvas key={attempt} data-chip="canvas" aria-hidden="true" className="fixed left-0 top-0 h-lvh w-full" />

      <div className="relative">
        <section data-chip="stage" aria-labelledby="chip-title" className="relative touch-pan-y" style={{ height: `${(score.total + 1) * 100}svh` }}>
          <div data-chip="words" className="sticky top-0 h-svh overflow-hidden">
            {/* ---- Opening: what we do, and the whole board ---- */}
            <div data-hero="shade" aria-hidden="true" className={SHADE_HERO} />
            <div data-hero="copy" data-zoom className={`absolute inset-x-0 top-0 ${CONTAINER} pt-[calc(var(--header-h)+1rem)] [@media(min-aspect-ratio:23/20)]:inset-y-0 [@media(min-aspect-ratio:23/20)]:flex [@media(min-aspect-ratio:23/20)]:items-center [@media(min-aspect-ratio:23/20)]:pt-[var(--header-h)]`}>
              {heroCopy}
            </div>

            {/* ---- From above: every part, with its name on its lid ---- */}
            <div data-beat="plan" className="invisible pointer-events-none absolute inset-0">
              <div aria-hidden="true" className={SHADE_PLAN} />
              <div data-zoom className={`absolute inset-x-0 top-[calc(env(safe-area-inset-top)+2.75rem)] ${CONTAINER} [@media(min-aspect-ratio:23/20)]:inset-y-0 [@media(min-aspect-ratio:23/20)]:top-0 [@media(min-aspect-ratio:23/20)]:flex [@media(min-aspect-ratio:23/20)]:items-center`}>
                <div className="max-w-[27rem]">
                  <p data-w className={`${KICKER} mb-3`}>
                    <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current animate-pulse" />
                    {PLAN.kicker}
                  </p>
                  <h2 className="heading-section text-midnight">
                    <span className="block"><Words text={planHeading} /></span>
                    <span data-b className="heading-accent block">{PLAN.bright}</span>
                  </h2>
                  <p data-b className={`mt-3 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider ${READOUT_KEY} [@media(max-height:480px)]:hidden`}>{PLAN.hint}</p>
                </div>
              </div>
              <ul>
                {planParts.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      data-label={b.id}
                      onClick={() => go(b.id)}
                      style={{ transform: 'translate3d(-200px,-200px,0)' }}
                      className="sr-only pointer-events-auto left-0 top-0 whitespace-nowrap rounded-md border border-brand-blue/30 bg-white px-2 py-1 font-mono text-[11px] uppercase tracking-wider font-bold text-midnight focus:not-sr-only focus:absolute focus:outline-2 focus:outline-offset-2 focus:outline-brand-blue"
                    >
                      Fly to {b.short}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* ---- One part at a time ---- */}
            {shown.map(({ beat, service }) => (
              <div key={beat.block.id} id={beat.block.id} data-beat={beat.block.id} aria-label={service.title} className="invisible pointer-events-none absolute inset-0">
                <div data-zoom className={CARD_PLACE}>
                  <div className={CONTAINER}>
                    <div data-in data-card className={`${CARD} ${CARD_WIDTH}`}>
                      <ServiceCard service={service} kicker={`${beat.block.part} // Our service`} />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* ---- The centre of the board ---- */}
            <div id={AI_BLOCK.id} data-beat="ai-fact" aria-label={ai.title} className="invisible pointer-events-none absolute inset-0 text-center">
              <div className="absolute inset-x-0 bottom-[max(1.5rem,5svh)] px-4">
                <div data-zoom data-card className={`${LINE_CARD} max-w-4xl`}>
                  <p className="heading-lead text-midnight"><Words text={NOW.fact} /></p>
                </div>
              </div>
            </div>
            {NOW.beats.map((text, i) => (
              <div key={text} data-beat={`ai-b${i + 1}`} className="invisible pointer-events-none absolute inset-0 text-center">
                <div className="absolute inset-x-0 bottom-[max(1.5rem,5svh)] px-4">
                  <div data-zoom data-card className={`${LINE_CARD} max-w-3xl`}>
                    <p className="heading-lead text-midnight"><Words text={text} /></p>
                    {i === 2 && (
                      <>
                        <p className={`mx-auto mt-2 max-w-xl text-sm sm:text-base ${BODY} [@media(max-height:620px)]:hidden`}>{NOW.trainNote}</p>
                        <p className={`mt-2 font-mono text-[11px] sm:text-xs uppercase tracking-[0.2em] font-bold ${READOUT_KEY}`}>Error <span data-ai="error" className="tabular-nums text-brand-blue">0.00</span></p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div data-beat="ai-card" className="invisible pointer-events-none absolute inset-0">
              <div data-zoom className={CARD_PLACE}>
                <div className={CONTAINER}>
                  <div data-in data-card className={`${CARD} ${CARD_WIDTH}`}>
                    <ServiceCard service={ai} kicker={`${AI_BLOCK.part} // Our service`} featured />
                  </div>
                </div>
              </div>
            </div>
            <div data-beat="ai-ask" className="invisible pointer-events-none absolute inset-0 text-center">
              <div className={`absolute inset-0 transition-opacity duration-500 ${order ? 'invisible opacity-0' : ''}`}>
                <div className="absolute inset-x-0 bottom-[max(0.75rem,2.5svh)] px-3 sm:px-4">
                  <div data-zoom data-card className={`${CARD} mx-auto max-w-2xl`}>
                  <p className="heading-section text-midnight">{NOW.ask}</p>
                  <p className={`mx-auto mt-2 mb-3 max-w-md text-sm sm:text-base ${BODY} [@media(max-height:620px)]:hidden`}>{NOW.askNote}</p>
                  <div className="[@media(max-height:620px)]:mt-2.5">
                    <OrderConsole onOrder={giveOrder} />
                  </div>
                  <div className="[@media(max-height:620px)]:hidden">
                    <OpenLink slug={ai.slug} label="Explore AI services" />
                  </div>
                  </div>
                </div>
              </div>
            </div>
            {order && (
              <div className="text-left">
                <OrderAnswer key={`${order.block.id}-${order.text}`} order={order} onClose={closeOrder} />
              </div>
            )}

            {/* ---- Along the copper to the one socket nobody has filled yet ---- */}
            <div id={YOUR_BLOCK.id} data-beat="close" className="invisible pointer-events-none absolute inset-0 text-center">
              <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+3rem)] px-3 sm:px-8">
                <div data-zoom data-card className={`${LINE_CARD} max-w-5xl sm:!px-10 sm:!py-6`}>
                <p data-w className={`${KICKER} mb-3`}>
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current animate-pulse" />
                  {CLOSE.kicker}
                </p>
                <h2 className="heading-section mx-auto max-w-5xl text-midnight">
                  <span className="block"><Words text={CLOSE.plain} /></span>
                  <span data-b className="heading-accent block">{CLOSE.bright}</span>
                </h2>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="relative -mt-[34svh] px-3 sm:px-6 pb-10 sm:pb-14">
          <div data-chip="form" className="mx-auto max-w-[1400px]">
            <ProjectForm />
          </div>
          <Credits id="chip-credits-flow" className="relative mt-4 text-center lg:hidden" popover="left-1/2 -translate-x-1/2" />
        </div>
      </div>

      {/* The readout, as on the About page: what the camera is on, and how much of the board it can see */}
      <dl data-chip="hud" data-zoom className="pointer-events-none fixed left-3 sm:left-6 top-[max(env(safe-area-inset-top),0.5rem)] z-20 flex gap-3 rounded-lg bg-white/95 px-2.5 py-1 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider shadow-md ring-1 ring-brand-blue/15 transition-opacity duration-500 lg:top-auto lg:bottom-6 lg:block lg:px-3 lg:py-2">
        <div className="flex gap-1.5 lg:gap-3">
          <dt className={`whitespace-nowrap lg:w-[9.5em] ${READOUT_KEY}`}>Target</dt>
          <dd data-hud="target" className="font-bold text-brand-blue">Board</dd>
        </div>
        <div className="flex gap-1.5 lg:mt-1 lg:gap-3">
          <dt className={`whitespace-nowrap lg:w-[9.5em] ${READOUT_KEY}`}>Field of view</dt>
          <dd data-hud="field" className="font-bold tabular-nums text-midnight">&nbsp;</dd>
        </div>
      </dl>
      {/* The name of the part under the hand */}
      <div data-chip="tip" aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-30 rounded-md bg-midnight px-2 py-1 font-mono text-[10px] uppercase tracking-wider font-bold text-white opacity-0 transition-opacity duration-200" />
      <button
        type="button"
        data-chip="skip"
        onClick={skip}
        aria-label="Skip to the enquiry form"
        className="invisible opacity-0 fixed right-3 sm:right-6 top-[max(env(safe-area-inset-top),0.5rem)] z-20 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-midnight shadow-md ring-1 ring-brand-blue/15 transition-opacity duration-500 lg:hidden"
      >
        Skip <Icon name="south" className="text-[13px]" />
      </button>
      <StopsNav items={score.stops} currentRef={navChangedRef} onGo={go} />
      <Credits id="chip-credits" className="invisible opacity-0 fixed right-4 sm:right-6 bottom-4 sm:bottom-6 z-20 hidden text-right transition-opacity duration-500 lg:block" popover="right-0" />
    </div>
  );
}

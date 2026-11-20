import { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import CaseStudy from '../../components/portfolio/CaseStudy';
import { casePath, hasCaseStudy, toCase, toCaseLink, type ApiCaseProject } from '../../components/portfolio/caseData';
import { getSite } from '../../site/server';
import { textOf } from '../../site/site';
import { absolute, brandedTitle, pageMetadata } from '../../site/seo';
import { breadcrumbs, jsonLdHtml, organizationRef } from '../../site/schema';
import { API_TAG } from '../../site/cache';

const LOCAL_API = 'http://127.0.0.1:8000';
const apiBase = process.env.NEXT_PUBLIC_API_URL || LOCAL_API;

type Props = { params: Promise<{ slug: string }> };

/** While developing, a backend running on this machine answers first, so new content can be tried before it goes live */
async function fromLocal(path: string) {
  if (process.env.NODE_ENV !== 'development' || apiBase === LOCAL_API) return null;
  try {
    const res = await fetch(`${LOCAL_API}${path}`, { cache: 'no-store', signal: AbortSignal.timeout(1500) });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

/**
 * Every project, in the Work page's order. If the API can't answer (it can be asleep on Render) this throws rather
 * than saying the project doesn't exist: a "not found" would be kept as the page for an hour and tell search engines
 * the page is gone. A failed render is never kept: visitors get the last good version, or the error page.
 */
const getProjects = cache(async (): Promise<ApiCaseProject[]> => {
  let data = await fromLocal('/api/portfolio/projects/');
  if (!data) {
    const res = await fetch(`${apiBase}/api/portfolio/projects/`, { next: { revalidate: 3600, tags: [API_TAG] }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`The portfolio API answered ${res.status}`);
    data = await res.json();
  }
  const list: ApiCaseProject[] = Array.isArray(data) ? data : data.results ?? [];
  return list.filter(hasCaseStudy);
});

/**
 * The project at this address, also when it's typed in other capitals. Such an address shows the same page and its
 * canonical address names the real one; it deliberately doesn't redirect (see the service pages for why).
 */
const findProject = cache(async (slug: string) => {
  if (!/^[\w-]+$/.test(slug)) return null;
  const projects = await getProjects();
  return projects.find((p) => p.slug === slug) ?? projects.find((p) => p.slug.toLowerCase() === slug.toLowerCase()) ?? null;
});

/** Whether the project's site answers: visitors are only sent to one that does */
async function answers(url: string) {
  if (!url) return false;
  try {
    const res = await fetch(url, { method: 'HEAD', next: { revalidate: 3600, tags: [API_TAG] }, signal: AbortSignal.timeout(3000) });
    return res.status < 500 && res.status !== 404;
  } catch {
    return false;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let project: ApiCaseProject | null = null;
  try {
    project = await findProject(slug);
  } catch {
    return { title: 'Our Work | IN-TA Solutions' };
  }
  if (!project) return { title: 'Project Not Found | IN-TA Solutions' };

  const site = await getSite();
  const { name, hero } = toCase(project, apiBase, false);
  return pageMetadata({
    title: brandedTitle(textOf(site, 'seo_case_title', { project: name })),
    description: project.meta_description?.trim() || project.summary?.trim() || `${name}, built by IN-TA Solutions.`,
    path: casePath(project.slug),
    image: hero ? { url: hero, alt: `${project.title.trim()}: the finished work` } : null,
  });
}

export async function generateStaticParams() {
  try {
    const res = await fetch(`${apiBase}/api/portfolio/projects/`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    const list: ApiCaseProject[] = Array.isArray(data) ? data : data.results ?? [];
    return list.filter(hasCaseStudy).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const api = await findProject(slug);
  if (!api) notFound();

  const projects = await getProjects();
  const at = projects.findIndex((p) => p.slug === api.slug);
  const after = projects.length > 1 ? projects[(at + 1) % projects.length] : null;
  const project = toCase(api, apiBase, await answers(api.external_url?.trim() ?? ''));
  const next = after ? toCaseLink(after, apiBase) : null;
  const path = casePath(project.slug);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: project.title,
      headline: `${project.name}: case study`,
      url: absolute(path),
      ...(project.summary ? { description: project.summary } : {}),
      ...(project.hero ? { image: project.hero } : {}),
      ...(project.url ? { sameAs: project.url } : {}),
      ...(project.tags.length ? { keywords: project.tags.join(', ') } : {}),
      ...(api.updated_at ? { dateModified: api.updated_at } : {}),
      creator: organizationRef(),
      ...(project.services.length ? { about: project.services.map((s) => ({ '@type': 'Service', name: s.title, url: absolute(`/services/${s.slug}`) })) } : {}),
    },
    breadcrumbs([{ name: 'Portfolio', path: '/portfolio' }, { name: project.name, path }]),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      <Header />
      <CaseStudy project={project} next={next} />
      <Footer />
    </>
  );
}

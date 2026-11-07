import { Metadata } from 'next';
import { getSite } from '../site/server';
import { textOf } from '../site/site';
import { pageMetadata } from '../site/seo';

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return pageMetadata({ title: textOf(site, 'seo_about_title'), description: textOf(site, 'seo_about_description'), path: '/about' });
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

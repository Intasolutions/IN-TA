import type { Metadata } from 'next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getSite } from '../site/server';
import { pageMetadata } from '../site/seo';
import LegalPage from '../components/legal/LegalPage';
import { legalDocument, seoOf } from '../components/legal/document';

// Written in the admin (Site settings > Page wording: Security Policy page); the standard text is in home/legal_text.json
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ ...seoOf(await getSite(), 'security'), path: '/security' });
}

export default async function SecurityPage() {
  const doc = legalDocument(await getSite(), 'security');
  return (
    <>
      <Header />
      <LegalPage kicker="Security" {...doc} />
      <Footer />
    </>
  );
}

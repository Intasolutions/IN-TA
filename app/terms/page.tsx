import type { Metadata } from 'next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getSite } from '../site/server';
import { pageMetadata } from '../site/seo';
import LegalPage from '../components/legal/LegalPage';
import { legalDocument, seoOf } from '../components/legal/document';

// Written in the admin (Site settings > Page wording: Terms of Service page); the standard text is in home/legal_text.json
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ ...seoOf(await getSite(), 'terms'), path: '/terms' });
}

export default async function TermsPage() {
  const doc = legalDocument(await getSite(), 'terms');
  return (
    <>
      <Header />
      <LegalPage kicker="Terms" {...doc} />
      <Footer />
    </>
  );
}

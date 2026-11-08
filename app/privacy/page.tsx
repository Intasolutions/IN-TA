import type { Metadata } from 'next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getSite } from '../site/server';
import { pageMetadata } from '../site/seo';
import LegalPage from '../components/legal/LegalPage';
import { legalDocument, seoOf } from '../components/legal/document';

// Written in the admin (Site settings > Page wording: Privacy Policy page); the standard text is in home/legal_text.json.
// Each statement in it describes what the site and its API actually do: keep it in step with the forms and the backend.
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ ...seoOf(await getSite(), 'privacy'), path: '/privacy' });
}

export default async function PrivacyPage() {
  const doc = legalDocument(await getSite(), 'privacy');
  return (
    <>
      <Header />
      <LegalPage kicker="Privacy" {...doc} />
      <Footer />
    </>
  );
}

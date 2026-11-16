import { Metadata } from 'next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ContactPage from '../components/contact/ContactPage';
import FaqSection from '../components/FaqSection';
import { getSite } from '../site/server';
import { contactJsonLd, faqJsonLd, jsonLdHtml } from '../site/schema';
import { textOf } from '../site/site';
import { pageMetadata } from '../site/seo';

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return pageMetadata({ title: textOf(site, 'seo_contact_title'), description: textOf(site, 'seo_contact_description'), path: '/contact' });
}

export default async function Page() {
  const site = await getSite();
  const faq = faqJsonLd(site.questions.contact, '/contact');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(contactJsonLd(site)) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(faq) }} />}
      <Header />
      <ContactPage>
        <FaqSection page="contact" tone="dark" className="relative" />
      </ContactPage>
      <Footer />
    </>
  );
}

import { Metadata } from 'next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ContactPage from '../components/contact/ContactPage';

const SITE = 'https://www.in-tasolutions.com';

export const metadata: Metadata = {
  title: 'Contact Us | Get in Touch for IT Consultations | INTA Solutions',
  description: 'Have a project in mind? Contact INTA Solutions in Wayanad, Kerala to discuss your software, web, or AI development needs. Call, email, visit or send us a message.',
  alternates: {
    canonical: '/contact',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact INTA Solutions',
  url: `${SITE}/contact`,
  mainEntity: {
    '@type': 'LocalBusiness',
    '@id': `${SITE}/#organization`,
    name: 'INTA Solutions Pvt Ltd',
    url: SITE,
    image: `${SITE}/logo/logo-inta.png`,
    telephone: '+919447595381',
    email: 'info@in-tasolutions.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Thonichal, Mananthavady',
      addressLocality: 'Wayanad',
      addressRegion: 'Kerala',
      postalCode: '670645',
      addressCountry: 'IN',
    },
    geo: { '@type': 'GeoCoordinates', latitude: 11.8021, longitude: 76.0232 },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '09:00',
      closes: '17:00',
    },
  },
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <Header />
      <ContactPage />
      <Footer />
    </>
  );
}

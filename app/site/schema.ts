// The company as search engines read it (schema.org), built from Site settings so it always matches the page.
// Every page names the company the same way and points to the same @ids, so search engines see one business.
import { SITE_URL, absolute } from './seo';
import { listOf, textOf, type Site } from './site';

export { SITE_URL };

const LEGAL_NAME = 'IN-TA Solutions Pvt Ltd';
const ALSO_KNOWN_AS = ['INTA Solutions', 'IN-TA Solutions'];
const LOGO = `${SITE_URL}/logo/logo.jpg`;
const ORG_ID = `${SITE_URL}/#organization`;
const BUSINESS_ID = `${SITE_URL}/#business`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const phoneE164 = (phone: string) => phone.replace(/[^\d+]/g, '');
const sameAs = (site: Site) => Object.values(site.socials).filter(Boolean);

/** The company, for pages that mention it (as provider, author, publisher, creator) */
export const organizationRef = () => ({ '@type': 'Organization', '@id': ORG_ID, name: LEGAL_NAME, url: SITE_URL, logo: LOGO });

const postalAddress = ({ address: a }: Site) => ({
  '@type': 'PostalAddress',
  streetAddress: a.street,
  addressLocality: a.locality,
  addressRegion: a.region,
  postalCode: a.postal_code,
  addressCountry: a.country,
});

const openingHours = (site: Site) => ({
  '@type': 'OpeningHoursSpecification',
  dayOfWeek: [1, 2, 3, 4, 5, 6, 0].filter((d) => site.hours.days.includes(d)).map((d) => DAY_NAMES[d]),
  opens: site.hours.opens,
  closes: site.hours.closes,
});

function organization(site: Site) {
  return {
    ...organizationRef(),
    alternateName: ALSO_KNOWN_AS,
    email: site.email,
    sameAs: sameAs(site),
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: phoneE164(site.phone),
      email: site.email,
      contactType: 'customer service',
      areaServed: site.address.country,
      availableLanguage: ['en', 'ml'],
    },
  };
}

/** The office, as a local business (ProfessionalService is a kind of LocalBusiness) */
function business(site: Site) {
  return {
    '@type': 'ProfessionalService',
    '@id': BUSINESS_ID,
    name: LEGAL_NAME,
    alternateName: ALSO_KNOWN_AS,
    description: textOf(site, 'seo_business_description'),
    url: SITE_URL,
    telephone: phoneE164(site.phone),
    email: site.email,
    image: LOGO,
    logo: LOGO,
    address: postalAddress(site),
    geo: { '@type': 'GeoCoordinates', latitude: site.map.lat, longitude: site.map.lng },
    hasMap: site.map.url || `https://www.google.com/maps/search/?api=1&query=${site.map.lat},${site.map.lng}`,
    openingHoursSpecification: openingHours(site),
    sameAs: sameAs(site),
    parentOrganization: { '@id': ORG_ID },
    areaServed: listOf(textOf(site, 'seo_area_served')).map((name) => ({ '@type': 'Place', name })),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'IT Services',
      itemListElement: site.services.map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s.title, url: absolute(`/services/${s.slug}`) },
      })),
    },
  };
}

/** The home page: the company, its office and the website (the website's name is what Google shows as the site name) */
export function homeJsonLd(site: Site) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization(site),
      business(site),
      { '@type': 'WebSite', '@id': WEBSITE_ID, url: SITE_URL, name: 'IN-TA Solutions', alternateName: ALSO_KNOWN_AS, publisher: { '@id': ORG_ID }, inLanguage: 'en-IN' },
    ],
  };
}

/** The contact page: the same office, under the same @id as on the home page */
export function contactJsonLd(site: Site) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact IN-TA Solutions',
    url: absolute('/contact'),
    mainEntity: business(site),
  };
}

/** Home › Section › Page, as Google shows it under the result. The last crumb is the page itself. */
export function breadcrumbs(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...trail].map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absolute(c.path) })),
  };
}

/** For a <script type="application/ld+json">: safe to put inside the page's HTML */
export const jsonLdHtml = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');

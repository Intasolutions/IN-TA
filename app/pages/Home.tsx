'use client';

import React from 'react';
import HeroSlider from '../components/Hero';
import Philosophy from '../components/Philosophy';
import Services from '../components/Service';
import TechStack from '../components/TechStack';
import TestimonialSlider from '../components/TestimonialSlider';
import BlogUpdates from '../components/BlogUpdates';
import PortfolioCinematicPanels from '../components/PortfolioSection';
import { useEnterpriseReveal } from '../hooks/useEnterpriseReveal';

const Home = () => {
  useEnterpriseReveal();
  return (
    <main className="bg-canvas text-midnight">
      <HeroSlider />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://www.in-tasolutions.com/#organization",
                "name": "INTA Solutions Pvt Ltd",
                "url": "https://www.in-tasolutions.com",
                "logo": "https://www.in-tasolutions.com/logo/logo.png",
                "sameAs": [
                  "https://www.linkedin.com/company/inta-solutions-pvt-ltd",
                  "https://www.facebook.com/intasolutions"
                ],
                "contactPoint": {
                  "@type": "ContactPoint",
                  "telephone": "+919447595381",
                  "contactType": "customer service",
                  "areaServed": "IN",
                  "availableLanguage": ["en", "ml"]
                }
              },
              {
                "@type": "ProfessionalService",
                "@id": "https://www.in-tasolutions.com/#business",
                "name": "IN-TA Solutions Pvt Ltd",
                "description": "Leading Software Development Company in Wayanad, Kerala. Specialized in SaaS Development, UI/UX Design, and Mobile App Development for the Malabar region.",
                "url": "https://in-tasolutions.com",
                "telephone": "+919447595381",
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": "Thonichal",
                  "addressLocality": "Mananthavady",
                  "addressRegion": "Kerala",
                  "postalCode": "670645",
                  "addressCountry": "IN"
                },
                "geo": {
                  "@type": "GeoCoordinates",
                  "latitude": "11.8021",
                  "longitude": "76.0232"
                },
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": "5",
                  "reviewCount": "25"
                },
                "image": "https://in-tasolutions.com/logo.png",
                "priceRange": "$$",
                "areaServed": [
                  { "@type": "City", "name": "Mananthavady" },
                  { "@type": "City", "name": "Kalpetta" },
                  { "@type": "City", "name": "Sulthan Bathery" },
                  { "@type": "State", "name": "Kerala" }
                ],
                "hasOfferCatalog": {
                  "@type": "OfferCatalog",
                  "name": "IT Services",
                  "itemListElement": [
                    {
                      "@type": "Offer",
                      "itemOffered": {
                        "@type": "Service",
                        "name": "SaaS Development",
                        "description": "Custom SaaS product engineering, cloud-native architecture, and scalable digital solutions."
                      }
                    },
                    {
                      "@type": "Offer",
                      "itemOffered": {
                        "@type": "Service",
                        "name": "UI/UX Design",
                        "description": "User-centric design, strategic UX research, and high-fidelity interface prototyping."
                      }
                    },
                    {
                      "@type": "Offer",
                      "itemOffered": {
                        "@type": "Service",
                        "name": "Mobile App Development",
                        "description": "Custom Android and iOS applications for Kerala startups and enterprises."
                      }
                    },
                    {
                      "@type": "Offer",
                      "itemOffered": {
                        "@type": "Service",
                        "name": "AI Integration Kerala",
                        "description": "Integrating LLMs and ML models into local business processes."
                      }
                    }
                  ]
                }
              }
            ]
          })
        }}
      />



      <Philosophy />
      <section>
        <Services />
      </section>

      <section>
        <PortfolioCinematicPanels />
      </section>

      <section id="matrix">
        <TechStack />
      </section>

      <section>
        <TestimonialSlider />
      </section>

      <section>
        <BlogUpdates />
      </section>
    </main>
  );
};


export default Home;

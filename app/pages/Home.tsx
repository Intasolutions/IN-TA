'use client';

import React from 'react';
import HeroSlider from '../components/Hero';
import About from '../components/AboutSection';
import Services from '../components/Service';
import TechStack from '../components/TechStack';
import TestimonialSlider from '../components/TestimonialSlider';
import BlogUpdates from '../components/BlogUpdates';
import PortfolioCinematicPanels from '../components/PortfolioSection';
import CompanyIntro from '../components/CompanyIntro';


const Home = () => {
  return (
    <main>
      <section>
        <HeroSlider />
      </section>

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
                  "telephone": "+91-XXXXXXXXXX",
                  "contactType": "customer service",
                  "areaServed": "IN",
                  "availableLanguage": ["en", "ml"]
                }
              },
              {
                "@type": "SoftwareBusiness",
                "@id": "https://www.in-tasolutions.com/#business",
                "name": "INTA Solutions",
                "description": "Leading Software Development Company in Wayanad, Kerala. Specialized in Mobile App Development, AI Integration, and Custom ERP solutions for the Malabar region.",
                "url": "https://www.in-tasolutions.com",
                "telephone": "+91-XXXXXXXXXX",
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": "Mananthavady, Wayanad District",
                  "addressLocality": "Mananthavady",
                  "addressRegion": "Kerala",
                  "postalCode": "673121",
                  "addressCountry": "IN"
                },
                "geo": {
                  "@type": "GeoCoordinates",
                  "latitude": "11.8033",
                  "longitude": "76.0028"
                },
                "image": "https://www.in-tasolutions.com/og-image.jpg",
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
                        "name": "Mobile App Development",
                        "description": "Custom Android and iOS applications for Kerala startups and enterprises."
                      }
                    },
                    {
                      "@type": "Offer",
                      "itemOffered": {
                        "@type": "Service",
                        "name": "Software Development Wayanad",
                        "description": "Bespoke software solutions including ERP, CRM, and automation tools."
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



      <section>
        <About />
      </section>
      <section>
        <CompanyIntro />
      </section>
      <section>
        <Services />
      </section>

      <section>
        <PortfolioCinematicPanels />
      </section>

      <section>
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

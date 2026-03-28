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
            "@type": "ProfessionalService",
            "name": "INTA Solutions",
            "url": "https://in-tasolutions.com",
            "logo": "https://in-tasolutions.com/logo/logo.png",
            "image": "https://in-tasolutions.com/og-image.jpg",
            "description": "The top-rated IT company in Wayanad, Kerala. Specialized Mobile App Development Team providing high-performance iOS/Android apps, AI integration, and enterprise software.",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "INTA Solutions, Wayanad",
              "addressLocality": "Wayanad",
              "addressRegion": "Kerala",
              "postalCode": "673121",
              "addressCountry": "IN"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": "11.605",
              "longitude": "76.082"
            },
            "openingHours": "Mo-Fr 09:00-18:00",
            "priceRange": "$$",
            "telephone": "+91-XXXXXXXXXX",
            "knowsAbout": [
              "Mobile App Development",
              "iOS and Android Apps",
              "AI & Machine Learning Integration",
              "Custom ERP Solutions",
              "Web Development in Wayanad"
            ],
            "service": [
              "Wayanad IT Solutions",
              "Mobile App Development Team",
              "Custom Software Engineering",
              "AI Powered Platforms",
              "Digital Transformation Consulting"
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

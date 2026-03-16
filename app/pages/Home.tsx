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
            "description": "Custom Software Development Company in Kerala. Specializing in Web Development, AI Integration, and Mobile Apps.",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Wayanad",
              "addressRegion": "Kerala",
              "addressCountry": "India"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": "11.605",
              "longitude": "76.082"
            },
            "service": [
              "Web Development",
              "Mobile App Development",
              "AI Integration",
              "Custom Software Development",
              "Digital Transformation"
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

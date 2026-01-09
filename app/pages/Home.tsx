'use client';

import React from 'react';
import HeroSlider from '../components/Hero';
import About from '../components/AboutSection';
import Services from '../components/Service';
import TechStack from '../components/TechStack';
import TestimonialSlider from '../components/TestimonialSlider';
import BlogUpdates from '../components/BlogUpdates';
import PortfolioCinematicPanels from '../components/PortfolioSection';


const Home = () => {
  return (
    <main>
      <section>
        <HeroSlider />
      </section>

      <section>
        <About />
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

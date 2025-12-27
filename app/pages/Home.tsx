'use client'

import React from 'react'
import SmoothScroll from '../components/SmoothScroll'
import HeroSlider from '../components/Hero'
import About from '../components/AboutSection'
import Services from '../components/Service'
import TechStack from '../components/TechStack'
import TestimonialSlider from '../components/TestimonialSlider'
import BlogUpdates from '../components/BlogUpdates'
import PortfolioCinematicPanels from '../components/PortfolioSection'


const Home = () => {
  return (
    <SmoothScroll>
      <main className="overflow-hidden">
        <HeroSlider />
        <About />
        <Services />
        <PortfolioCinematicPanels />
        <TechStack />
        <TestimonialSlider />
        <BlogUpdates />
   
      </main>
    </SmoothScroll>
  )
}

export default Home

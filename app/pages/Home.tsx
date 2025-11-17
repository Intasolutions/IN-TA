import React from 'react'
import HeroSlider from '../components/Hero'
import About from '../components/AboutSection'
import Services from '../components/Service'
import PortfolioStudioSplit from '../components/PortfolioSection'
import TechStack from '../components/TechStack'
import TestimonialSlider from '../components/TestimonialSlider'
import BlogUpdates from '../components/BlogUpdates'

const Home = () => {
  return (
    <div>
        <HeroSlider/>
        <About/>
        <Services/>
        <PortfolioStudioSplit/>
        <TechStack/>
        <TestimonialSlider/>
     <BlogUpdates/>
    </div>
  )
}

export default Home
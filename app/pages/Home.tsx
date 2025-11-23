'use client'

import React, { useEffect } from 'react'
import Lenis from '@studio-freight/lenis'

import HeroSlider from '../components/Hero'
import About from '../components/AboutSection'
import Services from '../components/Service'

import TechStack from '../components/TechStack'
import TestimonialSlider from '../components/TestimonialSlider'
import BlogUpdates from '../components/BlogUpdates'

import PortfolioCinematicPanels from '../components/PortfolioSection'

const Home = () => {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,       // Smooth speed
      easing: (t) => 1 - Math.pow(1 - t, 3), // Premium easing
      smooth: true,
      smoothTouch: true,   // Smooth scroll on mobile
      touchMultiplier: 1.6 // More natural feeling
    })

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [])

  return (
    <main className="overflow-hidden">
      <HeroSlider />
      <About />
      <Services />
  <PortfolioCinematicPanels/>
         <TechStack />
      <TestimonialSlider />
      <BlogUpdates />
    </main>
  )
}

export default Home

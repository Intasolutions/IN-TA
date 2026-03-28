import { Metadata } from 'next';
import React from 'react'
import Header1 from '../components/Header1'
import ServicesPage from './components/ServicesPage'
import SmoothScroll from '../components/SmoothScroll'
import Footer1 from '../components/Footersecond'

export const metadata: Metadata = {
  title: 'Our Services | Professional IT Solutions | INTA Solutions',
  description: 'Comprehensive software development services including web development, mobile app development, AI integration, and enterprise solutions by INTA Solutions Kerala.',
  alternates: {
    canonical: '/services',
  },
};

const Page = () => {
  return (
    <SmoothScroll>
    <Header1/>
   <ServicesPage/>
   <Footer1/>
   </SmoothScroll>
    
  )
}

export default Page
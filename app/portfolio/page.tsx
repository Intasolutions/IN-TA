import { Metadata } from 'next';
import React from 'react'
import Header1 from '../components/Header1'
import PortfolioPage from './components/portfolio'

import SmoothScroll from '../components/SmoothScroll'
import Footer1 from '../components/Footersecond'

export const metadata: Metadata = {
  title: 'Our Portfolio | Showcase of Digital Innovation | INTA Solutions',
  description: 'Explore the diverse portfolio of INTA Solutions, featuring custom software, web and mobile apps, and enterprise platforms we have built.',
  alternates: {
    canonical: '/portfolio',
  },
};

const page = () => {
  return (
<SmoothScroll>
<Header1/>
<PortfolioPage/>
<Footer1/>
</SmoothScroll>
  )
}

export default page
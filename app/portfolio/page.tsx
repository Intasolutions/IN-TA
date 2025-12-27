import React from 'react'
import Header1 from '../components/Header1'
import PortfolioPage from './components/portfolio'
import Footer from '../components/Footer'
import SmoothScroll from '../components/SmoothScroll'

const page = () => {
  return (
<SmoothScroll>
<Header1/>
<PortfolioPage/>
<Footer/>
</SmoothScroll>
  )
}

export default page
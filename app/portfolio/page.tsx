import React from 'react'
import Header1 from '../components/Header1'
import PortfolioPage from './components/portfolio'

import SmoothScroll from '../components/SmoothScroll'
import Footer1 from '../components/Footersecond'

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
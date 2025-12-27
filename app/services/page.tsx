import React from 'react'
import Header1 from '../components/Header1'
import ServicesPage from './components/ServicesPage'
import SmoothScroll from '../components/SmoothScroll'
import Footer1 from '../components/Footersecond'


const page = () => {
  return (
    <SmoothScroll>
    <Header1/>
   <ServicesPage/>
   <Footer1/>
   </SmoothScroll>
    
  )
}

export default page
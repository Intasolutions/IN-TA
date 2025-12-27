import React from 'react'
import SmoothScroll from '../components/SmoothScroll'
import ContactPage from './components/ContactUs'
import Header1 from '../components/Header1'
import Footer1 from '../components/Footersecond'


const page = () => {
  return (
    <SmoothScroll>
        <Header1 />
        <ContactPage/>
        <Footer1/>
    </SmoothScroll>
  )
}

export default page
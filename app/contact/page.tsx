import { Metadata } from 'next';
import React from 'react'
import SmoothScroll from '../components/SmoothScroll'
import ContactPage from './components/ContactUs'
import Header1 from '../components/Header1'
import Footer1 from '../components/Footersecond'

export const metadata: Metadata = {
  title: 'Contact Us | Get in Touch for IT Consultations | INTA Solutions',
  description: 'Have a project in mind? Contact INTA Solutions to discuss your software, web, or AI development needs. We are here to help your business grow.',
  alternates: {
    canonical: '/contact',
  },
};


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
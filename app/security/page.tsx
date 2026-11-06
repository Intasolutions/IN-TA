import { Metadata } from 'next';
import Footer1 from '../components/Footersecond';
import Header1 from '../components/Header1';

export const metadata: Metadata = {
  title: 'Security Policy | Data Protection | INTA Solutions',
  description: 'Learn about INTA Solutions commitment to data security, encryption, and compliance with global privacy standards.',
  alternates: {
    canonical: '/security',
  },
};

export default function SecurityPage() {
  return (
    
    <main className="min-h-screen bg-slate-50 pt-32 pb-20 px-6">
      <Header1/>
      <div className="container mx-auto max-w-4xl">
        <h1 className="heading-page text-midnight mb-8">Security <span className="heading-accent heading-serif">Policy</span></h1>
        
        <div className="space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="heading-sub text-slate-800 mb-4">Data Protection</h2>
            <p>
              At IN-TA Solutions, we prioritize the security of your data. We employ industry-standard encryption
              and security protocols to ensure that your information remains confidential and protected against
              unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="heading-sub text-slate-800 mb-4">Secure Infrastructure</h2>
            <p>
              Our infrastructure is built on world-class cloud providers with robust security measures.
              We regularly perform security audits and vulnerability assessments to maintain the highest
              standards of safety.
            </p>
          </section>

          <section>
            <h2 className="heading-sub text-slate-800 mb-4">Compliance</h2>
            <p>
              We adhere to global data protection regulations and standards. Our team is committed to
              ensuring compliance with GDPR, CCPA, and other relevant privacy laws.
            </p>
          </section>

          <div className="mt-12 p-6 bg-blue-50 rounded-xl border border-blue-100">
            <h3 className="heading-sub text-blue-900 mb-2">Report a Vulnerability</h3>
            <p className="text-blue-800">
              If you believe you have found a security vulnerability in our systems, please report it to us
              immediately at <a href="mailto:security@intasolutions.com" className="underline hover:text-blue-600">security@intasolutions.com</a>.
            </p>
          </div>
        </div>
      </div>
      <Footer1/>
    </main>
  );
}

import { Metadata } from 'next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LegalPage, { Mail, type LegalSection } from '../components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Security Policy | Data Protection | INTA Solutions',
  description: 'Learn about INTA Solutions commitment to data security, encryption, and compliance with global privacy standards.',
  alternates: {
    canonical: '/security',
  },
};

const SECTIONS: LegalSection[] = [
  {
    id: 'data-protection',
    title: 'Data Protection',
    body: (
      <p>
        At IN-TA Solutions, we prioritize the security of your data. We employ industry-standard encryption and security
        protocols to ensure that your information remains confidential and protected against unauthorized access.
      </p>
    ),
  },
  {
    id: 'secure-infrastructure',
    title: 'Secure Infrastructure',
    body: (
      <p>
        Our infrastructure is built on world-class cloud providers with robust security measures. We regularly perform
        security audits and vulnerability assessments to maintain the highest standards of safety.
      </p>
    ),
  },
  {
    id: 'compliance',
    title: 'Compliance',
    body: (
      <p>
        We adhere to global data protection regulations and standards. Our team is committed to ensuring compliance with GDPR,
        CCPA, and other relevant privacy laws.
      </p>
    ),
  },
  {
    id: 'report-a-vulnerability',
    title: 'Report a Vulnerability',
    body: (
      <p>
        If you believe you have found a security vulnerability in our systems, please report it to us immediately at{' '}
        <Mail subject="Security report" />.
      </p>
    ),
  },
];

export default function SecurityPage() {
  return (
    <>
      <Header />
      <LegalPage
        href="/security"
        kicker="Security"
        title="Security"
        accent="Policy"
        lead="How IN-TA Solutions looks after your data, and how to tell us if you find a weakness in our systems."
        updated={{ iso: '2026-11-06', label: '6 Nov 2026' }}
        sections={SECTIONS}
      />
      <Footer />
    </>
  );
}

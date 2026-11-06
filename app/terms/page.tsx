import { Metadata } from 'next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LegalPage, { type LegalSection } from '../components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service | Legal | INTA Solutions',
  description: 'Understand the terms and conditions for using INTA Solutions software development and digital strategy services.',
  alternates: {
    canonical: '/terms',
  },
};

const SECTIONS: LegalSection[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    body: (
      <p>
        Welcome to IN-TA Solutions. By accessing our website and services, you agree to be bound by these Terms of Service.
        Please read them carefully.
      </p>
    ),
  },
  {
    id: 'use-of-services',
    title: 'Use of Services',
    body: (
      <p>
        You agree to use our services only for lawful purposes and in accordance with these Terms. You are responsible for
        maintaining the confidentiality of your account information.
      </p>
    ),
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property',
    body: (
      <p>
        All content, features, and functionality of our services, including but not limited to text, graphics, logos, and
        software, are the exclusive property of IN-TA Solutions and are protected by copyright and other intellectual property
        laws.
      </p>
    ),
  },
  {
    id: 'limitation-of-liability',
    title: 'Limitation of Liability',
    body: (
      <p>
        IN-TA Solutions shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting
        from your use of or inability to use the service.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <>
      <Header />
      <LegalPage
        href="/terms"
        kicker="Terms"
        title="Terms of"
        accent="Service"
        lead="The terms for using this website and the services of IN-TA Solutions Pvt Ltd."
        updated={{ iso: '2026-01-16', label: '16 Jan 2026' }}
        sections={SECTIONS}
      />
      <Footer />
    </>
  );
}

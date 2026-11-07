import { Metadata } from 'next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { pageMetadata } from '../site/seo';
import { LEGAL_UPDATED } from '../components/legal/updated';
import LegalPage, { Mail, type LegalSection } from '../components/legal/LegalPage';

export const metadata: Metadata = pageMetadata({
  title: 'Privacy Policy | INTA Solutions',
  description: 'What the forms on the INTA Solutions website collect, why, where it is kept, and how to have it deleted.',
  path: '/privacy',
});

// Each statement here describes what the site and its API actually do: keep it in step with the forms and the backend
const SECTIONS: LegalSection[] = [
  {
    id: 'what-we-collect',
    title: 'What we collect',
    body: (
      <>
        <p>We only collect what you type into one of our forms:</p>
        <ul>
          <li>
            <strong>The contact page and the order form on the Services page</strong> ask for your name, email address, phone
            number, country and your message. With it we record the page you sent it from and your browser&apos;s user agent
            (the name and version of your browser and operating system).
          </li>
          <li>
            <strong>The &ldquo;work with us&rdquo; form on the blog</strong> asks for your name, phone number and the kind of
            project you&apos;re interested in.
          </li>
        </ul>
        <p>
          This website sets no cookies, and we use no analytics, advertising or tracking tools.
        </p>
      </>
    ),
  },
  {
    id: 'how-we-use-it',
    title: 'How we use it',
    body: (
      <>
        <p>
          We use your details to read your enquiry and get back to you about it. A message from the contact page or the
          Services page is saved in our database and emailed to our team, and a copy is emailed to you to confirm that it
          arrived.
        </p>
        <p>We don&apos;t sell your details, share them for marketing, or add you to a mailing list.</p>
      </>
    ),
  },
  {
    id: 'services-we-use',
    title: 'Services we use',
    body: (
      <>
        <p>The site runs on a few outside services, which handle your details only to run it for us:</p>
        <ul>
          <li>
            <strong>Vercel</strong> hosts this website, and <strong>Render</strong> runs the system that receives the forms.
          </li>
          <li>
            <strong>Neon</strong> hosts the database where messages are saved.
          </li>
          <li>
            <strong>Cloudinary</strong> stores and serves the images on the site.
          </li>
          <li>
            <strong>An email service</strong> delivers the emails described above.
          </li>
          <li>
            <strong>Google Fonts</strong> supplies the site&apos;s icons, so your browser asks Google&apos;s servers for them and
            Google sees your IP address.
          </li>
        </ul>
        <p>
          Links to Google Maps, LinkedIn, Instagram, Facebook, X and YouTube take you to those sites, and their own privacy
          policies apply there.
        </p>
      </>
    ),
  },
  {
    id: 'your-choices',
    title: 'Your choices',
    body: (
      <p>
        To see, correct or delete what you&apos;ve sent us, email <Mail subject="Privacy request" />.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: <p>When this policy changes, we&apos;ll update this page and the date at the top.</p>,
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <LegalPage
        href="/privacy"
        kicker="Privacy"
        title="Privacy"
        accent="Policy"
        lead="What our forms collect, why we ask for it, where it is kept, and how to have it removed."
        updated={LEGAL_UPDATED.privacy}
        sections={SECTIONS}
      />
      <Footer />
    </>
  );
}

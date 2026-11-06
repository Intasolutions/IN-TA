import type { Metadata } from 'next';
import Header from './components/Header';
import Footer from './components/Footer';
import NotFoundTrace from './components/NotFoundTrace';

export const metadata: Metadata = {
  title: 'Page not found | INTA Solutions',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <NotFoundTrace />
      <Footer />
    </>
  );
}

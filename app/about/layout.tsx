import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | INTA Solutions',
  description: 'How INTA Solutions is wired: a software company in Wayanad, Kerala, mapped as one system, from the services we run to the technology behind them.',
  alternates: {
    canonical: '/about',
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

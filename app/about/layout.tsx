import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | INTA Solutions',
  description: 'Learn about INTA Solutions, our mission, vision, and the team driving digital transformation in Kerala.',
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

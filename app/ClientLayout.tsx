'use client';

import { useState } from 'react';
import NavProgress from './components/NavProgress';
import SmoothScroll from './components/SmoothScroll';
import PageLoader from './components/PageLoader';
import { RevealProvider, useReveal } from './context/RevealContext';
import { SiteProvider } from './site/SiteContext';
import type { Site } from './site/site';
// WhatsApp button hidden site-wide for now; re-enable by restoring the import and <WhatsAppButton /> below
// import WhatsAppButton from './components/WhatsAppButton';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const { setIntroReady } = useReveal();

  // The visit's first page waits for the opening; every page after that plays its own entrance straight away
  const handleLoaderDone = () => {
    setIsFirstLoad(false);
    setIntroReady(true);
  };

  return (
    <>
      {isFirstLoad && <PageLoader onDone={handleLoaderDone} />}
      <NavProgress />
      <SmoothScroll>{children}</SmoothScroll>
    </>
  );
}

export default function ClientLayout({
  site,
  children,
}: {
  site: Site;
  children: React.ReactNode;
}) {
  return (
    <SiteProvider site={site}>
      <RevealProvider>
        <LayoutContent>{children}</LayoutContent>
      </RevealProvider>
    </SiteProvider>
  );
}
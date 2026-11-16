'use client';

import { useCallback, useState } from 'react';
import NavProgress from './components/NavProgress';
import SmoothScroll from './components/SmoothScroll';
import PageLoader from './components/PageLoader';
import { RevealProvider, useReveal } from './context/RevealContext';
import { SiteProvider } from './site/SiteContext';
import type { Site } from './site/site';
// WhatsApp button hidden site-wide for now; re-enable by restoring the import and <WhatsAppButton /> below
// import WhatsAppButton from './components/WhatsAppButton';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const [opening, setOpening] = useState(true);
  const { setIntroReady } = useReveal();

  // The visit's first page plays its entrance as the opening clears; every page after that plays its own straight away
  const playIntro = useCallback(() => setIntroReady(true), [setIntroReady]);
  const removeOpening = useCallback(() => setOpening(false), []);

  return (
    <>
      {opening && <PageLoader onReady={playIntro} onGone={removeOpening} />}
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
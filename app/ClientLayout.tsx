'use client';

import { useCallback, useState } from 'react';
import NavProgress from './components/NavProgress';
import SmoothScroll from './components/SmoothScroll';
import PageLoader from './components/PageLoader';
import SkipLink from './components/SkipLink';
import { RevealProvider, useReveal } from './context/RevealContext';
import { SiteProvider } from './site/SiteContext';
import type { Site } from './site/site';
// The WhatsApp button, on every page (it steps aside while the hero's buttons are on screen)
import WhatsAppButton from './components/WhatsAppButton';
// The website guide beside it: a 3D character, on computers only, fetched after the page is ready
import Guide from './components/guide/Guide';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const [opening, setOpening] = useState(true);
  const { setIntroReady } = useReveal();

  // The visit's first page plays its entrance as the opening clears; every page after that plays its own straight away
  const playIntro = useCallback(() => setIntroReady(true), [setIntroReady]);
  const removeOpening = useCallback(() => setOpening(false), []);

  return (
    <>
      <SkipLink />
      {opening && <PageLoader onReady={playIntro} onGone={removeOpening} />}
      <NavProgress />
      <SmoothScroll>{children}</SmoothScroll>
      <WhatsAppButton />
      <Guide />
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
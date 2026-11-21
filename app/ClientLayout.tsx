'use client';

import { useCallback, useState } from 'react';
import NavProgress from './components/NavProgress';
import SmoothScroll from './components/SmoothScroll';
import PageLoader from './components/PageLoader';
import SkipLink from './components/SkipLink';
import { RevealProvider, useReveal } from './context/RevealContext';
import { SiteProvider } from './site/SiteContext';
import type { Site } from './site/site';
// The website guide: the chat button in the bottom right corner (his face), with the 3D robot standing on it, fetched
// after the page is ready. The WhatsApp button has the bottom left corner.
import Guide from './components/guide/Guide';
import WhatsAppButton from './components/WhatsAppButton';
import FacebookPixel from './components/FacebookPixel';

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
      <FacebookPixel />
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
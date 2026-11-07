'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import MaskReveal from './components/MaskReveal';
import SmoothScroll from './components/SmoothScroll';
import PageLoader from './components/PageLoader';
import { RevealProvider, useReveal } from './context/RevealContext';
import { SiteProvider } from './site/SiteContext';
import type { Site } from './site/site';
// WhatsApp button hidden site-wide for now; re-enable by restoring the import and <WhatsAppButton /> below
// import WhatsAppButton from './components/WhatsAppButton';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showMask, setShowMask] = useState(false);
  const [routeKey, setRouteKey] = useState(pathname);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const prevPath = useRef(pathname);
  const { setIntroReady } = useReveal();

  useEffect(() => {
    if (prevPath.current !== pathname) {
      setShowMask(true);
      setIntroReady(false);
      setRouteKey(pathname);
      prevPath.current = pathname;
    }
  }, [pathname, setIntroReady]);

  const handleLoaderDone = () => {
    setIsFirstLoad(false);
    setIntroReady(true);
  };

  const handleMaskComplete = () => {
    setShowMask(false);
    setIntroReady(true);
  };

  return (
    <>
      {isFirstLoad && (
        <PageLoader onDone={handleLoaderDone} />
      )}

      {!isFirstLoad && showMask && (
        <MaskReveal
          triggerKey={routeKey}
          onComplete={handleMaskComplete}
        />
      )}

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
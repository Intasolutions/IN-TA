'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import MaskReveal from './components/MaskReveal';
import SmoothScroll from './components/SmoothScroll';
import PageLoader from './components/PageLoader';
import { RevealProvider, useReveal } from './context/RevealContext';
// WhatsApp button hidden site-wide for now; re-enable by restoring the import and <WhatsAppButton /> below
// import WhatsAppButton from './components/WhatsAppButton';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showMask, setShowMask] = useState(false);
  const [routeKey, setRouteKey] = useState(pathname);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const prevPath = useRef(pathname);
  const { setRevealComplete, setIntroReady } = useReveal();

  useEffect(() => {
    if (prevPath.current !== pathname) {
      setShowMask(true);
      setRevealComplete(false);
      setIntroReady(false);
      setRouteKey(pathname);
      prevPath.current = pathname;
    }
  }, [pathname, setRevealComplete, setIntroReady]);

  const handleLoaderDone = () => {
    setIsFirstLoad(false);
    setRevealComplete(true);
    setIntroReady(true);
  };

  const handleMaskComplete = () => {
    setShowMask(false);
    setRevealComplete(true);
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
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RevealProvider>
      <LayoutContent>{children}</LayoutContent>
    </RevealProvider>
  );
}
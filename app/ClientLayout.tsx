'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import MaskReveal from './components/MaskReveal';
import SmoothScroll from './components/SmoothScroll';
import PageLoader from './components/PageLoader';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [showMask, setShowMask] = useState(false);
  const [routeKey, setRouteKey] = useState(pathname);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      setShowMask(true);
      setRouteKey(pathname);
      prevPath.current = pathname;
    }
  }, [pathname]);

  return (
    <>
      {isFirstLoad && (
        <PageLoader onDone={() => setIsFirstLoad(false)} />
      )}

      {!isFirstLoad && showMask && (
        <MaskReveal
          triggerKey={routeKey}
          onComplete={() => setShowMask(false)}
        />
      )}

      <SmoothScroll>{children}</SmoothScroll>
    </>
  );
}

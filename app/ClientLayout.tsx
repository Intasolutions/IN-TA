'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import MaskReveal from './components/MaskReveal';
import SmoothScroll from './components/SmoothScroll';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [showMask, setShowMask] = useState(true);
  const [routeKey, setRouteKey] = useState(pathname);

  // Trigger mask on route change
  useEffect(() => {
    setShowMask(true);
    setRouteKey(pathname);
  }, [pathname]);

  return (
    <>
      {showMask && (
        <MaskReveal
          triggerKey={routeKey}
          onComplete={() => setShowMask(false)}
        />
      )}

      <SmoothScroll>{children}</SmoothScroll>
    </>
  );
}

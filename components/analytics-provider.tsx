'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { logPageView } from '@/lib/analytics';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Track page views when pathname changes
    if (pathname) {
      // Extract a clean page title from the pathname
      const pageTitle = pathname === '/' 
        ? 'Home' 
        : pathname
            .split('/')
            .filter(Boolean)
            .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
            .join(' - ');
      
      logPageView(pageTitle, pathname);
    }
  }, [pathname]);

  // Analytics is initialized automatically in the analytics module
  // This component just handles page view tracking
  return <>{children}</>;
}
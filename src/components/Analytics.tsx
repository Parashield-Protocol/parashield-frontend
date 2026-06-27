'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';
import { page, setPostHogReady } from '@/lib/analytics';

export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

    // Check if PostHog is already initialized via 'capture' method existence
    if (posthogKey && typeof posthog.capture === 'function' && !posthog.__initialized) {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        capture_pageview: false,
        loaded: (ph) => {
          ph.identify();
          setPostHogReady(true);
        },
      });
      // Mark as initialized to avoid redundant init calls
      Object.defineProperty(posthog, '__initialized', { value: true, configurable: false });
    } else if (posthogKey) {
      // PostHog is already initialized
      setPostHogReady(true);
    }
  }, []);

  useEffect(() => {
    if (pathname) {
      page(pathname);
    }
  }, [pathname]);

  return null;
}

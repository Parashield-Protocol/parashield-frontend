'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { setPostHogReady, trackPageview } from '@/lib/analytics';

/**
 * Lazily initialize PostHog after the page becomes interactive, so its
 * script download and init don't block the main thread during first paint.
 * Defers to `requestIdleCallback` (with a `setTimeout` fallback) and runs
 * at least 1.5s after mount so the critical rendering path is unblocked.
 */
export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;

    const initPostHog = async () => {
      const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';
      if (!posthogKey || cancelled) return;

      // Dynamic import defers the posthog-js bundle download until idle.
      const { default: posthog } = await import('posthog-js');
      if (cancelled) return;

      const ph = posthog as typeof posthog & { __initialized?: boolean };
      if (typeof posthog.capture === 'function' && !ph.__initialized) {
        posthog.init(posthogKey, {
          api_host: posthogHost,
          capture_pageview: false,
          loaded: (ph) => {
            ph.identify();
            setPostHogReady(true);
          },
        });
        Object.defineProperty(ph, '__initialized', { value: true, configurable: false });
      } else {
        setPostHogReady(true);
      }
    };

    // Defer until the browser is idle (or after 1.5s at the latest) so
    // PostHog never competes with first-paint resources.
    const schedule = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1500));
    const handle = schedule(initPostHog);

    return () => {
      cancelled = true;
      if (window.cancelIdleCallback && typeof handle === 'number') {
        window.cancelIdleCallback(handle);
      }
    };
  }, []);

  // Route change is the single source of pageviews; trackPageview drops
  // repeat runs for the same route (Strict Mode, remounts) (#711).
  useEffect(() => {
    if (pathname) {
      trackPageview(pathname);
    }
  }, [pathname]);

  return null;
}

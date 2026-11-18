import posthog from 'posthog-js';

type EventName =
  | 'wallet_connect'
  | 'wallet_disconnect'
  | 'policy_buy_start'
  | 'policy_buy_success'
  | 'policy_buy_error'
  | 'claim_submit'
  | 'claim_success'
  | 'claim_error'
  | 'product_view'
  | 'oracle_refresh'
  | 'app_error';

interface EventProperties {
  [key: string]: string | number | boolean | undefined;
}

interface BufferedEvent {
  event: EventName | '$pageview';
  /**
   * For pageviews this already holds `$current_url`, captured at page() time,
   * not at flush time — by the time PostHog is ready the browser is already
   * on a later route, so reading window.location.href during the flush would
   * attribute every buffered pageview to the last URL.
   */
  properties: EventProperties;
}

// PostHog's loaded callback can take hundreds of ms to fire (and Analytics.tsx
// defers init until idle, up to ~1.5s), and the user can navigate or trigger
// tracked actions in that window. A single slot silently dropped all but the
// most recent navigation (issue #228), and track() events were sent before
// PostHog was ready and lost (#896), so pageviews and events share one queue
// that is flushed in order. Capped so a page that never becomes ready can't
// grow the queue without bound.
const MAX_BUFFERED_EVENTS = 50;

let posthogReady = false;
let bufferedPageviews: BufferedPageview[] = [];
let bufferOverflowWarned = false;

export function setPostHogReady(ready: boolean): void {
  posthogReady = ready;
  if (!ready) return;

  // Drain before capturing so a throwing capture() can't replay entries that
  // were already sent on a subsequent call.
  const pending = bufferedPageviews;
  bufferedPageviews = [];
  bufferOverflowWarned = false;
  for (const { properties, url } of pending) {
    posthog.capture('$pageview', {
      $current_url: url,
      ...properties
    });
  }
}

function truncateWalletAddress(address?: string): string | undefined {
  if (!address) return undefined;
  return address.slice(0, 8);
}

export function track(event: EventName, properties?: EventProperties): void {
  if (typeof window === 'undefined') return;
  
  const sanitizedProperties = { ...properties };
  if (sanitizedProperties.wallet && typeof sanitizedProperties.wallet === 'string') {
    sanitizedProperties.wallet = truncateWalletAddress(sanitizedProperties.wallet);
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics]', event, sanitizedProperties);
  }
  
  if (posthogReady) {
    posthog.capture(event, sanitizedProperties);
    return;
  }
  enqueue({ event, properties: sanitizedProperties });
}

export function page(name: string, properties?: EventProperties): void {
  if (typeof window === 'undefined') return;
  
  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics:page]', name, properties);
  }
  
  if (posthogReady) {
    posthog.capture('$pageview', {
      $current_url: window.location.href,
      ...properties
    });
    return;
  }

  if (bufferedPageviews.length >= MAX_BUFFERED_PAGEVIEWS) {
    // Keep the oldest, drop the newest: the queue only ever fills when PostHog
    // never loads, in which case the entry navigations matter most. Say so
    // once per fill rather than dropping silently (#926).
    if (!bufferOverflowWarned) {
      bufferOverflowWarned = true;
      console.warn(
        `[analytics] PostHog has not loaded; buffered ${MAX_BUFFERED_PAGEVIEWS} pageviews and is now dropping further pageviews.`,
      );
    }
    return;
  }
  bufferedPageviews.push({ properties, url: window.location.href });
}

// Last route a pageview was recorded for (#711). The route-change effect is the
// single source of pageviews, but React can run it more than once for the same
// route (Strict Mode double-invokes effects; a layout remount re-runs it), and
// each run used to record another $pageview for the same navigation.
let lastPageviewPath: string | null = null;

/**
 * Record exactly one pageview per navigation: a no-op when `path` is the route
 * already recorded, so only a real route change produces a new event.
 */
export function trackPageview(path: string, properties?: EventProperties): void {
  if (!path || path === lastPageviewPath) return;
  lastPageviewPath = path;
  page(path, properties);
}

/** Test helper: forget the last recorded route. */
export function resetPageviewTracking(): void {
  lastPageviewPath = null;
}

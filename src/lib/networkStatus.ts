/**
 * App-wide connectivity state, combining two signals:
 *
 * 1. `navigator.onLine` plus the window `online` / `offline` events. Fast,
 *    but only knows whether there is *a* network interface, so "connected to
 *    Wi-Fi with no internet" still reads as online.
 * 2. Request failures reported by the API client: a request that got no
 *    response at all (not an HTTP error status) means the network is down
 *    from the app's point of view.
 *
 * While offline because requests failed, the app probes its own origin every
 * PROBE_INTERVAL_MS and recovers on the first success (any successful API
 * response recovers it too), so the banner clears on its own once the
 * connection is back.
 *
 * Plain module state rather than React context so the axios interceptors in
 * lib/api.ts can report into it; components read it via useOnlineStatus().
 */

export const PROBE_INTERVAL_MS = 10_000;

type Listener = () => void;

const listeners = new Set<Listener>();
let browserOnline = true;
let requestsFailing = false;
let probeTimer: ReturnType<typeof setInterval> | null = null;

export function isOnline(): boolean {
  return browserOnline && !requestsFailing;
}

function emit(): void {
  syncProbe();
  listeners.forEach((listener) => listener());
}

function setState(next: { browserOnline?: boolean; requestsFailing?: boolean }): void {
  const before = isOnline();
  const failingBefore = requestsFailing;
  if (next.browserOnline !== undefined) browserOnline = next.browserOnline;
  if (next.requestsFailing !== undefined) requestsFailing = next.requestsFailing;
  if (isOnline() !== before || requestsFailing !== failingBefore) emit();
}

/** A request got no response (DNS failure, connection refused, dropped). */
export function reportRequestFailure(): void {
  setState({ requestsFailing: true });
}

/** A request got any response, even an error status: the network works. */
export function reportRequestSuccess(): void {
  if (requestsFailing) setState({ requestsFailing: false });
}

async function probe(): Promise<void> {
  try {
    // Same origin, so it is always allowed by the CSP; no-store so a cached
    // response can't fake a recovery.
    await fetch(window.location.origin, { method: 'HEAD', cache: 'no-store' });
    reportRequestSuccess();
  } catch {
    // Still unreachable; try again next tick.
  }
}

// Probe only while requests are failing and the browser thinks it is online
// (when it knows it is offline, the `online` event is the recovery signal).
function syncProbe(): void {
  const shouldProbe = requestsFailing && browserOnline && listeners.size > 0;
  if (shouldProbe && probeTimer === null) {
    probeTimer = setInterval(() => void probe(), PROBE_INTERVAL_MS);
  } else if (!shouldProbe && probeTimer !== null) {
    clearInterval(probeTimer);
    probeTimer = null;
  }
}

function onOnline(): void {
  // The interface is back; give requests a clean slate rather than waiting
  // for the next probe. A request that fails again will flip it back.
  setState({ browserOnline: true, requestsFailing: false });
}

function onOffline(): void {
  setState({ browserOnline: false });
}

export function subscribe(listener: Listener): () => void {
  if (listeners.size === 0 && typeof window !== 'undefined') {
    browserOnline = navigator.onLine;
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
  }
  listeners.add(listener);
  syncProbe();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    }
    syncProbe();
  };
}

/** Test helper: back to the initial online state with no listeners attached. */
export function resetNetworkStatus(): void {
  browserOnline = true;
  requestsFailing = false;
  if (probeTimer !== null) clearInterval(probeTimer);
  probeTimer = null;
}

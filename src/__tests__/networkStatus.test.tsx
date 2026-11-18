import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import {
  PROBE_INTERVAL_MS,
  isOnline,
  reportRequestFailure,
  reportRequestSuccess,
  resetNetworkStatus,
  subscribe,
} from '@/lib/networkStatus';
import { OfflineBanner, BACK_ONLINE_DISPLAY_MS } from '@/components/OfflineBanner';

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => value });
}

function goOffline() {
  setNavigatorOnline(false);
  act(() => { window.dispatchEvent(new Event('offline')); });
}

function goOnline() {
  setNavigatorOnline(true);
  act(() => { window.dispatchEvent(new Event('online')); });
}

beforeEach(() => {
  resetNetworkStatus();
  setNavigatorOnline(true);
});

describe('networkStatus', () => {
  it('follows the browser online/offline events', () => {
    const unsubscribe = subscribe(() => {});
    expect(isOnline()).toBe(true);
    goOffline();
    expect(isOnline()).toBe(false);
    goOnline();
    expect(isOnline()).toBe(true);
    unsubscribe();
  });

  it('starts offline when the browser already is', () => {
    setNavigatorOnline(false);
    const unsubscribe = subscribe(() => {});
    expect(isOnline()).toBe(false);
    unsubscribe();
  });

  it('goes offline on request failures and recovers on the next success', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    reportRequestFailure();
    expect(isOnline()).toBe(false);
    reportRequestSuccess();
    expect(isOnline()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  describe('recovery probe', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

    it('probes the origin while requests fail and recovers once it answers', async () => {
      const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(new Response());
      vi.stubGlobal('fetch', fetchMock);
      const unsubscribe = subscribe(() => {});

      reportRequestFailure();
      await vi.advanceTimersByTimeAsync(PROBE_INTERVAL_MS);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(isOnline()).toBe(false);

      await vi.advanceTimersByTimeAsync(PROBE_INTERVAL_MS);
      expect(isOnline()).toBe(true);

      // Stops probing once recovered.
      await vi.advanceTimersByTimeAsync(PROBE_INTERVAL_MS * 3);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      unsubscribe();
    });
  });
});

describe('OfflineBanner', () => {
  afterEach(() => vi.useRealTimers());

  it('shows nothing while online', () => {
    render(<OfflineBanner />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('shows the offline banner, then a brief "back online" notice', () => {
    vi.useFakeTimers();
    render(<OfflineBanner />);

    goOffline();
    expect(screen.getByRole('status')).toHaveTextContent(/you're offline/i);

    goOnline();
    expect(screen.getByRole('status')).toHaveTextContent(/back online/i);

    act(() => { vi.advanceTimersByTime(BACK_ONLINE_DISPLAY_MS); });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('shows the banner when API requests fail even though the browser reports online', () => {
    render(<OfflineBanner />);
    act(() => reportRequestFailure());
    expect(screen.getByRole('status')).toHaveTextContent(/you're offline/i);
  });
});

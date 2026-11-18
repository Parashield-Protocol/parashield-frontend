import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useOracleReading, useAllOracleReadings, VISIBILITY_REFETCH_MIN_MS } from '../useOracle';
import { fetchAllOracleReadings } from '@/lib/api';

const mockFetchOracleReading = vi.fn();

vi.mock('@/lib/api', () => ({
  fetchOracleReading: (...args: unknown[]) => mockFetchOracleReading(...args),
  fetchAllOracleReadings: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/constants', () => ({
  ORACLE_REFRESH_INTERVAL_MS: 86_400_000,
}));

describe('useOracleReading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets loading true only on the initial fetch', async () => {
    mockFetchOracleReading.mockResolvedValue({
      key: 'weather-abuja',
      dataType: 'weather',
      value: '324000000',
      confidence: 95,
      timestamp: Date.now() / 1000,
      source: 'mock',
    });

    const { result } = renderHook(() => useOracleReading('weather-abuja'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.reading).not.toBeNull();
    expect(result.current.reading?.key).toBe('weather-abuja');
  });

  it('does not set loading on background polls', async () => {
    const reading1 = {
      key: 'weather-abuja',
      dataType: 'weather' as const,
      value: '324000000',
      confidence: 95,
      timestamp: 1000,
      source: 'mock',
    };
    const reading2 = {
      key: 'weather-abuja',
      dataType: 'weather' as const,
      value: '648000000',
      confidence: 90,
      timestamp: 2000,
      source: 'mock',
    };

    mockFetchOracleReading
      .mockResolvedValueOnce(reading1)
      .mockResolvedValueOnce(reading2);

    const { result } = renderHook(() => useOracleReading('weather-abuja'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.reading?.value).toBe('324000000');

    await act(async () => {
      result.current.refetch();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.reading?.value).toBe('648000000');
  });

  it('does not let a stale response overwrite a newer key', async () => {
    const slowReading = {
      key: 'weather-abuja',
      dataType: 'weather' as const,
      value: 'slow-value',
      confidence: 80,
      timestamp: 1000,
      source: 'mock',
    };
    const fastReading = {
      key: 'weather-lagos',
      dataType: 'weather' as const,
      value: 'fast-value',
      confidence: 95,
      timestamp: 2000,
      source: 'mock',
    };

    let resolveSlow: (v: typeof slowReading) => void;
    const slowPromise = new Promise<typeof slowReading>((r) => { resolveSlow = r; });
    mockFetchOracleReading
      .mockReturnValueOnce(slowPromise)
      .mockResolvedValueOnce(fastReading);

    const { result, rerender } = renderHook(
      ({ key }) => useOracleReading(key),
      { initialProps: { key: 'weather-abuja' } },
    );

    await act(async () => {});

    rerender({ key: 'weather-lagos' });

    await act(async () => {});

    await act(async () => {
      resolveSlow!(slowReading);
    });

    await waitFor(() => {
      expect(result.current.reading?.key).toBe('weather-lagos');
      expect(result.current.reading?.value).toBe('fast-value');
    });
  });

  it('clears stale data and shows loading when the key switches directly (issue #229)', async () => {
    const firstReading = {
      key: 'weather-abuja',
      dataType: 'weather' as const,
      value: 'first-value',
      confidence: 95,
      timestamp: 1000,
      source: 'mock',
    };
    const secondReading = {
      key: 'weather-lagos',
      dataType: 'weather' as const,
      value: 'second-value',
      confidence: 90,
      timestamp: 2000,
      source: 'mock',
    };

    let resolveSecond: (v: typeof secondReading) => void;
    const secondPromise = new Promise<typeof secondReading>((r) => { resolveSecond = r; });
    mockFetchOracleReading
      .mockResolvedValueOnce(firstReading)
      .mockReturnValueOnce(secondPromise);

    const { result, rerender } = renderHook(
      ({ key }) => useOracleReading(key),
      { initialProps: { key: 'weather-abuja' } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.reading?.value).toBe('first-value');

    // Key changes with no intermediate null — the previous key's reading must
    // not stay on screen unlabelled while the new fetch is in flight.
    rerender({ key: 'weather-lagos' });

    expect(result.current.reading).toBeNull();
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveSecond!(secondReading);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.reading?.value).toBe('second-value');
  });

  it('sets error state on fetch failure', async () => {
    mockFetchOracleReading.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useOracleReading('weather-abuja'));

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });
  });

  it('returns null reading when key is null', () => {
    const { result } = renderHook(() => useOracleReading(null));
    expect(result.current.reading).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // Issue #471: the visibilitychange listener registered to drive foreground
  // polling must be removed on unmount, or it keeps firing (and re-fetching)
  // for a component instance that's no longer mounted / no longer the
  // active page.
  it('removes its visibilitychange listener on unmount', () => {
    mockFetchOracleReading.mockResolvedValue({
      key: 'weather-abuja',
      dataType: 'weather',
      value: '324000000',
      confidence: 95,
      timestamp: Date.now() / 1000,
      source: 'mock',
    });

    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => useOracleReading('weather-abuja'));

    expect(addSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    const [, registeredHandler] = addSpy.mock.calls.find(
      ([event]) => event === 'visibilitychange',
    )!;

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', registeredHandler);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  // Issue #519: rapid tab switching must not trigger a fetch per
  // visibilitychange -- only once the last fetch is older than
  // VISIBILITY_REFETCH_MIN_MS.
  it('throttles visibilitychange refetches to VISIBILITY_REFETCH_MIN_MS', async () => {
    mockFetchOracleReading.mockResolvedValue({
      key: 'weather-abuja',
      dataType: 'weather',
      value: '324000000',
      confidence: 95,
      timestamp: 1000,
      source: 'mock',
    });
    let now = 1_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now);

    renderHook(() => useOracleReading('weather-abuja'));
    await waitFor(() => expect(mockFetchOracleReading).toHaveBeenCalledTimes(1));

    for (let i = 0; i < 10; i++) {
      now += 100;
      act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    }
    expect(mockFetchOracleReading).toHaveBeenCalledTimes(1);

    now += VISIBILITY_REFETCH_MIN_MS;
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await waitFor(() => expect(mockFetchOracleReading).toHaveBeenCalledTimes(2));

    nowSpy.mockRestore();
  });

  // Issue #588: the visibility listener must survive key changes instead of
  // being torn down and re-added, and must fetch the *current* key.
  it('keeps one visibilitychange listener across key changes and refetches the new key', async () => {
    mockFetchOracleReading.mockImplementation((key: string) => Promise.resolve({
      key, dataType: 'weather', value: '324000000', confidence: 95, timestamp: 1000, source: 'mock',
    }));
    let now = 1_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now);
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const visibilityCalls = (spy: typeof addSpy) =>
      spy.mock.calls.filter(([event]) => event === 'visibilitychange').length;

    const { rerender } = renderHook(({ k }) => useOracleReading(k), {
      initialProps: { k: 'weather-abuja' },
    });
    await waitFor(() => expect(mockFetchOracleReading).toHaveBeenCalledWith('weather-abuja'));

    rerender({ k: 'weather-lagos' });
    await waitFor(() => expect(mockFetchOracleReading).toHaveBeenCalledWith('weather-lagos'));
    expect(visibilityCalls(addSpy)).toBe(1);
    expect(visibilityCalls(removeSpy)).toBe(0);

    mockFetchOracleReading.mockClear();
    now += VISIBILITY_REFETCH_MIN_MS;
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await waitFor(() => expect(mockFetchOracleReading).toHaveBeenCalledTimes(1));
    expect(mockFetchOracleReading).toHaveBeenCalledWith('weather-lagos');

    nowSpy.mockRestore();
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

describe('useAllOracleReadings', () => {
  it('throttles visibilitychange refetches to VISIBILITY_REFETCH_MIN_MS', async () => {
    const mockFetchAll = vi.mocked(fetchAllOracleReadings);
    mockFetchAll.mockClear();
    let now = 5_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now);

    renderHook(() => useAllOracleReadings());
    await waitFor(() => expect(mockFetchAll).toHaveBeenCalledTimes(1));

    now += 100;
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(mockFetchAll).toHaveBeenCalledTimes(1);

    now += VISIBILITY_REFETCH_MIN_MS;
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await waitFor(() => expect(mockFetchAll).toHaveBeenCalledTimes(2));

    nowSpy.mockRestore();
  });
});

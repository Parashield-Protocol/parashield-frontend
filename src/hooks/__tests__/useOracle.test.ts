import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useOracleReading } from '../useOracle';

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
});

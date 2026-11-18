import { act } from 'react';
import { useOracleReading, useAllOracleReadings } from '../hooks/useOracle';
import { renderHook, flushMicrotasks } from './renderHook';
import type { OracleReading } from '../types';

const { fetchOracleReading, fetchAllOracleReadings } = vi.hoisted(() => ({
  fetchOracleReading:     vi.fn(),
  fetchAllOracleReadings: vi.fn(),
}));

vi.mock('@/lib/api', () => ({ fetchOracleReading, fetchAllOracleReadings }));

function makeReading(overrides: Partial<OracleReading> = {}): OracleReading {
  return {
    key: 'rainfall:lagos',
    dataType: 'weather',
    value: '1000000',
    confidence: 95,
    timestamp: 1_720_000_000,
    source: 'test-oracle',
    ...overrides,
  };
}

describe('useOracleReading', () => {
  beforeEach(() => {
    fetchOracleReading.mockReset();
  });

  it('does nothing when key is null', async () => {
    const hook = renderHook(() => useOracleReading(null));
    await flushMicrotasks();

    expect(hook.current.loading).toBe(false);
    expect(hook.current.reading).toBeNull();
    expect(fetchOracleReading).not.toHaveBeenCalled();
  });

  it('shows loading on the first fetch and populates the reading on success', async () => {
    const reading = makeReading();
    fetchOracleReading.mockResolvedValue(reading);

    const hook = renderHook(() => useOracleReading('rainfall:lagos'));
    expect(hook.current.loading).toBe(true);

    await flushMicrotasks();

    expect(hook.current.loading).toBe(false);
    expect(hook.current.reading).toEqual(reading);
  });

  it('surfaces an error message when the fetch fails', async () => {
    fetchOracleReading.mockRejectedValue(new Error('oracle offline'));

    const hook = renderHook(() => useOracleReading('rainfall:lagos'));
    await flushMicrotasks();

    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBe('oracle offline');
  });

  it('discards a stale response for a key that is no longer current (out-of-order guard)', async () => {
    let resolveFirst!: (value: OracleReading) => void;
    fetchOracleReading.mockImplementationOnce(
      () => new Promise<OracleReading>((resolve) => { resolveFirst = resolve; }),
    );

    let key = 'rainfall:lagos';
    const hook = renderHook(() => useOracleReading(key));
    await flushMicrotasks();

    // Switch to a new key before the first request resolves.
    const secondReading = makeReading({ key: 'rainfall:nairobi' });
    fetchOracleReading.mockResolvedValueOnce(secondReading);
    key = 'rainfall:nairobi';
    hook.rerender();
    await flushMicrotasks();

    // The first (stale) request now resolves — it must not overwrite the
    // reading that belongs to the current key.
    await act(async () => {
      resolveFirst(makeReading({ key: 'rainfall:lagos', value: 'stale' }));
      await Promise.resolve();
    });

    expect(hook.current.reading).toEqual(secondReading);
  });

  it('does not show the loading spinner again on background polls', async () => {
    fetchOracleReading.mockResolvedValue(makeReading());

    const hook = renderHook(() => useOracleReading('rainfall:lagos'));
    await flushMicrotasks();
    expect(hook.current.loading).toBe(false);

    await act(async () => {
      await hook.current.refetch();
    });

    expect(hook.current.loading).toBe(false);
  });
});

describe('useAllOracleReadings', () => {
  beforeEach(() => {
    fetchAllOracleReadings.mockReset();
  });

  it('starts in a loading state and populates readings on success', async () => {
    const readings = [makeReading()];
    fetchAllOracleReadings.mockResolvedValue(readings);

    const hook = renderHook(() => useAllOracleReadings());
    expect(hook.current.loading).toBe(true);

    await flushMicrotasks();

    expect(hook.current.loading).toBe(false);
    expect(hook.current.readings).toEqual(readings);
  });

  it('surfaces an error message when the fetch fails', async () => {
    fetchAllOracleReadings.mockRejectedValue(new Error('oracle offline'));

    const hook = renderHook(() => useAllOracleReadings());
    await flushMicrotasks();

    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBe('oracle offline');
  });

  it('does not show the loading spinner again on a manual refetch', async () => {
    fetchAllOracleReadings.mockResolvedValue([makeReading()]);

    const hook = renderHook(() => useAllOracleReadings());
    await flushMicrotasks();
    expect(hook.current.loading).toBe(false);

    await act(async () => {
      await hook.current.refetch();
    });

    expect(hook.current.loading).toBe(false);
  });

  it('discards a slower refetch response overtaken by a newer refetch (#450)', async () => {
    fetchAllOracleReadings.mockResolvedValueOnce([makeReading({ key: 'initial' })]);
    const hook = renderHook(() => useAllOracleReadings());
    await flushMicrotasks();

    const resolvers: Array<(readings: OracleReading[]) => void> = [];
    fetchAllOracleReadings.mockImplementation(
      () => new Promise<OracleReading[]>((resolve) => { resolvers.push(resolve); }),
    );

    // Fire two manual refetches back to back before either resolves.
    act(() => { void hook.current.refetch(); });
    act(() => { void hook.current.refetch(); });
    await flushMicrotasks();

    expect(resolvers).toHaveLength(2);

    // Resolve the second (newer) request first, then the stale first one.
    act(() => resolvers[1]([makeReading({ key: 'newer' })]));
    await flushMicrotasks();
    act(() => resolvers[0]([makeReading({ key: 'stale' })]));
    await flushMicrotasks();

    expect(hook.current.readings).toEqual([makeReading({ key: 'newer' })]);
  });
});

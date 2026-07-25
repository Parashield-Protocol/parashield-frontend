import { act } from 'react';
import { usePools } from '../hooks/usePools';
import { renderHook, flushMicrotasks } from './renderHook';
import type { PoolStats } from '../types';

const { fetchPoolStats } = vi.hoisted(() => ({ fetchPoolStats: vi.fn() }));

vi.mock('@/lib/api', () => ({ fetchPoolStats }));

function makePool(overrides: Partial<PoolStats> = {}): PoolStats {
  return {
    poolId: 'pool-1',
    category: 'crop',
    totalLiquidity: '1000000',
    activePolicies: 3,
    utilizationRate: 0.4,
    apy: 0.12,
    ...overrides,
  };
}

describe('usePools', () => {
  beforeEach(() => fetchPoolStats.mockReset());

  it('starts in a loading state and populates pools on success', async () => {
    const pools = [makePool()];
    fetchPoolStats.mockResolvedValue(pools);

    const hook = renderHook(() => usePools());
    expect(hook.current.loading).toBe(true);

    await flushMicrotasks();

    expect(hook.current.loading).toBe(false);
    expect(hook.current.pools).toEqual(pools);
    expect(hook.current.error).toBeNull();
  });

  it('surfaces an error message when the fetch fails', async () => {
    fetchPoolStats.mockRejectedValue(new Error('network down'));

    const hook = renderHook(() => usePools());
    await flushMicrotasks();

    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBe('network down');
    expect(hook.current.pools).toEqual([]);
  });

  it('refetch re-runs the load and clears a previous error on success', async () => {
    fetchPoolStats.mockRejectedValueOnce(new Error('first failure'));
    const hook = renderHook(() => usePools());
    await flushMicrotasks();
    expect(hook.current.error).toBe('first failure');

    const pools = [makePool({ poolId: 'pool-2' })];
    fetchPoolStats.mockResolvedValueOnce(pools);
    await act(async () => {
      await hook.current.refetch();
    });

    expect(hook.current.error).toBeNull();
    expect(hook.current.pools).toEqual(pools);
  });
});

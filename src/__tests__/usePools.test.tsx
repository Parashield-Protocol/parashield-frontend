import { usePools } from '../hooks/usePools';
import { renderHook, flushMicrotasks } from './renderHook';
import type { PoolStats } from '../types';

const { fetchPoolStats } = vi.hoisted(() => ({ fetchPoolStats: vi.fn() }));

vi.mock('@/lib/api', () => ({ fetchPoolStats }));

function makePoolStats(overrides: Partial<PoolStats> = {}): PoolStats {
  return {
    id: 'pool-1',
    name: 'Weather Pool A',
    tvl: '1000000000',
    utilizationRate: '0.45',
    totalPolicies: '150',
    totalClaims: '5',
    apy: '0.12',
    ...overrides,
  };
}

describe('usePools', () => {
  beforeEach(() => {
    fetchPoolStats.mockReset();
  });

  it('loads pools and exposes refetch', async () => {
    const pools = [makePoolStats()];
    fetchPoolStats.mockResolvedValue(pools);

    const hook = renderHook(() => usePools());
    expect(hook.current.loading).toBe(true);
    expect(hook.current.error).toBeNull();

    await flushMicrotasks();

    expect(hook.current.loading).toBe(false);
    expect(hook.current.pools).toEqual(pools);
    expect(hook.current.error).toBeNull();
    expect(typeof hook.current.refetch).toBe('function');
  });

  it('surfaces an error message when the fetch fails', async () => {
    fetchPoolStats.mockRejectedValue(new Error('api error'));

    const hook = renderHook(() => usePools());
    await flushMicrotasks();

    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBe('api error');
    expect(hook.current.pools).toEqual([]);
  });

  it('refetch loads pools again', async () => {
    const initialPools = [makePoolStats({ id: 'pool-1' })];
    fetchPoolStats.mockResolvedValue(initialPools);

    const hook = renderHook(() => usePools());
    await flushMicrotasks();
    expect(hook.current.pools).toEqual(initialPools);

    const updatedPools = [
      makePoolStats({ id: 'pool-1', tvl: '2000000000' }),
    ];
    fetchPoolStats.mockResolvedValue(updatedPools);

    await hook.current.refetch();

    expect(hook.current.pools).toEqual(updatedPools);
    expect(hook.current.error).toBeNull();
  });

  it('returns empty pools array on initial load before data arrives', () => {
    fetchPoolStats.mockImplementation(
      () => new Promise(() => {}),
    );

    const hook = renderHook(() => usePools());

    expect(hook.current.pools).toEqual([]);
    expect(hook.current.loading).toBe(true);
  });
});

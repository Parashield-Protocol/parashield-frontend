import { act } from 'react';
import { usePolicies } from '../hooks/usePolicies';
import { renderHook, flushMicrotasks } from './renderHook';
import type { Policy } from '../types';

const { fetchUserPolicies } = vi.hoisted(() => ({ fetchUserPolicies: vi.fn() }));

vi.mock('@/lib/api', () => ({ fetchUserPolicies, fetchPolicy: vi.fn() }));

function makePolicy(overrides: Partial<Policy> = {}): Policy {
  return {
    id: 'policy-1',
    productId: 'product-1',
    policyholder: 'GABCDEF1234567890',
    coverage: '10000000',
    premiumPaid: '500000',
    oracleKey: 'weather:lagos',
    startTime: 1_720_000_000,
    endTime: 1_720_086_400,
    status: 'Active',
    ...overrides,
  };
}

describe('usePolicies', () => {
  beforeEach(() => {
    fetchUserPolicies.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not fetch and returns an empty list when there is no wallet address', async () => {
    const hook = renderHook(() => usePolicies(null));
    await flushMicrotasks();

    expect(hook.current.policies).toEqual([]);
    expect(hook.current.loading).toBe(false);
    expect(fetchUserPolicies).not.toHaveBeenCalled();
  });

  it('shows loading on the first fetch and populates policies on success', async () => {
    const policies = [makePolicy()];
    fetchUserPolicies.mockResolvedValue(policies);

    const hook = renderHook(() => usePolicies('GWALLET'));
    expect(hook.current.loading).toBe(true);

    await flushMicrotasks();

    expect(hook.current.loading).toBe(false);
    expect(hook.current.policies).toEqual(policies);
    expect(hook.current.error).toBeNull();
  });

  it('surfaces an error message when the fetch fails', async () => {
    fetchUserPolicies.mockRejectedValue(new Error('failed to reach api'));

    const hook = renderHook(() => usePolicies('GWALLET'));
    await flushMicrotasks();

    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBe('failed to reach api');
  });

  it('does not flash the loading skeleton on background poll refreshes', async () => {
    fetchUserPolicies.mockResolvedValue([makePolicy()]);

    const hook = renderHook(() => usePolicies('GWALLET'));
    await flushMicrotasks();
    expect(hook.current.loading).toBe(false);

    // Advance past the poll interval and let the background refresh run.
    const updated = [makePolicy({ id: 'policy-2' })];
    fetchUserPolicies.mockResolvedValue(updated);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(hook.current.loading).toBe(false);
    expect(hook.current.policies).toEqual(updated);
  });

  it('discards a stale response from a previous wallet after the wallet address changes', async () => {
    const pending: Record<string, (policies: Policy[]) => void> = {};
    fetchUserPolicies.mockImplementation(
      (wallet: string) =>
        new Promise<Policy[]>((resolve) => { pending[wallet] = resolve; }),
    );

    let wallet = 'GWALLET_A';
    const hook = renderHook(() => usePolicies(wallet));
    await flushMicrotasks();
    expect(pending['GWALLET_A']).toBeDefined();

    // Switch wallets before the first request resolves — this aborts the
    // controller tied to the in-flight request for GWALLET_A.
    wallet = 'GWALLET_B';
    hook.rerender();
    await flushMicrotasks();
    expect(pending['GWALLET_B']).toBeDefined();

    const policiesForB = [makePolicy({ id: 'policy-b' })];
    await act(async () => {
      pending['GWALLET_B'](policiesForB);
      await Promise.resolve();
    });
    expect(hook.current.policies).toEqual(policiesForB);

    // The stale GWALLET_A response now resolves; it must not overwrite the
    // policies that belong to the current wallet.
    await act(async () => {
      pending['GWALLET_A']([makePolicy({ id: 'stale-policy' })]);
      await Promise.resolve();
    });

    expect(hook.current.policies).toEqual(policiesForB);
  });
});

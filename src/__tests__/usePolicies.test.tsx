import { act } from 'react';
import { usePolicies, usePolicy } from '../hooks/usePolicies';
import { renderHook, flushMicrotasks } from './renderHook';
import type { Policy } from '../types';

const { fetchUserPolicies, fetchPolicy } = vi.hoisted(() => ({
  fetchUserPolicies: vi.fn(),
  fetchPolicy: vi.fn(),
}));

vi.mock('@/lib/api', () => ({ fetchUserPolicies, fetchPolicy }));

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

describe('usePolicy', () => {
  beforeEach(() => {
    fetchPolicy.mockReset();
  });

  it('does not fetch and returns null when there is no policy id', async () => {
    const hook = renderHook(() => usePolicy(null));
    await flushMicrotasks();

    expect(hook.current.policy).toBeNull();
    expect(hook.current.loading).toBe(false);
    expect(fetchPolicy).not.toHaveBeenCalled();
  });

  it('shows loading and populates policy on success', async () => {
    const policy = makePolicy();
    fetchPolicy.mockResolvedValue(policy);

    const hook = renderHook(() => usePolicy('policy-1'));
    expect(hook.current.loading).toBe(true);

    await flushMicrotasks();

    expect(hook.current.loading).toBe(false);
    expect(hook.current.policy).toEqual(policy);
    expect(hook.current.error).toBeNull();
  });

  it('surfaces an error message when the fetch fails', async () => {
    fetchPolicy.mockRejectedValue(new Error('policy not found'));

    const hook = renderHook(() => usePolicy('policy-1'));
    await flushMicrotasks();

    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBe('policy not found');
    expect(hook.current.policy).toBeNull();
  });

  it('does not let a stale response overwrite the current one when id changes quickly', async () => {
    const pending: Record<string, (policy: Policy) => void> = {};
    fetchPolicy.mockImplementation(
      (id: string) =>
        new Promise<Policy>((resolve) => { pending[id] = resolve; }),
    );

    let id = 'policy-1';
    const hook = renderHook(() => usePolicy(id));
    await flushMicrotasks();
    expect(pending['policy-1']).toBeDefined();

    // Change id before the first request resolves.
    id = 'policy-2';
    hook.rerender();
    await flushMicrotasks();
    expect(pending['policy-2']).toBeDefined();

    const policy2 = makePolicy({ id: 'policy-2' });
    await act(async () => {
      pending['policy-2'](policy2);
      await Promise.resolve();
    });
    expect(hook.current.policy).toEqual(policy2);

    // The stale policy-1 response now resolves; it must not overwrite
    // the current policy-2.
    const policy1 = makePolicy({ id: 'policy-1' });
    await act(async () => {
      pending['policy-1'](policy1);
      await Promise.resolve();
    });

    expect(hook.current.policy).toEqual(policy2);
  });

  it('refetch allows manual refresh independent of id changes', async () => {
    const policy = makePolicy();
    fetchPolicy.mockResolvedValue(policy);

    const hook = renderHook(() => usePolicy('policy-1'));
    await flushMicrotasks();
    expect(hook.current.policy).toEqual(policy);
    expect(fetchPolicy).toHaveBeenCalledTimes(1);

    const updatedPolicy = makePolicy({ coverage: '20000000' });
    fetchPolicy.mockResolvedValue(updatedPolicy);

    await hook.current.refetch();

    expect(hook.current.policy).toEqual(updatedPolicy);
    expect(fetchPolicy).toHaveBeenCalledTimes(2);
  });
});

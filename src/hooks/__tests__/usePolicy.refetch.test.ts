import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { usePolicy } from '../usePolicies';
import type { Policy } from '@/types';

const mockFetchPolicy = vi.fn();

vi.mock('@/lib/api', () => ({
  fetchUserPolicies: vi.fn(),
  fetchPolicy: (...args: unknown[]) => mockFetchPolicy(...args),
}));

vi.mock('@/lib/policyCache', () => ({
  getCachedPolicy: () => null,
  setCachedPolicy: vi.fn(),
}));

function policy(status: Policy['status']): Policy {
  return {
    id:           'policy-1',
    productId:    'prod-1',
    policyholder: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    coverage:     '1000000000',
    premiumPaid:  '50000000',
    oracleKey:    'rainfall:6.5244,3.3792:2026-07',
    startTime:    1_780_000_000,
    endTime:      1_790_000_000,
    status,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('usePolicy refetch (#921)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the newest refetch result when an older one resolves last', async () => {
    mockFetchPolicy.mockResolvedValueOnce(policy('Active'));
    const { result } = renderHook(() => usePolicy('policy-1'));
    await waitFor(() => expect(result.current.policy?.status).toBe('Active'));

    const slow = deferred<Policy>();
    mockFetchPolicy
      .mockImplementationOnce(() => slow.promise)
      .mockResolvedValueOnce(policy('Claimed'));

    let first!: Promise<void>;
    act(() => {
      first = result.current.refetch();
    });
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.policy?.status).toBe('Claimed');

    await act(async () => {
      slow.resolve(policy('Expired'));
      await first;
    });

    expect(result.current.policy?.status).toBe('Claimed');
    expect(result.current.refetching).toBe(false);
  });

  it('ignores a superseded refetch that fails', async () => {
    mockFetchPolicy.mockResolvedValueOnce(policy('Active'));
    const { result } = renderHook(() => usePolicy('policy-1'));
    await waitFor(() => expect(result.current.policy).not.toBeNull());

    let rejectSlow!: (err: unknown) => void;
    mockFetchPolicy
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectSlow = reject;
          }),
      )
      .mockResolvedValueOnce(policy('Claimed'));

    let first!: Promise<void>;
    act(() => {
      first = result.current.refetch();
    });
    await act(async () => {
      await result.current.refetch();
    });

    await act(async () => {
      rejectSlow(new Error('stale failure'));
      await first;
    });

    expect(result.current.error).toBeNull();
    expect(result.current.policy?.status).toBe('Claimed');
  });
});

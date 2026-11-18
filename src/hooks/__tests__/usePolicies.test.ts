import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { usePolicies } from '../usePolicies';
import type { Policy } from '@/types';

const mockFetchUserPolicies = vi.fn();

vi.mock('@/lib/api', () => ({
  fetchUserPolicies: (...args: unknown[]) => mockFetchUserPolicies(...args),
  fetchPolicy: vi.fn(),
}));

vi.mock('@/lib/constants', () => ({
  POLLING_INTERVAL_MS: 86_400_000,
}));

const WALLET_A = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const WALLET_B = 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

function policy(id: string, policyholder: string): Policy {
  return {
    id,
    productId:    'prod-1',
    policyholder,
    coverage:     '1000000000',
    premiumPaid:  '50000000',
    oracleKey:    'rainfall:6.5244,3.3792:2026-07',
    startTime:    1_780_000_000,
    endTime:      1_790_000_000,
    status:       'Active',
  };
}

describe('usePolicies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets loading true only on the initial fetch', async () => {
    mockFetchUserPolicies.mockResolvedValue([policy('policy-1', WALLET_A)]);

    const { result } = renderHook(() => usePolicies(WALLET_A));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.policies).toHaveLength(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.loading).toBe(false);
  });

  it('clears stale policies and shows loading when the wallet switches directly (issue #229)', async () => {
    let resolveSecond: (v: Policy[]) => void;
    const secondPromise = new Promise<Policy[]>((r) => { resolveSecond = r; });
    mockFetchUserPolicies
      .mockResolvedValueOnce([policy('policy-a', WALLET_A)])
      .mockReturnValueOnce(secondPromise);

    const { result, rerender } = renderHook(
      ({ wallet }) => usePolicies(wallet),
      { initialProps: { wallet: WALLET_A } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.policies[0].id).toBe('policy-a');

    // Account switched inside the wallet extension — address changes with no
    // intermediate disconnect, so wallet A's policies must not remain rendered
    // as if they belonged to wallet B.
    rerender({ wallet: WALLET_B });

    expect(result.current.policies).toEqual([]);
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveSecond!([policy('policy-b', WALLET_B)]);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.policies[0].id).toBe('policy-b');
  });

  it('resets state when the wallet disconnects', async () => {
    mockFetchUserPolicies.mockResolvedValue([policy('policy-a', WALLET_A)]);

    const { result, rerender } = renderHook(
      ({ wallet }) => usePolicies(wallet),
      { initialProps: { wallet: WALLET_A as string | null } },
    );

    await waitFor(() => {
      expect(result.current.policies).toHaveLength(1);
    });

    rerender({ wallet: null });

    expect(result.current.policies).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});

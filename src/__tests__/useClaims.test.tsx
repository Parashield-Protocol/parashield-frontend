import { act } from 'react';
import { useClaims } from '../hooks/useClaims';
import { renderHook, flushMicrotasks } from './renderHook';
import type { Claim } from '../types';

const { fetchUserClaims } = vi.hoisted(() => ({
  fetchUserClaims: vi.fn(),
}));

vi.mock('@/lib/api', () => ({ fetchUserClaims }));

function makeClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 'claim-1',
    policyId: 'policy-1',
    claimant: 'GABCDEF1234567890',
    triggerMet: true,
    status: 'Pending',
    submittedAt: 1_720_000_000,
    processedAt: null,
    ...overrides,
  };
}

describe('useClaims', () => {
  beforeEach(() => {
    fetchUserClaims.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not poll again while paused', async () => {
    fetchUserClaims.mockResolvedValue([makeClaim()]);

    const hook = renderHook(() => useClaims('GWALLET'));
    await flushMicrotasks();
    expect(fetchUserClaims).toHaveBeenCalledTimes(1);

    act(() => hook.current.togglePause());
    expect(hook.current.paused).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    // Still only the initial call -- no poll fired while paused.
    expect(fetchUserClaims).toHaveBeenCalledTimes(1);
  });

  it('resumes polling after togglePause is called again', async () => {
    fetchUserClaims.mockResolvedValue([makeClaim()]);

    const hook = renderHook(() => useClaims('GWALLET'));
    await flushMicrotasks();

    act(() => hook.current.togglePause());
    act(() => hook.current.togglePause());
    expect(hook.current.paused).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(fetchUserClaims).toHaveBeenCalledTimes(2);
  });

  it('counts down secondsUntilRefresh toward zero after a successful load', async () => {
    fetchUserClaims.mockResolvedValue([makeClaim()]);

    const hook = renderHook(() => useClaims('GWALLET'));
    await flushMicrotasks();

    expect(hook.current.secondsUntilRefresh).toBe(15);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(hook.current.secondsUntilRefresh).toBe(10);
  });

  // Issue #466: a background poll failing after the initial load already
  // succeeded must not silently disappear, and must not wipe out the
  // already-loaded claims the way a blocking `error` would.
  describe('background polling failures', () => {
    it('surfaces a background poll failure via pollingError, not error, and keeps existing claims', async () => {
      fetchUserClaims.mockResolvedValueOnce([makeClaim()]);
      const hook = renderHook(() => useClaims('GWALLET'));
      await flushMicrotasks();

      expect(hook.current.claims).toHaveLength(1);
      expect(hook.current.error).toBeNull();
      expect(hook.current.pollingError).toBeNull();

      fetchUserClaims.mockRejectedValueOnce(new Error('Network unreachable'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });

      expect(hook.current.pollingError).toBe('Network unreachable');
      expect(hook.current.error).toBeNull();
      expect(hook.current.claims).toHaveLength(1); // stale-but-valid data preserved
    });

    it('clears pollingError once a subsequent poll succeeds', async () => {
      fetchUserClaims.mockResolvedValueOnce([makeClaim()]);
      const hook = renderHook(() => useClaims('GWALLET'));
      await flushMicrotasks();

      fetchUserClaims.mockRejectedValueOnce(new Error('Network unreachable'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });
      expect(hook.current.pollingError).toBe('Network unreachable');

      fetchUserClaims.mockResolvedValueOnce([makeClaim(), makeClaim({ id: 'claim-2' })]);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });

      expect(hook.current.pollingError).toBeNull();
      expect(hook.current.claims).toHaveLength(2);
    });

    it('does not set pollingError for the initial load failure (uses error instead)', async () => {
      fetchUserClaims.mockRejectedValueOnce(new Error('Initial load failed'));
      const hook = renderHook(() => useClaims('GWALLET'));
      await flushMicrotasks();

      expect(hook.current.error).toBe('Initial load failed');
      expect(hook.current.pollingError).toBeNull();
    });
  });
});

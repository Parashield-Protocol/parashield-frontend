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
});

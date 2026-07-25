import { act } from 'react';
import { useClaim } from '../hooks/useClaim';
import { renderHook, flushMicrotasks } from './renderHook';
import type { Claim } from '../types';

const { fetchClaim, fetchUserClaims, invokeSubmitClaim, useWallet } = vi.hoisted(() => ({
  fetchClaim:        vi.fn(),
  fetchUserClaims:   vi.fn(),
  invokeSubmitClaim: vi.fn(),
  useWallet:         vi.fn(),
}));

vi.mock('@/lib/api', () => ({ fetchClaim, fetchUserClaims }));
vi.mock('@/lib/contract', () => ({ invokeSubmitClaim }));
vi.mock('@/hooks/useWallet', () => ({ useWallet }));

function makeClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 'claim-1',
    policyId: 'policy-1',
    claimant: 'GWALLET',
    triggerMet: true,
    status: 'Processing',
    submittedAt: 1_720_000_000,
    processedAt: null,
    ...overrides,
  };
}

describe('useClaim', () => {
  beforeEach(() => {
    fetchClaim.mockReset();
    fetchUserClaims.mockReset();
    invokeSubmitClaim.mockReset();
    useWallet.mockReset();
    useWallet.mockReturnValue({ address: 'GWALLET' });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays idle when there is no wallet or policyId', async () => {
    useWallet.mockReturnValue({ address: null });
    const hook = renderHook(() => useClaim(undefined));
    await flushMicrotasks();

    expect(hook.current.step).toBe('idle');
    expect(fetchUserClaims).not.toHaveBeenCalled();
  });

  it('picks up an existing in-flight claim and starts polling', async () => {
    const existing = makeClaim({ status: 'Processing' });
    fetchUserClaims.mockResolvedValue([existing]);

    const hook = renderHook(() => useClaim('policy-1'));
    await flushMicrotasks();

    expect(hook.current.step).toBe('polling');
    expect(hook.current.claim).toEqual(existing);
    expect(hook.current.claimId).toBe(existing.id);
  });

  it('marks an already-settled claim as done without polling', async () => {
    const settled = makeClaim({ status: 'Paid', txHash: 'tx-abc' });
    fetchUserClaims.mockResolvedValue([settled]);

    const hook = renderHook(() => useClaim('policy-1'));
    await flushMicrotasks();

    expect(hook.current.step).toBe('done');
    expect(hook.current.claimId).toBe('tx-abc');
  });

  it('submits a claim and transitions from submitting to polling', async () => {
    fetchUserClaims.mockResolvedValue([]);
    invokeSubmitClaim.mockResolvedValue('tx-hash-1');

    const hook = renderHook(() => useClaim('policy-1'));
    await flushMicrotasks();
    expect(hook.current.step).toBe('idle');

    let submitResult: { error: string | null } | undefined;
    await act(async () => {
      submitResult = await hook.current.submit('GWALLET', 'policy-1');
    });

    expect(submitResult).toEqual({ error: null });
    expect(hook.current.step).toBe('polling');
    expect(hook.current.claimId).toBe('tx-hash-1');
  });

  it('surfaces a user-facing error and stops at the error step when submission fails', async () => {
    fetchUserClaims.mockResolvedValue([]);
    invokeSubmitClaim.mockRejectedValue(new Error('simulation failed'));

    const hook = renderHook(() => useClaim('policy-1'));
    await flushMicrotasks();

    let submitResult: { error: string | null } | undefined;
    await act(async () => {
      submitResult = await hook.current.submit('GWALLET', 'policy-1');
    });

    expect(hook.current.step).toBe('error');
    expect(hook.current.error).toBe('simulation failed');
    expect(submitResult?.error).toBe('simulation failed');
  });

  it('moves to the timeout step after 20 unresolved polling attempts', async () => {
    fetchUserClaims.mockResolvedValue([makeClaim({ status: 'Processing' })]);
    fetchClaim.mockResolvedValue(makeClaim({ status: 'Processing' }));

    const hook = renderHook(() => useClaim('policy-1'));
    await flushMicrotasks();
    expect(hook.current.step).toBe('polling');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20 * 3000 + 100);
    });

    expect(hook.current.step).toBe('timeout');
  });

  it('reset() during an in-flight submit prevents a late response from resurrecting the claim', async () => {
    fetchUserClaims.mockResolvedValue([]);
    let resolveSubmit!: (txHash: string) => void;
    invokeSubmitClaim.mockImplementation(
      () => new Promise<string>((resolve) => { resolveSubmit = resolve; }),
    );

    const hook = renderHook(() => useClaim('policy-1'));
    await flushMicrotasks();

    let submitPromise!: Promise<{ error: string | null }>;
    act(() => {
      submitPromise = hook.current.submit('GWALLET', 'policy-1');
    });
    expect(hook.current.step).toBe('submitting');

    // User cancels (e.g. navigates away) before the contract call settles.
    act(() => { hook.current.reset(); });
    expect(hook.current.step).toBe('idle');

    // The contract call now resolves late — the cancelledRef guard must stop
    // submit() from reviving polling after reset() already cancelled it.
    await act(async () => {
      resolveSubmit('tx-hash-late');
      await submitPromise;
    });

    expect(hook.current.step).toBe('idle');
    expect(hook.current.claimId).toBeNull();
  });
});

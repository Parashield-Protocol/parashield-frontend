import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useClaim } from '../useClaim';

const mockInvokeSubmitClaim = vi.fn();
const mockRecordClaimSubmission = vi.fn();
const mockFetchClaim = vi.fn();
const mockFetchUserClaims = vi.fn();
const mockShowToast = vi.fn();

vi.mock('@/lib/contract', () => ({
  invokeSubmitClaim: (...args: unknown[]) => mockInvokeSubmitClaim(...args),
}));

vi.mock('@/lib/api', () => ({
  submitClaim: (...args: unknown[]) => mockRecordClaimSubmission(...args),
  fetchClaim: (...args: unknown[]) => mockFetchClaim(...args),
  fetchUserClaims: (...args: unknown[]) => mockFetchUserClaims(...args),
}));

vi.mock('@/hooks/useWallet', () => ({
  useWallet: () => ({ address: 'GTESTADDRESS1234' }),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ show: mockShowToast }),
}));

vi.mock('@/lib/errors', () => ({
  toUserMessage: (err: unknown) => (err instanceof Error ? err.message : 'Unexpected error'),
}));

async function flushPromises() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('useClaim', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUserClaims.mockResolvedValue([]);
  });

  it('starts in idle state', async () => {
    const { result } = renderHook(() => useClaim('policy-1'));
    await flushPromises();
    expect(result.current.step).toBe('idle');
    expect(result.current.claim).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('transitions through submitting → polling → done on success', async () => {
    mockInvokeSubmitClaim.mockResolvedValue('txhash123');
    mockRecordClaimSubmission.mockResolvedValue('claim-id-1');
    mockFetchClaim.mockResolvedValue({
      id: 'claim-id-1',
      status: 'Paid',
      policyId: 'policy-1',
    });

    const { result } = renderHook(() => useClaim('policy-1'));
    await flushPromises();

    await act(async () => {
      await result.current.submit('GTESTADDRESS1234', 'policy-1');
    });

    expect(result.current.step).toBe('polling');
    expect(result.current.claimId).toBe('txhash123');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3100));
    });

    await waitFor(() => {
      expect(result.current.step).toBe('done');
    });
  });

  it('transitions to error when submission fails', async () => {
    mockInvokeSubmitClaim.mockRejectedValue(new Error('Simulation failed'));

    const { result } = renderHook(() => useClaim('policy-1'));
    await flushPromises();

    await act(async () => {
      const res = await result.current.submit('GTESTADDRESS1234', 'policy-1');
      expect(res.error).toBe('Simulation failed');
    });

    expect(result.current.step).toBe('error');
    expect(result.current.error).toBe('Simulation failed');
  });

  it('still surfaces error after a prior reset() call (regression for reset bug)', async () => {
    mockInvokeSubmitClaim.mockResolvedValue('txhash-first');
    mockRecordClaimSubmission.mockResolvedValue('claim-1');
    mockFetchClaim.mockResolvedValue({
      id: 'claim-1',
      status: 'Paid',
      policyId: 'policy-1',
    });

    const { result } = renderHook(() => useClaim('policy-1'));
    await flushPromises();

    await act(async () => {
      await result.current.submit('GTESTADDRESS1234', 'policy-1');
    });

    expect(result.current.step).toBe('polling');

    act(() => {
      result.current.reset();
    });
    expect(result.current.step).toBe('idle');

    mockInvokeSubmitClaim.mockRejectedValue(new Error('Post-reset error'));

    await act(async () => {
      const res = await result.current.submit('GTESTADDRESS1234', 'policy-1');
      expect(res.error).toBe('Post-reset error');
    });

    expect(result.current.step).toBe('error');
    expect(result.current.error).toBe('Post-reset error');
  });

  it('reset() clears all state back to idle', async () => {
    mockInvokeSubmitClaim.mockResolvedValue('txhash123');
    mockRecordClaimSubmission.mockResolvedValue('claim-1');

    const { result } = renderHook(() => useClaim('policy-1'));
    await flushPromises();

    await act(async () => {
      await result.current.submit('GTESTADDRESS1234', 'policy-1');
    });

    expect(result.current.step).toBe('polling');

    act(() => {
      result.current.reset();
    });

    expect(result.current.step).toBe('idle');
    expect(result.current.claimId).toBeNull();
    expect(result.current.claim).toBeNull();
    expect(result.current.error).toBeNull();
  });
  it('reports per-step progress through to completion', async () => {
    let report: (stage: string) => void = () => {};
    let finish: (hash: string) => void = () => {};
    mockInvokeSubmitClaim.mockImplementation(
      (_claimant: string, _policyId: string, onProgress: (stage: string) => void) =>
        new Promise<string>((resolve) => { report = onProgress; finish = resolve; }),
    );
    mockRecordClaimSubmission.mockResolvedValue('claim-1');
    mockFetchClaim.mockResolvedValue({ id: 'claim-1', status: 'Paid', policyId: 'policy-1' });

    const { result } = renderHook(() => useClaim('policy-1'));
    await flushPromises();
    expect(result.current.progress).toBeNull();

    let submitted: Promise<unknown> = Promise.resolve();
    act(() => { submitted = result.current.submit('GTESTADDRESS1234', 'policy-1'); });
    expect(result.current.step).toBe('submitting');
    expect(result.current.progress).toBe('preparing');

    for (const stage of ['signing', 'submitting', 'confirming']) {
      act(() => report(stage));
      expect(result.current.progress).toBe(stage);
    }

    await act(async () => {
      finish('txhash123');
      await submitted;
    });
    expect(result.current.step).toBe('polling');
    expect(result.current.progress).toBe('processing');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3100));
    });

    await waitFor(() => {
      expect(result.current.step).toBe('done');
      expect(result.current.progress).toBe('complete');
    });
  });

  it('clears progress when submission fails', async () => {
    mockInvokeSubmitClaim.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useClaim('policy-1'));
    await flushPromises();

    await act(async () => {
      await result.current.submit('GTESTADDRESS1234', 'policy-1');
    });

    expect(result.current.step).toBe('error');
    expect(result.current.progress).toBeNull();
  });
});

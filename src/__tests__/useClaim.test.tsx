import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { useClaim } from '../hooks/useClaim';
import { invokeSubmitClaim } from '@/lib/contract';

vi.mock('@/hooks/useWallet', () => ({
  useWallet: () => ({ address: 'GADDR' }),
}));

vi.mock('@/lib/api', () => ({
  fetchUserClaims: vi.fn(async () => []),
  fetchClaim:      vi.fn(async () => null),
}));

vi.mock('@/lib/contract', () => ({
  invokeSubmitClaim: vi.fn(),
}));

interface HookResult<T> {
  readonly current: T;
}

function renderHook<T>(useHook: () => T): HookResult<T> {
  let result: T = undefined!;
  const container = document.createElement('div');
  let root: Root;

  function TestComponent() {
    result = useHook();
    return null;
  }

  act(() => {
    root = createRoot(container);
    root.render(<TestComponent />);
  });

  return {
    get current() {
      return result;
    },
  };
}

describe('useClaim retry handling (issue #220)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('surfaces a submit failure after reset() instead of hanging on "Submitting…"', async () => {
    (invokeSubmitClaim as Mock).mockRejectedValue(new Error('chain boom'));

    const hook = renderHook(() => useClaim('policy-1'));
    // Let the on-mount existing-claim effect settle to 'idle'.
    await act(async () => {});

    // First failed submit surfaces an error as expected.
    await act(async () => {
      await hook.current.submit('GADDR', 'policy-1');
    });
    expect(hook.current.step).toBe('error');
    expect(hook.current.error).toBe('chain boom');

    // User clicks "Try again" -> reset() sets cancelledRef = true.
    act(() => {
      hook.current.reset();
    });
    expect(hook.current.step).toBe('idle');
    expect(hook.current.error).toBeNull();

    // The second failure must NOT be swallowed: submit() resets cancelledRef
    // to false at its top, so the error surfaces instead of the UI hanging.
    await act(async () => {
      await hook.current.submit('GADDR', 'policy-1');
    });
    expect(hook.current.step).toBe('error');
    expect(hook.current.error).toBe('chain boom');
  });
});

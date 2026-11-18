import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { ToastProvider, createToastId, useToast } from '../context/ToastContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('ToastContext without crypto.randomUUID (#902)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('still shows toasts when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {});
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.show('Copied');
      result.current.show('Saved');
    });

    expect(result.current.toasts).toHaveLength(2);
    const [first, second] = result.current.toasts;
    expect(first.id).not.toBe(second.id);
  });

  it('falls back to unique ids, and uses randomUUID when present', () => {
    vi.stubGlobal('crypto', {});
    const a = createToastId();
    const b = createToastId();
    expect(a).not.toBe(b);
    expect(a.startsWith('toast-')).toBe(true);

    vi.stubGlobal('crypto', { randomUUID: () => 'uuid-1' });
    expect(createToastId()).toBe('uuid-1');
  });
});

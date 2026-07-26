import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../context/ToastContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('ToastContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('provides show and dismiss functions', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    expect(typeof result.current.show).toBe('function');
    expect(typeof result.current.dismiss).toBe('function');
  });

  it('show adds a toast', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.show('Test message');
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Test message');
    expect(result.current.toasts[0].variant).toBe('info');
  });

  it('show with variant', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.show('Success', 'success');
    });
    expect(result.current.toasts[0].variant).toBe('success');
  });

  it('dismiss removes a toast', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.show('Test');
    });
    const id = result.current.toasts[0].id;
    act(() => {
      result.current.dismiss(id);
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('auto-dismiss after duration', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.show('Auto dismiss', 'info', 1000);
    });
    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('multiple toasts queue correctly', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.show('First');
      result.current.show('Second');
    });
    expect(result.current.toasts).toHaveLength(2);
    expect(result.current.toasts[0].message).toBe('First');
    expect(result.current.toasts[1].message).toBe('Second');
  });

  it('dismiss clears timer', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.show('Test', 'info', 1000);
    });
    const id = result.current.toasts[0].id;
    act(() => {
      result.current.dismiss(id);
    });
    // Advance time, should not throw
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.toasts).toHaveLength(0);
  });
});
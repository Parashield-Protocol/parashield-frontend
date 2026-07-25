import { act } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { renderHook, flushMicrotasks } from './renderHook';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    const hook = renderHook(() => useDebounce('initial', 500));
    expect(hook.current).toBe('initial');
  });

  it('does not update the debounced value until the delay elapses', async () => {
    let value = 'first';
    const hook = renderHook(() => useDebounce(value, 500));
    expect(hook.current).toBe('first');

    value = 'second';
    hook.rerender();
    expect(hook.current).toBe('first');

    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(hook.current).toBe('first');

    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(hook.current).toBe('second');
  });

  it('collapses rapid successive updates within the delay window to the final value', async () => {
    let value = 'a';
    const hook = renderHook(() => useDebounce(value, 500));

    value = 'b';
    hook.rerender();

    value = 'c';
    hook.rerender();

    value = 'd';
    hook.rerender();

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(hook.current).toBe('d');
  });

  it('restarts the delay when the value changes within the delay window', async () => {
    let value = 'first';
    const hook = renderHook(() => useDebounce(value, 500));

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(hook.current).toBe('first');

    value = 'second';
    hook.rerender();

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(hook.current).toBe('first');

    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(hook.current).toBe('second');
  });

  it('works with different types of values', async () => {
    let value: number | null = 42;
    const hook = renderHook(() => useDebounce(value, 500));
    expect(hook.current).toBe(42);

    value = null;
    hook.rerender();
    expect(hook.current).toBe(42);

    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(hook.current).toBeNull();
  });
});

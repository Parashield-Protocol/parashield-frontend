import { act } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { renderHook } from './renderHook';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the initial value immediately', () => {
    const hook = renderHook(() => useDebounce('first', 300));
    expect(hook.current).toBe('first');
  });

  it('does not update before the delay has elapsed', () => {
    let value = 'first';
    const hook = renderHook(() => useDebounce(value, 300));

    value = 'second';
    hook.rerender();
    act(() => { vi.advanceTimersByTime(299); });

    expect(hook.current).toBe('first');
  });

  it('updates to the latest value once the delay elapses', () => {
    let value = 'first';
    const hook = renderHook(() => useDebounce(value, 300));

    value = 'second';
    hook.rerender();
    act(() => { vi.advanceTimersByTime(300); });

    expect(hook.current).toBe('second');
  });

  it('resets the timer on rapid successive changes, keeping only the final value', () => {
    let value = 'first';
    const hook = renderHook(() => useDebounce(value, 300));

    value = 'second';
    hook.rerender();
    act(() => { vi.advanceTimersByTime(200); });

    value = 'third';
    hook.rerender();
    act(() => { vi.advanceTimersByTime(200); });
    expect(hook.current).toBe('first');

    act(() => { vi.advanceTimersByTime(100); });
    expect(hook.current).toBe('third');
  });
});

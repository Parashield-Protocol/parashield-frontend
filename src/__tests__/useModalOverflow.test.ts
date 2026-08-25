import { useModalOverflow, resetModalOverflow } from '../hooks/useModalOverflow';
import { renderHook } from './renderHook';

describe('useModalOverflow', () => {
  afterEach(() => {
    resetModalOverflow();
  });

  it('hides body overflow on lock and restores it on unlock', () => {
    const hook = renderHook(() => useModalOverflow());

    hook.current.lock();
    expect(document.body.style.overflow).toBe('hidden');

    hook.current.unlock();
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps overflow hidden while any of several locks is still held', () => {
    const first = renderHook(() => useModalOverflow());
    const second = renderHook(() => useModalOverflow());

    first.current.lock();
    second.current.lock();
    expect(document.body.style.overflow).toBe('hidden');

    first.current.unlock();
    expect(document.body.style.overflow).toBe('hidden');

    second.current.unlock();
    expect(document.body.style.overflow).toBe('');
  });

  it('is a no-op to unlock a hook instance that never locked', () => {
    const hook = renderHook(() => useModalOverflow());
    hook.current.unlock();
    expect(document.body.style.overflow).toBe('');
  });

  it('resetModalOverflow recovers from an unbalanced lock (#452)', () => {
    const hook = renderHook(() => useModalOverflow());
    hook.current.lock();
    expect(document.body.style.overflow).toBe('hidden');

    // Simulate a lock that never got its matching unlock() call.
    resetModalOverflow();

    expect(document.body.style.overflow).toBe('');
  });
});

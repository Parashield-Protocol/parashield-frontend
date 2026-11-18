import { useLoadedOnce } from '../hooks/useExpiryWarnings';
import { renderHook } from './renderHook';

describe('useLoadedOnce (#935)', () => {
  it('stays false until the first load for the wallet finishes', () => {
    let loaded = false;
    const hook = renderHook(() => useLoadedOnce(loaded, 'GWALLET'));
    expect(hook.current).toBe(false);

    loaded = true;
    hook.rerender();
    expect(hook.current).toBe(true);
  });

  it('stays true through a background refresh instead of flipping off and on', () => {
    let loaded = true;
    const hook = renderHook(() => useLoadedOnce(loaded, 'GWALLET'));
    expect(hook.current).toBe(true);

    loaded = false; // refetch in flight
    hook.rerender();
    expect(hook.current).toBe(true);

    loaded = true;
    hook.rerender();
    expect(hook.current).toBe(true);
  });

  it('resets when the wallet changes, until that wallet has loaded', () => {
    let loaded = true;
    let address: string | null = 'GWALLET_A';
    const hook = renderHook(() => useLoadedOnce(loaded, address));
    expect(hook.current).toBe(true);

    address = 'GWALLET_B';
    loaded = false;
    hook.rerender();
    expect(hook.current).toBe(false);

    loaded = true;
    hook.rerender();
    expect(hook.current).toBe(true);
  });

  it('is false with no wallet', () => {
    const hook = renderHook(() => useLoadedOnce(true, null));
    expect(hook.current).toBe(false);
  });
});

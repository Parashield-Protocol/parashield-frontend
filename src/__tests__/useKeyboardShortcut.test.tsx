import { act } from 'react';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { renderHook } from './renderHook';

function pressKey(key: string, modifiers: Partial<KeyboardEventInit> = {}) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...modifiers }));
  });
}

describe('useKeyboardShortcut', () => {
  it('invokes the handler when the matching key is pressed', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut('k', handler));

    pressKey('k');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores keys that do not match', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut('k', handler));

    pressKey('j');

    expect(handler).not.toHaveBeenCalled();
  });

  it('is case-insensitive', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut('k', handler));

    pressKey('K');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('requires configured modifiers to be held', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut('k', handler, { ctrl: true }));

    pressKey('k');
    expect(handler).not.toHaveBeenCalled();

    pressKey('k', { ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls the latest handler after a re-render without double-registering the listener', () => {
    const firstHandler  = vi.fn();
    const secondHandler = vi.fn();
    let handler = firstHandler;

    const hook = renderHook(() => useKeyboardShortcut('k', handler));

    handler = secondHandler;
    hook.rerender();

    pressKey('k');

    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalledTimes(1);
  });

  it('removes the listener on unmount', () => {
    const handler = vi.fn();
    const hook = renderHook(() => useKeyboardShortcut('k', handler));

    hook.unmount();
    pressKey('k');

    expect(handler).not.toHaveBeenCalled();
  });
});

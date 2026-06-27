import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useLocalStorage } from '../hooks/useLocalStorage';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:    (key: string) => store[key] ?? null,
    setItem:    (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear:      () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

interface HookResult<T> {
  get current(): T;
  rerender(): void;
}

function renderHook<T>(useHook: () => T): HookResult<T> {
  let result: T = undefined!;
  let root: Root;

  const container = document.createElement('div');

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
    rerender() {
      act(() => {
        root.render(<TestComponent />);
      });
    },
  };
}

describe('useLocalStorage', () => {
  beforeEach(() => localStorageMock.clear());

  describe('remove', () => {
    it('resets state to the initial value when called', () => {
      const hook = renderHook(() =>
        useLocalStorage<string>('test_key', 'default')
      );

      act(() => {
        const [, setValue] = hook.current;
        setValue('modified');
      });
      expect(hook.current[0]).toBe('modified');

      act(() => {
        const [, , remove] = hook.current;
        remove();
      });
      expect(hook.current[0]).toBe('default');
    });

    it('removes the key from localStorage', () => {
      const hook = renderHook(() =>
        useLocalStorage<string>('remove_key', 'fallback')
      );

      act(() => {
        const [, setValue] = hook.current;
        setValue('stored');
      });
      expect(localStorageMock.getItem('remove_key')).toBe('"stored"');

      act(() => {
        const [, , remove] = hook.current;
        remove();
      });
      expect(localStorageMock.getItem('remove_key')).toBeNull();
    });

    it('is referentially stable across re-renders when initialValue is an object', () => {
      const hook = renderHook(() =>
        useLocalStorage<{ theme: string }>('obj_key', { theme: 'dark' })
      );

      const firstRemove = hook.current[2];
      hook.rerender();
      const secondRemove = hook.current[2];
      hook.rerender();
      const thirdRemove = hook.current[2];

      expect(secondRemove).toBe(firstRemove);
      expect(thirdRemove).toBe(firstRemove);
    });

    it('resets to the first-mount initial value even when caller passes a new object reference', () => {
      let value = { mode: 'light' };
      const hook = renderHook(() =>
        useLocalStorage<{ mode: string }>('rerender_key', value)
      );

      act(() => {
        const [, setValue] = hook.current;
        setValue({ mode: 'dark' });
      });

      value = { mode: 'changed' };
      hook.rerender();

      act(() => {
        const [, , remove] = hook.current;
        remove();
      });

      expect(hook.current[0]).toEqual({ mode: 'light' });
    });
  });
});

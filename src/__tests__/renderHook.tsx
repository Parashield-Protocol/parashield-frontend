import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

export interface HookHandle<T> {
  get current(): T;
  rerender(): void;
  unmount(): void;
}

export function renderHook<T>(useHook: () => T): HookHandle<T> {
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
    unmount() {
      act(() => {
        root.unmount();
      });
    },
  };
}

export function flushMicrotasks(): Promise<void> {
  return act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

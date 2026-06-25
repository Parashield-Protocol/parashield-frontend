'use client';

import { useEffect, useRef } from 'react';

type Key = string;
type Modifiers = { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean };

export function useKeyboardShortcut(
  key: Key,
  handler: () => void,
  modifiers: Modifiers = {},
) {
  const handlerRef = useRef(handler);
  useEffect(() => { handlerRef.current = handler; });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      if (modifiers.ctrl  && !e.ctrlKey)  return;
      if (modifiers.shift && !e.shiftKey) return;
      if (modifiers.alt   && !e.altKey)   return;
      if (modifiers.meta  && !e.metaKey)  return;
      e.preventDefault();
      handlerRef.current();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, modifiers]);
}

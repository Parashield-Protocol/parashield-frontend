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

  // Depend on the individual modifier flags rather than the `modifiers`
  // object itself: callers that omit modifiers rely on the `= {}` default,
  // which is a new object reference every render, so depending on the
  // object would tear down and re-register the listener every render cycle.
  const ctrl = modifiers.ctrl;
  const shift = modifiers.shift;
  const alt = modifiers.alt;
  const meta = modifiers.meta;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      if (ctrl  && !e.ctrlKey)  return;
      if (shift && !e.shiftKey) return;
      if (alt   && !e.altKey)   return;
      if (meta  && !e.metaKey)  return;
      e.preventDefault();
      e.stopPropagation();
      handlerRef.current();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, ctrl, shift, alt, meta]);
}

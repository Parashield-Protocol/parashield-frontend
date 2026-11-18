'use client';

import { useEffect, useRef } from 'react';

type Key = string;
type Modifiers = { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean };

interface KeyboardShortcutOptions extends Modifiers {
  /**
   * Return false to skip the handler for this event. When omitted, the hook
   * automatically skips events whose target is an editable element (input,
   * textarea, select, or contentEditable) so normal typing is never blocked.
   */
  shouldHandle?: (e: KeyboardEvent) => boolean;
}

function isEditableTarget(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function useKeyboardShortcut(
  key: Key,
  handler: () => void,
  options: KeyboardShortcutOptions = {},
) {
  const handlerRef = useRef(handler);
  useEffect(() => { handlerRef.current = handler; });

  // Depend on the individual modifier flags rather than the `options` object
  // itself: callers that omit options rely on the `= {}` default, which is a
  // new object reference every render, so depending on the object would tear
  // down and re-register the listener every render cycle.
  const ctrl  = options.ctrl;
  const shift = options.shift;
  const alt   = options.alt;
  const meta  = options.meta;
  const shouldHandleRef = useRef(options.shouldHandle);
  useEffect(() => { shouldHandleRef.current = options.shouldHandle; });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      if (ctrl  && !e.ctrlKey)  return;
      if (shift && !e.shiftKey) return;
      if (alt   && !e.altKey)   return;
      if (meta  && !e.metaKey)  return;

      const customFilter = shouldHandleRef.current;
      if (customFilter ? !customFilter(e) : isEditableTarget(e)) return;

      e.preventDefault();
      e.stopPropagation();
      handlerRef.current();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, ctrl, shift, alt, meta]);
}

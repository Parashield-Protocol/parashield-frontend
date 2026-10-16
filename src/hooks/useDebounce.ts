'use client';

import { useState, useEffect, useRef } from 'react';

interface UseDebounceOptions {
  /**
   * When true, the first call in a burst fires immediately (leading edge).
   * Subsequent calls within the delay window are debounced as usual.
   * Defaults to false (trailing-edge only).
   */
  leading?: boolean;
}

/**
 * Debounce a value. By default only the trailing edge fires — `value`
 * updates after `delayMs` of quiet. Pass `leading: true` to fire the first
 * change immediately and debounce subsequent ones.
 *
 * @param value    The value to debounce.
 * @param delayMs  Debounce delay in milliseconds.
 * @param options  Optional `{ leading: boolean }`.
 */
export function useDebounce<T>(
  value: T,
  delayMs: number,
  options?: UseDebounceOptions,
): T {
  const leading = options?.leading ?? false;
  const [debounced, setDebounced] = useState(value);
  const isFirstChange = useRef(true);
  const previousValue = useRef(value);

  useEffect(() => {
    // Skip the initial mount — the value is already correct.
    if (isFirstChange.current) {
      isFirstChange.current = false;
      previousValue.current = value;
      return;
    }

    const valueChanged = value !== previousValue.current;
    previousValue.current = value;

    // Leading edge: fire immediately on the first change after a quiet period.
    if (leading && valueChanged) {
      setDebounced(value);
    }

    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs, leading]);

  return debounced;
}

'use client';

import { useCallback, useRef } from 'react';

// A Set of active lock tokens rather than a bare counter (#452): body scroll
// should be locked whenever this set is non-empty, derived directly from
// which locks are actually outstanding rather than an increment/decrement
// count that could in principle drift out of sync (e.g. an unlock() call
// lost or duplicated) and leave the page permanently non-scrollable with no
// recovery short of a refresh.
const activeLocks = new Set<symbol>();
let originalOverflow = '';

export function useModalOverflow() {
  const tokenRef = useRef<symbol | null>(null);

  const lock = useCallback(() => {
    if (tokenRef.current !== null) return;
    const token = Symbol('modal-lock');
    tokenRef.current = token;

    if (activeLocks.size === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    activeLocks.add(token);
  }, []);

  const unlock = useCallback(() => {
    const token = tokenRef.current;
    if (token === null) return;
    tokenRef.current = null;

    activeLocks.delete(token);
    if (activeLocks.size === 0) {
      document.body.style.overflow = originalOverflow;
    }
  }, []);

  return { lock, unlock };
}

/**
 * Recovery escape hatch (#452): forcibly clears every outstanding lock and
 * restores body scroll. Not needed in the normal flow -- `Modal` already
 * pairs `lock()`/`unlock()` with a `useEffect` cleanup that React runs on
 * unmount -- but available for callers (e.g. a top-level error boundary) to
 * recover from a suspected desync without requiring a full page refresh.
 */
export function resetModalOverflow() {
  activeLocks.clear();
  document.body.style.overflow = originalOverflow;
}

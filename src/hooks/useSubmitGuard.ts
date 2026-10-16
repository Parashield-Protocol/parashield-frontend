'use client';

import { useCallback, useRef, useState } from 'react';

/** Clicks closer together than this after an accepted one are dropped. */
export const SUBMIT_COOLDOWN_MS = 500;

/**
 * Guard a submit handler against duplicate invocations.
 *
 * - While a guarded call is in flight, further calls are ignored. The lock is
 *   a ref, so it holds even for a second click dispatched before React has
 *   re-rendered the button as disabled.
 * - Leading-edge debounce: a call within `cooldownMs` of the last accepted
 *   one is ignored too. This catches the double-click on a multi-step flow
 *   where the first click only advances a step (resolving instantly) and the
 *   second would otherwise land on the next step's "Sign & Confirm".
 *
 * `pending` mirrors the lock for rendering (disable + spinner).
 */
export function useSubmitGuard(cooldownMs: number = SUBMIT_COOLDOWN_MS) {
  const inFlightRef = useRef(false);
  const lastAcceptedRef = useRef(-Infinity);
  const [pending, setPending] = useState(false);

  const guard = useCallback(
    <A extends unknown[]>(fn: (...args: A) => Promise<void> | void) =>
      async (...args: A): Promise<void> => {
        const now = Date.now();
        if (inFlightRef.current || now - lastAcceptedRef.current < cooldownMs) return;
        inFlightRef.current = true;
        lastAcceptedRef.current = now;
        setPending(true);
        try {
          await fn(...args);
        } finally {
          inFlightRef.current = false;
          setPending(false);
        }
      },
    [cooldownMs],
  );

  return { guard, pending };
}

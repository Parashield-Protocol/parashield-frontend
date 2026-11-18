import type { ClipboardEvent, KeyboardEvent, TouchEvent, WheelEvent } from 'react';

/**
 * Plain non-negative decimal: digits with an optional fractional part. No
 * sign, no exponent — the backend and `displayToStroops` only accept this
 * shape, so "1e10" must never reach them (#473, #782).
 */
export const PLAIN_DECIMAL_RE = /^\d+(\.\d+)?$/;

export function isPlainDecimal(value: string): boolean {
  return PLAIN_DECIMAL_RE.test(value.trim());
}

// `type="number"` lets the browser accept these as part of a valid number
// (exponent and sign), none of which make sense for an amount.
const BLOCKED_KEYS = new Set(['e', 'E', '+', '-']);

function blockNonDecimalKeys(e: KeyboardEvent<HTMLInputElement>) {
  if (BLOCKED_KEYS.has(e.key)) e.preventDefault();
}

function blockNonDecimalPaste(e: ClipboardEvent<HTMLInputElement>) {
  const text = e.clipboardData.getData('text');
  if (text && !isPlainDecimal(text)) e.preventDefault();
}

/**
 * Spread onto amount/currency `<input type="number">`s to stop scientific
 * notation and signs being typed or pasted. This only improves typing; always
 * re-check with `isPlainDecimal` on submit as well.
 */
export const amountInputGuards = {
  onKeyDown: blockNonDecimalKeys,
  onPaste: blockNonDecimalPaste,
} as const;

// iOS Safari treats a scroll or swipe gesture over `type="number"` as a
// stepper nudge, silently changing the value mid-scroll (#811).
function blockScrollValueChange(e: WheelEvent<HTMLInputElement>) {
  e.currentTarget.blur();
}

interface TouchGuardSnapshot {
  value: string;
  x: number;
  y: number;
}

function snapshotTouchGesture(e: TouchEvent<HTMLInputElement>) {
  const t = e.touches[0];
  const snap: TouchGuardSnapshot = {
    value: e.currentTarget.value,
    x: t?.clientX ?? 0,
    y: t?.clientY ?? 0,
  };
  e.currentTarget.dataset.touchGuard = JSON.stringify(snap);
}

function restoreTouchGesture(e: TouchEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  const raw = el.dataset.touchGuard;
  delete el.dataset.touchGuard;
  if (!raw) return;
  const snap = JSON.parse(raw) as TouchGuardSnapshot;
  const t = e.changedTouches[0];
  const moved = t
    ? Math.abs(t.clientX - snap.x) > 10 || Math.abs(t.clientY - snap.y) > 10
    : true;
  // A swipe across the field mutates the value without typing; a stationary
  // tap (e.g. the stepper arrows) is intentional and must be kept.
  if (moved && el.value !== snap.value) {
    el.value = snap.value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

/**
 * Spread onto numeric inputs so scroll/swipe gestures can never change the
 * value (#811).
 */
export const numberScrollGuards = {
  onWheel: blockScrollValueChange,
  onTouchStart: snapshotTouchGesture,
  onTouchEnd: restoreTouchGesture,
  onTouchCancel: restoreTouchGesture,
} as const;

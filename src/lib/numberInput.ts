import type { ClipboardEvent, KeyboardEvent } from 'react';

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

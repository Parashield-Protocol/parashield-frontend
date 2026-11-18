import { STROOPS_PER_UNIT } from './constants';

export function safeBigInt(value: string | bigint | null | undefined): bigint {
  if (value === null || value === undefined) return 0n;
  if (typeof value === 'bigint') return value;
  const trimmed = value.trim();
  if (trimmed === '' || !/^-?\d+$/.test(trimmed)) return 0n;
  return BigInt(trimmed);
}

/**
 * Truncates (never rounds) to `decimals` places, deliberately (#451): several
 * callers (e.g. `estimatePremium`) need this to match the Soroban contract's
 * own integer division exactly, and rounding up would display an amount the
 * chain would never actually charge/return. If you need a rounded display
 * value for a specific call site, round at that call site instead of
 * changing this shared truncation behavior.
 */
export function stroopsToDisplay(stroops: string | bigint | null | undefined, decimals = 2): string {
  if (stroops === null || stroops === undefined) return '—';
  if (typeof stroops === 'string') {
    const trimmed = stroops.trim();
    if (trimmed === '' || !/^-?\d+$/.test(trimmed)) return '—';
  }
  const n = BigInt(stroops as string | bigint);
  const negative = n < 0n;
  const abs = negative ? -n : n;
  const whole = abs / STROOPS_PER_UNIT;
  const frac = abs % STROOPS_PER_UNIT;
  const fracStr = frac.toString().padStart(7, '0').slice(0, decimals);
  return `${negative ? '-' : ''}${whole.toLocaleString()}.${fracStr}`;
}

export function displayToStroops(display: string): bigint {
  const cleaned = display.replace(/,/g, '').trim();
  if (cleaned === '' || !/^-?\d+(\.\d+)?$/.test(cleaned)) {
    throw new TypeError(`displayToStroops: invalid input "${display}"`);
  }
  if (cleaned.startsWith('-')) {
    throw new TypeError(`displayToStroops: negative values are not allowed, got "${display}"`);
  }
  const [whole = '0', frac = ''] = cleaned.split('.');
  const fracPadded = frac.padEnd(7, '0').slice(0, 7);
  return BigInt(whole) * STROOPS_PER_UNIT + BigInt(fracPadded || '0');
}

export function formatUSDC(stroops: string | bigint, showSymbol = true): string {
  const value = stroopsToDisplay(stroops, 2);
  return showSymbol ? `${value} USDC` : value;
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 3) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

export function formatDate(epochSeconds: number | null | undefined): string {
  if (epochSeconds == null) return '—';
  return new Date(epochSeconds * 1000).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats an epoch-seconds timestamp in the viewer's local timezone.
 * Pass `{ withTimeZone: true }` to append the zone abbreviation (e.g. "BST",
 * "GMT+1") so users can't mistake local time for UTC (#497).
 */
export function formatDateTime(
  epochSeconds: number | null | undefined,
  { withTimeZone = false }: { withTimeZone?: boolean } = {},
): string {
  if (epochSeconds == null) return '—';
  return new Date(epochSeconds * 1000).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(withTimeZone && { timeZoneName: 'short' }),
  });
}

/** Full UTC representation of an epoch-seconds timestamp, for tooltips. */
export function formatUtcDateTime(epochSeconds: number | null | undefined): string {
  if (epochSeconds == null) return '—';
  return new Date(epochSeconds * 1000).toUTCString();
}

/*
 * Timezone handling (#778)
 *
 * - Instants (policy start/end, oracle readings, claim timestamps) are epoch
 *   seconds, i.e. UTC. Store and compare them as-is; render them with
 *   `formatDate` / `formatDateTime`, which use the viewer's local timezone.
 * - Calendar dates from `<input type="date">` are "YYYY-MM-DD" strings with no
 *   timezone. Never derive one with `toISOString()` (that is the *UTC* day, so
 *   for anyone ahead of UTC it is yesterday until mid-morning) and never parse
 *   one with `new Date(value)` and read it back with local getters. Use
 *   `toDateInputValue` to get the viewer's local day, and `dateInputToEpoch`
 *   to normalise a picked date to UTC midnight for storage/comparison.
 */

/** The calendar day of `date` in the viewer's local timezone, as "YYYY-MM-DD". */
export function toDateInputValue(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Normalises a "YYYY-MM-DD" date-input value to epoch seconds at UTC
 * midnight, so the same picked day stores identically in every timezone.
 * Returns null for anything that isn't a real calendar date.
 */
export function dateInputToEpoch(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const ms = Date.UTC(y, m - 1, d);
  const check = new Date(ms);
  // Reject rollovers like 2026-02-31 → 2026-03-03.
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    return null;
  }
  return ms / 1000;
}

export function basisPointsToPercent(bps: number, decimals = 2): string {
  return `${(bps / 100).toFixed(decimals)}%`;
}

// Formats a fixed-point (1e7) BigInt as a decimal string entirely in
// BigInt/string space — converting through Number loses precision once
// `whole` exceeds Number.MAX_SAFE_INTEGER (issue #201).
function fixedPointToFixed(raw: bigint, decimals: number): string {
  const negative = raw < 0n;
  const abs = negative ? -raw : raw;
  const whole = abs / 10_000_000n;
  const frac = abs % 10_000_000n;
  const fracStr = frac.toString().padStart(7, '0').slice(0, decimals);
  return `${negative ? '-' : ''}${whole}.${fracStr}`;
}

export function formatOracleValue(value: string | null | undefined, dataType: string): string {
  if (value == null) return '—';
  const raw = BigInt(value);
  switch (dataType) {
    case 'weather':
    case 'rainfall':
      return `${fixedPointToFixed(raw, 2)} mm`;
    case 'temperature':
      return `${fixedPointToFixed(raw, 2)} °C`;
    case 'flight':
      return `${fixedPointToFixed(raw, 0)} min delay`;
    case 'defi': {
      const fixed = fixedPointToFixed(raw, 0);
      if (fixed === '1') return 'Exploit detected';
      if (fixed === '0') return 'No exploit';
      return `Unknown (${fixed})`;
    }
    case 'unknown':
      return fixedPointToFixed(raw, 4);
    default:
      return fixedPointToFixed(raw, 4);
  }
}

export function timeLeft(endEpochSeconds: number): string {
  const diff = endEpochSeconds - Math.floor(Date.now() / 1000);
  if (diff > 0) {
    if (diff < 3600) return `${Math.floor(diff / 60)}m left`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h left`;
    return `${Math.floor(diff / 86400)}d left`;
  }
  const elapsed = -diff;
  if (elapsed < 3600) return `Expired ${Math.floor(elapsed / 60)}m ago`;
  if (elapsed < 86400) return `Expired ${Math.floor(elapsed / 3600)}h ago`;
  if (elapsed < 2592000) return `Expired ${Math.floor(elapsed / 86400)}d ago`;
  return `Expired ${formatDate(endEpochSeconds)}`;
}

export function getUtilizationColorName(rate: number): 'teal' | 'amber' | 'red' {
  if (rate < 0.5) return 'teal';
  if (rate < 0.8) return 'amber';
  return 'red';
}

export function utilizationColor(rate: number): string {
  const colorName = getUtilizationColorName(rate);
  const colorMap: Record<'teal' | 'amber' | 'red', string> = {
    teal: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  };
  return colorMap[colorName];
}

export function estimatePremium(coverageDisplay: string, premiumRateBps: number): string {
  const coverageStroops = displayToStroops(coverageDisplay || '0');
  const premiumStroops = (coverageStroops * BigInt(premiumRateBps)) / 10_000n;
  return stroopsToDisplay(premiumStroops, 2);
}

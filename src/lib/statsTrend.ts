import type { Policy } from '@/types';

/** Length of the comparison window for dashboard trend indicators (#688). */
export const TREND_PERIOD_SECONDS = 30 * 24 * 60 * 60;

export type Trend = 'up' | 'down' | 'neutral';

export interface PolicyStats {
  active:   number;
  total:    number;
  coverage: bigint;
  premiums: bigint;
}

/** Whether `p` was active at unix time `at`: started, not yet ended, not cancelled. */
function activeAt(p: Policy, at: number): boolean {
  if (p.startTime > at || p.endTime <= at) return false;
  return p.cancelledAt === undefined || p.cancelledAt > at;
}

function toBigInt(value: string): bigint {
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

/**
 * The dashboard's headline stats as they stood at unix time `at`, rebuilt from
 * each policy's start/end/cancel times. There is no stats history API, so this
 * is how the previous period is derived client-side (#688).
 */
export function policyStatsAt(policies: Policy[], at: number): PolicyStats {
  const existing = policies.filter((p) => p.startTime <= at);
  const active = existing.filter((p) => activeAt(p, at));
  return {
    active:   active.length,
    total:    existing.length,
    coverage: active.reduce((sum, p) => sum + toBigInt(p.coverage), 0n),
    premiums: active.reduce((sum, p) => sum + toBigInt(p.premiumPaid), 0n),
  };
}

/** Direction and signed percentage change from `previous` to `current`. */
export function computeTrend(
  current: number | bigint,
  previous: number | bigint,
): { trend: Trend; trendValue: string } {
  const cur = Number(current);
  const prev = Number(previous);
  if (cur === prev) return { trend: 'neutral', trendValue: '0%' };
  const trend: Trend = cur > prev ? 'up' : 'down';
  if (prev === 0) return { trend, trendValue: 'New' };
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  const rounded = Math.abs(pct) >= 10 ? pct.toFixed(0) : pct.toFixed(1);
  return { trend, trendValue: `${pct > 0 ? '+' : ''}${rounded}%` };
}

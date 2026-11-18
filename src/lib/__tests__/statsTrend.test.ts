import { describe, expect, it } from 'vitest';
import type { Policy } from '@/types';
import { computeTrend, policyStatsAt } from '../statsTrend';

const policy = (overrides: Partial<Policy>): Policy =>
  ({
    id: 'p',
    productId: 'prod',
    policyholder: 'G',
    coverage: '1000',
    premiumPaid: '10',
    oracleKey: 'k',
    startTime: 0,
    endTime: 1_000,
    status: 'Active',
    ...overrides,
  }) as Policy;

describe('computeTrend (#688)', () => {
  it('reports up/down with a signed percentage', () => {
    expect(computeTrend(150, 100)).toEqual({ trend: 'up', trendValue: '+50%' });
    expect(computeTrend(95n, 100n)).toEqual({ trend: 'down', trendValue: '-5.0%' });
  });

  it('is neutral when unchanged and "New" when growing from zero', () => {
    expect(computeTrend(3, 3)).toEqual({ trend: 'neutral', trendValue: '0%' });
    expect(computeTrend(2, 0)).toEqual({ trend: 'up', trendValue: 'New' });
  });
});

describe('policyStatsAt (#688)', () => {
  const policies = [
    policy({ id: 'a', startTime: 0, endTime: 1_000 }),
    policy({ id: 'b', startTime: 600, endTime: 2_000, coverage: '500' }),
    policy({ id: 'c', startTime: 100, endTime: 2_000, cancelledAt: 400 }),
  ];

  it('rebuilds counts and totals at a past time', () => {
    expect(policyStatsAt(policies, 500)).toEqual({
      active: 1,
      total: 2,
      coverage: 1000n,
      premiums: 10n,
    });
  });

  it('counts a policy that started later only from its start time', () => {
    expect(policyStatsAt(policies, 700)).toMatchObject({ active: 2, total: 3, coverage: 1500n });
  });
});

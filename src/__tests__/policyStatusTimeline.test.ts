import { getPolicyTimelineEvents, getPolicyLastUpdated } from '../components/PolicyStatusTimeline';
import type { Policy } from '../types';

function makePolicy(status: Policy['status']): Policy {
  return {
    id: 'policy-1',
    productId: 'product-1',
    policyholder: 'GABCDEF1234567890',
    coverage: '10000000',
    premiumPaid: '500000',
    oracleKey: 'weather:lagos',
    startTime: 1_720_000_000,
    endTime: 1_720_086_400,
    status,
  };
}

describe('getPolicyTimelineEvents', () => {
  it('keeps oracle monitoring complete after a policy is claimed', () => {
    const events = getPolicyTimelineEvents(makePolicy('Claimed'));
    expect(events.find((event) => event.label === 'Oracle monitoring')?.done).toBe(true);
  });

  it('keeps oracle monitoring complete after a policy expires', () => {
    const events = getPolicyTimelineEvents(makePolicy('Expired'));
    expect(events.find((event) => event.label === 'Oracle monitoring')?.done).toBe(true);
  });
});

describe('getPolicyLastUpdated (#591)', () => {
  it('prefers the backend updatedAt when present', () => {
    expect(getPolicyLastUpdated({ ...makePolicy('Claimed'), updatedAt: 1_725_000_000 })).toBe(1_725_000_000);
  });

  it('falls back to the transition that produced the current status', () => {
    const active = makePolicy('Active');
    const expired = makePolicy('Expired');
    expect(getPolicyLastUpdated(active)).toBe(active.startTime);
    expect(getPolicyLastUpdated(expired)).toBe(expired.endTime);
    expect(getPolicyLastUpdated({ ...makePolicy('Cancelled'), cancelledAt: 1_721_000_000 })).toBe(1_721_000_000);
  });

  it('returns null when the last change time is unknown', () => {
    expect(getPolicyLastUpdated(makePolicy('Claimed'))).toBeNull();
    expect(getPolicyLastUpdated(makePolicy('Cancelled'))).toBeNull();
  });
});

import { getPolicyTimelineEvents } from '../components/PolicyStatusTimeline';
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

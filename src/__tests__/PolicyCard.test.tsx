import { renderToStaticMarkup } from 'react-dom/server';
import { PolicyCard } from '../components/PolicyCard';
import type { Policy } from '../types';

function makePolicy(overrides: Partial<Policy> = {}): Policy {
  return {
    id: 'policy-1',
    productId: 'product-1',
    policyholder: 'GABCDEF1234567890',
    coverage: '10000000',
    premiumPaid: '500000',
    oracleKey: 'weather:lagos',
    startTime: 1_720_000_000,
    endTime: 1_720_086_400,
    status: 'Cancelled',
    ...overrides,
  };
}

describe('PolicyCard', () => {
  it('shows a cancelled label when a cancelled policy has no cancelled timestamp', () => {
    const html = renderToStaticMarkup(<PolicyCard policy={makePolicy()} />);

    expect(html).toContain('Cancelled');
    expect(html).not.toContain('Expired');
  });
});

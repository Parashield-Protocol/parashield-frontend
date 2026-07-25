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

  it('shows Expires label for Active policies', () => {
    const html = renderToStaticMarkup(
      <PolicyCard policy={makePolicy({ status: 'Active' })} />
    );
    expect(html).toContain('Expires');
    expect(html).not.toContain('Cancelled');
    expect(html).not.toContain('Claimed');
  });

  it('shows Expired label for Expired policies', () => {
    const html = renderToStaticMarkup(
      <PolicyCard policy={makePolicy({ status: 'Expired' })} />
    );
    expect(html).toContain('Expired');
    expect(html).not.toContain('Expires');
    expect(html).not.toContain('Cancelled');
    expect(html).not.toContain('Claimed');
  });

  it('shows Claimed label for Claimed policies', () => {
    const html = renderToStaticMarkup(
      <PolicyCard policy={makePolicy({ status: 'Claimed' })} />
    );
    expect(html).toContain('Claimed');
    expect(html).not.toContain('Expires');
    expect(html).not.toContain('Cancelled');
    expect(html).not.toContain('Expired');
  });

  it('shows Cancelled label for Cancelled policies', () => {
    const html = renderToStaticMarkup(
      <PolicyCard policy={makePolicy({ status: 'Cancelled' })} />
    );
    expect(html).toContain('Cancelled');
    expect(html).not.toContain('Expires');
    expect(html).not.toContain('Expired');
    expect(html).not.toContain('Claimed');
  });

  it('shows Cancelled label when a cancelled policy has no cancelled timestamp', () => {
    const html = renderToStaticMarkup(
      <PolicyCard policy={makePolicy({ status: 'Cancelled', cancelledAt: undefined })} />
    );
    expect(html).toContain('Cancelled');
    expect(html).not.toContain('Expired');
  });

  it('displays coverage and premium paid amounts', () => {
    const html = renderToStaticMarkup(
      <PolicyCard policy={makePolicy({ coverage: '10000000', premiumPaid: '500000' })} />
    );
    expect(html).toContain('Coverage');
    expect(html).toContain('Premium paid');
    expect(html).toContain('1.00');
    expect(html).toContain('0.05');
  });

  it('displays start date', () => {
    const html = renderToStaticMarkup(
      <PolicyCard policy={makePolicy({ startTime: 1_720_000_000 })} />
    );
    expect(html).toContain('Start date');
  });

  it('renders view details link', () => {
    const html = renderToStaticMarkup(
      <PolicyCard policy={makePolicy({ id: 'policy-abc' })} />
    );
    expect(html).toContain('View details');
    expect(html).toContain('/policies/policy-abc');
  });

  it('displays product name when available', () => {
    const html = renderToStaticMarkup(
      <PolicyCard policy={makePolicy({ product: { name: 'Crop Insurance' } as any })} />
    );
    expect(html).toContain('Crop Insurance');
  });

  it('displays fallback policy name when product is not available', () => {
    const html = renderToStaticMarkup(
      <PolicyCard policy={makePolicy({ id: 'policy-12345678', product: undefined })} />
    );
    expect(html).toContain('Policy #policy-1');
  });
});

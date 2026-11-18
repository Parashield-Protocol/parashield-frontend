import { renderToStaticMarkup } from 'react-dom/server';
import { PolicyCard, isExpiringSoon } from '../components/PolicyCard';
import type { Policy } from '../types';

// PolicyCard calls useRouter(), which throws outside a mounted App Router.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

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
      <PolicyCard policy={makePolicy({ product: { name: 'Crop Insurance' } as unknown as Policy['product'] })} />
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

describe('PolicyCard expiring-soon badge (#680)', () => {
  const nowSec = () => Math.floor(Date.now() / 1000);

  it('shows an amber "Expiring soon" badge with the exact time for Active policies ending within 24h', () => {
    const html = renderToStaticMarkup(
      <PolicyCard policy={makePolicy({ status: 'Active', endTime: nowSec() + 3600 })} />
    );
    expect(html).toContain('Expiring soon');
    expect(html).toContain('text-amber-400');
    expect(html).toMatch(/title="Expires [^"]+"/);
  });

  it('keeps the regular Active badge for policies ending later', () => {
    const html = renderToStaticMarkup(
      <PolicyCard policy={makePolicy({ status: 'Active', endTime: nowSec() + 3 * 86_400 })} />
    );
    expect(html).not.toContain('Expiring soon');
    expect(html).toContain('aria-label="Active"');
  });

  it('isExpiringSoon only flags Active policies inside the 24h window', () => {
    const now = 1_000_000 * 1000;
    const at = (secondsFromNow: number) => 1_000_000 + secondsFromNow;
    expect(isExpiringSoon(makePolicy({ status: 'Active', endTime: at(60) }), now)).toBe(true);
    expect(isExpiringSoon(makePolicy({ status: 'Active', endTime: at(86_400) }), now)).toBe(false);
    expect(isExpiringSoon(makePolicy({ status: 'Active', endTime: at(-60) }), now)).toBe(false);
    expect(isExpiringSoon(makePolicy({ status: 'Expired', endTime: at(60) }), now)).toBe(false);
  });
});

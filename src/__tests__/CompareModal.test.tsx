import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CompareModal } from '../components/CompareModal';
import type { Product } from '../types';

vi.mock('@/lib/stellar', () => ({
  connectWallet: vi.fn(),
  disconnectWallet: vi.fn(),
  getStoredAddress: vi.fn(),
  getConnectedAddress: vi.fn(),
  signAuthMessage: vi.fn(),
  EXPECTED_NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
}));

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Crop Insurance',
    category: 'crop',
    triggerType: 'Threshold',
    threshold: '30',
    comparison: 'LessThan',
    coverageMin: '1000000',
    coverageMax: '10000000',
    premiumRate: 500,
    maxDuration: 30,
    status: 'Active',
    ...overrides,
  };
}

describe('CompareModal', () => {
  it('renders with empty table when products list is empty', () => {
    const html = renderToStaticMarkup(
      <CompareModal products={[]} onClose={vi.fn()} />
    );
    expect(html).toContain('Compare Products');
  });

  it('renders product names as column headers', () => {
    const html = renderToStaticMarkup(
      <CompareModal
        products={[
          makeProduct({ name: 'Crop Insurance' }),
          makeProduct({ id: 'p2', name: 'Flight Delay' }),
        ]}
        onClose={vi.fn()}
      />
    );
    expect(html).toContain('Crop Insurance');
    expect(html).toContain('Flight Delay');
  });

  it('displays premium rate for each product', () => {
    const html = renderToStaticMarkup(
      <CompareModal
        products={[
          makeProduct({ premiumRate: 500 }),
          makeProduct({ id: 'p2', premiumRate: 300 }),
        ]}
        onClose={vi.fn()}
      />
    );
    expect(html).toContain('5.00%');
    expect(html).toContain('3.00%');
  });

  it('displays coverage amounts', () => {
    const html = renderToStaticMarkup(
      <CompareModal
        products={[
          makeProduct({ coverageMin: '1000000', coverageMax: '10000000' }),
          makeProduct({ id: 'p2', coverageMin: '500000', coverageMax: '5000000' }),
        ]}
        onClose={vi.fn()}
      />
    );
    expect(html).toContain('1.00');
    expect(html).toContain('0.50');
  });

  it('includes Compare Products title', () => {
    const html = renderToStaticMarkup(
      <CompareModal
        products={[makeProduct()]}
        onClose={vi.fn()}
      />
    );
    expect(html).toContain('Compare Products');
  });
});

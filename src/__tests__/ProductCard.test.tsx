import { renderToStaticMarkup } from 'react-dom/server';
import { ProductCard } from '../components/ProductCard';
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

describe('ProductCard', () => {
  it('renders active product with buy button enabled', () => {
    const html = renderToStaticMarkup(
      <ProductCard product={makeProduct({ status: 'Active' })} />
    );
    expect(html).toContain('Crop Insurance');
    expect(html).toContain('Buy Policy');
    expect(html).not.toContain('Temporarily unavailable');
    expect(html).not.toContain('No longer available');
  });

  it('renders paused product with temporarily unavailable message', () => {
    const html = renderToStaticMarkup(
      <ProductCard product={makeProduct({ status: 'Paused' })} />
    );
    expect(html).toContain('Temporarily unavailable');
    expect(html).not.toContain('Buy Policy');
  });

  it('renders deprecated product with no longer available message', () => {
    const html = renderToStaticMarkup(
      <ProductCard product={makeProduct({ status: 'Deprecated' })} />
    );
    expect(html).toContain('No longer available');
    expect(html).not.toContain('Buy Policy');
  });

  it('renders crop category with correct icon', () => {
    const html = renderToStaticMarkup(
      <ProductCard product={makeProduct({ category: 'crop' })} />
    );
    expect(html).toContain('🌾');
    expect(html).toContain('Crop Insurance');
  });

  it('renders flight category with correct icon', () => {
    const html = renderToStaticMarkup(
      <ProductCard product={makeProduct({ category: 'flight', name: 'Flight Delay' })} />
    );
    expect(html).toContain('✈️');
    expect(html).toContain('Flight Delay');
  });

  it('renders disaster category with correct icon', () => {
    const html = renderToStaticMarkup(
      <ProductCard product={makeProduct({ category: 'disaster', name: 'Natural Disaster' })} />
    );
    expect(html).toContain('🌪️');
    expect(html).toContain('Natural Disaster');
  });

  it('renders health category with correct icon', () => {
    const html = renderToStaticMarkup(
      <ProductCard product={makeProduct({ category: 'health', name: 'Health' })} />
    );
    expect(html).toContain('🏥');
    expect(html).toContain('Health');
  });

  it('renders defi category with correct icon', () => {
    const html = renderToStaticMarkup(
      <ProductCard product={makeProduct({ category: 'defi', name: 'DeFi Cover' })} />
    );
    expect(html).toContain('🔐');
    expect(html).toContain('DeFi Cover');
  });

  it('renders fallback icon for unrecognized category', () => {
    const html = renderToStaticMarkup(
      <ProductCard product={makeProduct({ category: 'unknown' as unknown as Product['category'] })} />
    );
    expect(html).toContain('🛡️');
  });

  it('displays premium rate as percentage', () => {
    const html = renderToStaticMarkup(
      <ProductCard product={makeProduct({ premiumRate: 500 })} />
    );
    expect(html).toContain('Premium');
    expect(html).toContain('5.00%');
  });

  it('displays max coverage amount', () => {
    const html = renderToStaticMarkup(
      <ProductCard product={makeProduct({ coverageMax: '10000000' })} />
    );
    expect(html).toContain('Max Coverage');
    expect(html).toContain('1.00');
  });
});

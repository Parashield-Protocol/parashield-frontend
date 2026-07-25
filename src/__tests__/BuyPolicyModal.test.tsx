import { renderToStaticMarkup } from 'react-dom/server';
import { BuyPolicyModal } from '../components/BuyPolicyModal';
import type { Product } from '../types';

vi.mock('@/lib/stellar', () => ({
  signTransaction: vi.fn(),
  getAddress: vi.fn(),
  isConnected: vi.fn(),
}));
vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(() => ({
    address: null,
    connect: vi.fn(),
    connecting: false,
    error: null,
  })),
}));
vi.mock('@/context/ToastContext', () => ({
  useToast: vi.fn(() => ({
    show: vi.fn(),
  })),
}));

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Crop Insurance',
    category: 'crop',
    description: 'Test product',
    coverageMin: '1000000',
    coverageMax: '100000000',
    premiumRate: 500,
    maxDuration: 30,
    ...overrides,
  };
}

describe('BuyPolicyModal', () => {
  it('renders crop-specific latitude and longitude inputs', () => {
    const html = renderToStaticMarkup(<BuyPolicyModal product={makeProduct({ category: 'crop' })} onClose={vi.fn()} />);
    expect(html).toContain('Latitude');
    expect(html).toContain('Longitude');
    expect(html).toContain('Month');
    expect(html).toContain('Year');
  });

  it('renders flight-specific inputs for flight products', () => {
    const html = renderToStaticMarkup(<BuyPolicyModal product={makeProduct({ category: 'flight', name: 'Flight Delay' })} onClose={vi.fn()} />);
    expect(html).toContain('Flight Number');
    expect(html).toContain('Date');
  });

  it('shows fixed defi oracle key for defi products', () => {
    const html = renderToStaticMarkup(<BuyPolicyModal product={makeProduct({ category: 'defi', name: 'DeFi Cover' })} onClose={vi.fn()} />);
    expect(html).toContain('defi');
    expect(html).toContain('Oracle Key (Fixed)');
  });

  it('shows manual oracle key input for disaster products', () => {
    const html = renderToStaticMarkup(<BuyPolicyModal product={makeProduct({ category: 'disaster', name: 'Natural Disaster' })} onClose={vi.fn()} />);
    expect(html).toContain('Oracle Key');
    expect(html).toContain('Max 32 chars');
  });

  it('shows manual oracle key input for health products', () => {
    const html = renderToStaticMarkup(<BuyPolicyModal product={makeProduct({ category: 'health', name: 'Health' })} onClose={vi.fn()} />);
    expect(html).toContain('Oracle Key');
    expect(html).toContain('Max 32 chars');
  });

  it('renders the configure step with coverage and duration inputs', () => {
    const html = renderToStaticMarkup(<BuyPolicyModal product={makeProduct()} onClose={vi.fn()} />);
    expect(html).toContain('Coverage Amount (USDC)');
    expect(html).toContain('Duration (days');
  });

  it('displays the product name in the modal title', () => {
    const html = renderToStaticMarkup(<BuyPolicyModal product={makeProduct({ name: 'Test Product' })} onClose={vi.fn()} />);
    expect(html).toContain('Buy — Test Product');
  });
});

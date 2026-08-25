import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen, fireEvent } from '@testing-library/react';
import { BuyPolicyModal } from '../components/BuyPolicyModal';
import { useWallet } from '../hooks/useWallet';
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

  describe('scientific-notation input rejection (#473, #475)', () => {
    beforeEach(() => {
      vi.mocked(useWallet).mockReturnValue({
        address: 'GWALLET',
        connected: true,
        connecting: false,
        error: null,
        walletState: { status: 'connected', address: 'GWALLET' },
        networkPassphrase: 'Test SDF Network ; September 2015',
        connect: vi.fn(),
        disconnect: vi.fn(),
      });
    });

    it('rejects scientific notation in the coverage field', () => {
      render(<BuyPolicyModal product={makeProduct()} onClose={vi.fn()} />);

      const [coverageInput, durationInput] = screen.getAllByRole('spinbutton');
      fireEvent.change(coverageInput, { target: { value: '5e8' } });
      fireEvent.change(durationInput, { target: { value: '5' } });
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));

      expect(
        screen.getByText('Coverage must be a plain positive number (no scientific notation)'),
      ).toBeInTheDocument();
    });

    it('rejects scientific notation in the duration field', () => {
      render(<BuyPolicyModal product={makeProduct()} onClose={vi.fn()} />);

      const [coverageInput, durationInput] = screen.getAllByRole('spinbutton');
      fireEvent.change(coverageInput, { target: { value: '50' } });
      fireEvent.change(durationInput, { target: { value: '1e1' } });
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));

      expect(
        screen.getByText('Duration must be a whole number of days (no scientific notation or decimals)'),
      ).toBeInTheDocument();
    });

    it('accepts a plain valid coverage and duration and advances to the next step', () => {
      render(<BuyPolicyModal product={makeProduct()} onClose={vi.fn()} />);

      const [coverageInput, durationInput] = screen.getAllByRole('spinbutton');
      fireEvent.change(coverageInput, { target: { value: '50' } });
      fireEvent.change(durationInput, { target: { value: '10' } });
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));

      expect(
        screen.queryByText('Coverage must be a plain positive number (no scientific notation)'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('Duration must be a whole number of days (no scientific notation or decimals)'),
      ).not.toBeInTheDocument();
    });
  });
});

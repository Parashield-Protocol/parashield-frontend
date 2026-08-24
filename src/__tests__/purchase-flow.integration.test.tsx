import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ProductCard } from '../components/ProductCard';
import { BuyPolicyModal } from '../components/BuyPolicyModal';
import { useWallet } from '@/hooks/useWallet';
import type { Product } from '../types';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockConnect = vi.fn();
const mockShowToast = vi.fn();

vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(() => ({
    address: null,
    connect: mockConnect,
    connecting: false,
    error: null,
  })),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: vi.fn(() => ({
    show: mockShowToast,
  })),
}));

vi.mock('@/lib/stellar', () => ({
  connectWallet: vi.fn(),
  disconnectWallet: vi.fn(),
  getStoredAddress: vi.fn(),
  getConnectedAddress: vi.fn(),
  signAuthMessage: vi.fn(),
  signTransaction: vi.fn(),
  EXPECTED_NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
}));

vi.mock('@/lib/contract', () => ({
  invokeBuyPolicy: vi.fn().mockResolvedValue({
    txHash: 'abc123def456',
    signedXdr: 'mock-xdr',
  }),
}));

vi.mock('@/lib/api', () => ({
  buyPolicy: vi.fn().mockResolvedValue({ policyId: 'policy-1', txHash: 'abc123def456' }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Crop Insurance',
    category: 'crop',
    triggerType: 'Threshold',
    threshold: '30',
    comparison: 'LessThan',
    coverageMin: '1000000',
    coverageMax: '100000000',
    premiumRate: 500,
    maxDuration: 30,
    status: 'Active',
    ...overrides,
  };
}

function mockConnectedWallet() {
  vi.mocked(useWallet).mockReturnValue({
    address: 'GABC123',
    connected: true,
    connecting: false,
    error: null,
    walletState: { status: 'connected', address: 'GABC123' },
    connect: mockConnect,
    disconnect: vi.fn(),
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Purchase flow integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to disconnected by default
    vi.mocked(useWallet).mockReturnValue({
      address: null,
      connected: false,
      connecting: false,
      error: null,
      walletState: { status: 'disconnected' },
      connect: mockConnect,
      disconnect: vi.fn(),
    });
  });

  it('renders product card with Buy Policy button', () => {
    const product = makeProduct();
    render(<ProductCard product={product} />);

    expect(screen.getByText('Crop Insurance')).toBeInTheDocument();
    expect(screen.getByText('Buy Policy')).toBeInTheDocument();
  });

  it('opens the BuyPolicyModal when Buy Policy is clicked', async () => {
    const product = makeProduct();
    render(<ProductCard product={product} />);

    const buyButton = screen.getByText('Buy Policy');
    await act(async () => {
      fireEvent.click(buyButton);
    });

    expect(screen.getByText('Buy — Crop Insurance')).toBeInTheDocument();
  });

  it('shows Configure step with coverage and duration inputs', async () => {
    const product = makeProduct();
    render(<ProductCard product={product} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Buy Policy'));
    });

    expect(screen.getByText('Coverage Amount (USDC)')).toBeInTheDocument();
    expect(screen.getByText(/Duration \(days/)).toBeInTheDocument();
  });

  it('shows crop-specific latitude and longitude inputs', async () => {
    const product = makeProduct({ category: 'crop' });
    render(<ProductCard product={product} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Buy Policy'));
    });

    expect(screen.getByText('Latitude')).toBeInTheDocument();
    expect(screen.getByText('Longitude')).toBeInTheDocument();
  });

  it('shows validation error for empty coverage', async () => {
    mockConnectedWallet();
    const product = makeProduct();
    render(<ProductCard product={product} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Buy Policy'));
    });

    // Click Next without filling coverage (wallet connected)
    await act(async () => {
      fireEvent.click(screen.getByText('Next'));
    });

    expect(screen.getByText('Coverage must be a positive amount')).toBeInTheDocument();
  });

  it('navigates through steps: Configure → Review → Sign', async () => {
    mockConnectedWallet();
    const product = makeProduct();
    render(<ProductCard product={product} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Buy Policy'));
    });

    // Fill coverage
    const coverageInput = screen.getByPlaceholderText(/0\.10/);
    await act(async () => {
      fireEvent.change(coverageInput, { target: { value: '5' } });
    });

    // Step 0: Next → Review
    await act(async () => {
      fireEvent.click(screen.getByText('Next'));
    });

    expect(screen.getByText('Review your policy')).toBeInTheDocument();
    expect(screen.getAllByText('Crop Insurance').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('5.00 USDC')).toBeInTheDocument();

    // Step 1: Confirm details → Sign
    await act(async () => {
      fireEvent.click(screen.getByText('Confirm details'));
    });

    expect(screen.getByText('Sign & Confirm')).toBeInTheDocument();
    expect(screen.getByText(/Your Stellar wallet will prompt you/)).toBeInTheDocument();
  });

  it('navigates back from Review to Configure', async () => {
    mockConnectedWallet();
    const product = makeProduct();
    render(<ProductCard product={product} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Buy Policy'));
    });

    const coverageInput = screen.getByPlaceholderText(/0\.10/);
    await act(async () => {
      fireEvent.change(coverageInput, { target: { value: '5' } });
    });

    // Go to Review
    await act(async () => {
      fireEvent.click(screen.getByText('Next'));
    });
    expect(screen.getByText('Review your policy')).toBeInTheDocument();

    // Go back to Configure
    await act(async () => {
      fireEvent.click(screen.getByText('Back'));
    });
    expect(screen.getByText('Coverage Amount (USDC)')).toBeInTheDocument();
  });

  it('connects wallet when clicking action button without wallet', async () => {
    const product = makeProduct();
    render(<BuyPolicyModal product={product} onClose={vi.fn()} />);

    // Fill valid coverage
    const coverageInput = screen.getByPlaceholderText(/0\.10/);
    await act(async () => {
      fireEvent.change(coverageInput, { target: { value: '5' } });
    });

    // Click Connect Wallet
    await act(async () => {
      fireEvent.click(screen.getByText('Connect Wallet'));
    });

    expect(mockConnect).toHaveBeenCalled();
  });

  it('closes modal on cancel', async () => {
    const onClose = vi.fn();
    const product = makeProduct();
    render(<BuyPolicyModal product={product} onClose={onClose} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Cancel'));
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('renders paused product without Buy Policy button', () => {
    const product = makeProduct({ status: 'Paused' });
    render(<ProductCard product={product} />);

    expect(screen.getByText('Temporarily unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Buy Policy')).not.toBeInTheDocument();
  });
});

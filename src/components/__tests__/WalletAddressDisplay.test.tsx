import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { WalletAddressDisplay } from '../WalletAddressDisplay';
import { shortenAddress } from '@/lib/format';

const MOCK_ADDRESS = 'GDXFJ6LPYXIR7TQXJZ7PY4M5G6R2V3T4U5W6X7Y8Z9A0B1C2D3E4F5G6H7';

vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(),
}));

vi.mock('@/components/CopyButton', () => ({
  CopyButton: ({ text, label }: { text: string; label?: string }) => (
    <button data-testid="copy-button" data-text={text}>
      {label ?? 'Copy'}
    </button>
  ),
}));

import { useWallet } from '@/hooks/useWallet';
const mockUseWallet = vi.mocked(useWallet);

describe('WalletAddressDisplay', () => {
  beforeEach(() => {
    mockUseWallet.mockReturnValue({
      address: MOCK_ADDRESS,
      connected: true,
      connecting: false,
      error: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders shortened address when full is false', () => {
    render(<WalletAddressDisplay />);
    const shortened = shortenAddress(MOCK_ADDRESS);
    expect(screen.getByText(shortened)).toBeInTheDocument();
  });

  it('renders full address when full is true', () => {
    render(<WalletAddressDisplay full />);
    expect(screen.getByText(MOCK_ADDRESS)).toBeInTheDocument();
  });

  it('renders nothing when not connected', () => {
    mockUseWallet.mockReturnValue({
      address: null,
      connected: false,
      connecting: false,
      error: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });
    const { container } = render(<WalletAddressDisplay />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when address is null', () => {
    mockUseWallet.mockReturnValue({
      address: null,
      connected: true,
      connecting: false,
      error: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });
    const { container } = render(<WalletAddressDisplay />);
    expect(container.innerHTML).toBe('');
  });

  it('includes a copy button with the full address', () => {
    render(<WalletAddressDisplay />);
    const copyBtn = screen.getByTestId('copy-button');
    expect(copyBtn).toHaveAttribute('data-text', MOCK_ADDRESS);
  });

  it('applies custom className', () => {
    render(<WalletAddressDisplay className="custom-class" />);
    expect(screen.getByText(shortenAddress(MOCK_ADDRESS)).closest('div')).toHaveClass('custom-class');
  });
});

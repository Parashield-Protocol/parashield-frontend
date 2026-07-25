import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WalletButton } from '../components/WalletButton';
import { WalletProvider } from '../context/WalletContext';

const mockConnectWallet = vi.fn();

vi.mock('@/lib/stellar', () => ({
  connectWallet: (...args: unknown[]) => mockConnectWallet(...args),
  disconnectWallet: vi.fn(),
  getStoredAddress: vi.fn().mockReturnValue(null),
  getConnectedAddress: vi.fn().mockReturnValue(null),
  signAuthMessage: vi.fn(),
  EXPECTED_NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
}));

vi.mock('@/lib/api', () => ({
  fetchChallenge: vi.fn(),
  login: vi.fn(),
  setAuthErrorHandler: vi.fn(),
}));

vi.mock('@/lib/storage', () => ({
  default: {
    getSession: vi.fn().mockReturnValue(null),
    setSession: vi.fn(),
    removeSession: vi.fn(),
  },
}));

describe('WalletButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Connect Wallet" button when disconnected', () => {
    const html = renderToStaticMarkup(
      <WalletProvider><WalletButton /></WalletProvider>,
    );
    expect(html).toContain('Connect Wallet');
    expect(html).not.toContain('Disconnect');
  });

  it('applies custom className when provided', () => {
    const html = renderToStaticMarkup(
      <WalletProvider><WalletButton className="custom-class" /></WalletProvider>,
    );
    expect(html).toContain('custom-class');
  });

  it('renders the wallet button wrapper with correct structure', () => {
    const html = renderToStaticMarkup(
      <WalletProvider><WalletButton /></WalletProvider>,
    );
    expect(html).toContain('button');
    expect(html).toContain('rounded-full');
  });
});

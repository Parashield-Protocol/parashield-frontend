import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConnectWalletPrompt } from '../components/ConnectWalletPrompt';
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

describe('ConnectWalletPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the default prompt message', () => {
    const html = renderToStaticMarkup(
      <WalletProvider><ConnectWalletPrompt /></WalletProvider>,
    );
    expect(html).toContain('Connect your wallet to continue');
  });

  it('renders a custom message when provided', () => {
    const html = renderToStaticMarkup(
      <WalletProvider>
        <ConnectWalletPrompt message="Sign in to view policies" />
      </WalletProvider>,
    );
    expect(html).toContain('Sign in to view policies');
    expect(html).not.toContain('Connect your wallet to continue');
  });

  it('mentions supported wallet names', () => {
    const html = renderToStaticMarkup(
      <WalletProvider><ConnectWalletPrompt /></WalletProvider>,
    );
    expect(html).toContain('Freighter');
    expect(html).toContain('xBull');
    expect(html).toContain('LOBSTR');
  });

  it('renders a Connect Wallet button', () => {
    const html = renderToStaticMarkup(
      <WalletProvider><ConnectWalletPrompt /></WalletProvider>,
    );
    expect(html).toContain('button');
    expect(html).toContain('Connect Wallet');
  });

  it('has the lock icon', () => {
    const html = renderToStaticMarkup(
      <WalletProvider><ConnectWalletPrompt /></WalletProvider>,
    );
    expect(html).toContain('🔒');
  });
});

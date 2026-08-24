import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { WalletProvider, useWalletContext } from '../context/WalletContext';
import { WalletButton } from '../components/WalletButton';
import { connectWallet } from '@/lib/stellar';
import { fetchChallenge, login } from '@/lib/api';

vi.mock('@/lib/stellar', () => ({
  connectWallet:              vi.fn(),
  disconnectWallet:           vi.fn(),
  getStoredAddress:           vi.fn(() => null),
  getConnectedAddress:        vi.fn(),
  signAuthMessage:            vi.fn(async (c: string) => `signed:${c}`),
  EXPECTED_NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
}));

vi.mock('@/lib/api', () => ({
  fetchChallenge:     vi.fn(),
  login:              vi.fn(),
  setAuthErrorHandler: vi.fn(),
}));

vi.mock('@/lib/storage', () => ({
  default: {
    getSession:    vi.fn(() => null),
    setSession:    vi.fn(),
    removeSession: vi.fn(),
  },
}));

function WalletFlowTest() {
  const { address, connected, connecting, error, connect, disconnect } = useWalletContext();

  return (
    <div>
      {connected && address ? (
        <>
          <span data-testid="address">{address}</span>
          <button onClick={disconnect}>Disconnect</button>
        </>
      ) : (
        <button onClick={connect} disabled={connecting}>
          {connecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
      )}
      {error && <p data-testid="error">{error}</p>}
    </div>
  );
}

function renderFlow() {
  let container: HTMLDivElement;
  let root: Root;

  act(() => {
    container = document.createElement('div');
    root = createRoot(container);
    root.render(
      <WalletProvider>
        <WalletFlowTest />
      </WalletProvider>,
    );
  });

  return {
    get button() { return container!.querySelector('button') as HTMLButtonElement; },
    get errorEl() { return container!.querySelector('[data-testid="error"]'); },
    get addressEl() { return container!.querySelector('[data-testid="address"]'); },
    get html() { return container!.innerHTML; },
    unmount() { act(() => root!.unmount()); },
  };
}

describe('Wallet connection flow (issue #360)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchChallenge as Mock).mockResolvedValue('challenge-123');
  });

  it('shows "Connect Wallet" button when disconnected', () => {
    const flow = renderFlow();
    expect(flow.button.textContent).toBe('Connect Wallet');
    expect(flow.button).not.toBeDisabled();
    flow.unmount();
  });

  it('connects and shows shortened address', async () => {
    (connectWallet as Mock).mockResolvedValue({
      address: 'GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890AB',
      networkPassphrase: null,
    });
    (login as Mock).mockResolvedValue({ token: 'jwt-token' });

    const flow = renderFlow();

    await act(async () => {
      flow.button.click();
    });

    expect(flow.addressEl?.textContent).toContain('GABCDEF');
    flow.unmount();
  });

  it('disconnects and returns to "Connect Wallet" state', async () => {
    (connectWallet as Mock).mockResolvedValue({
      address: 'GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890AB',
      networkPassphrase: null,
    });
    (login as Mock).mockResolvedValue({ token: 'jwt-token' });

    const flow = renderFlow();

    await act(async () => {
      flow.button.click();
    });

    expect(flow.addressEl).toBeTruthy();

    await act(async () => {
      flow.button.click();
    });

    expect(flow.button.textContent).toBe('Connect Wallet');
    expect(flow.addressEl).toBeNull();
    flow.unmount();
  });

  it('shows error on network mismatch', async () => {
    (connectWallet as Mock).mockResolvedValue({
      address: 'GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890AB',
      networkPassphrase: 'Public Global Stellar Network ; September 2015',
    });

    const flow = renderFlow();

    await act(async () => {
      flow.button.click();
    });

    expect(flow.errorEl?.textContent).toContain('Switch your wallet network');
    expect(flow.button.textContent).toBe('Connect Wallet');
    flow.unmount();
  });

  it('shows error on auth failure and disconnects', async () => {
    (connectWallet as Mock).mockResolvedValue({
      address: 'GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890AB',
      networkPassphrase: null,
    });
    (login as Mock).mockRejectedValue(new Error('invalid signature'));

    const flow = renderFlow();

    await act(async () => {
      flow.button.click();
    });

    expect(flow.errorEl?.textContent).toContain('Auth failed');
    expect(flow.button.textContent).toBe('Connect Wallet');
    flow.unmount();
  });
});

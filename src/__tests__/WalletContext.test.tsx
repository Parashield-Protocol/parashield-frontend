import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { WalletProvider, useWalletContext } from '../context/WalletContext';
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

interface WalletHandle {
  readonly ctx: ReturnType<typeof useWalletContext>;
}

function renderWallet(): WalletHandle {
  let captured: ReturnType<typeof useWalletContext> | undefined;
  const container = document.createElement('div');
  let root: Root;

  function Consumer() {
    captured = useWalletContext();
    return null;
  }

  act(() => {
    root = createRoot(container);
    root.render(
      <WalletProvider>
        <Consumer />
      </WalletProvider>,
    );
  });

  return {
    get ctx() {
      return captured!;
    },
  };
}

describe('WalletProvider auth-failure error handling (issue #221)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchChallenge as Mock).mockResolvedValue('challenge-123');
  });

  it('preserves the auth-failure message even though disconnect() clears error', async () => {
    // A wallet connects fine, but the login exchange fails. disconnect() runs
    // inside the catch and ends with setError(null); the fix orders it BEFORE
    // setError(...) so the message survives instead of being wiped.
    (connectWallet as Mock).mockResolvedValue({ address: 'GTEST', networkPassphrase: null });
    (login as Mock).mockRejectedValue(new Error('login rejected'));

    const handle = renderWallet();

    await act(async () => {
      await handle.ctx.connect();
    });

    expect(handle.ctx.error).toBe('Auth failed: login rejected');
    expect(handle.ctx.connected).toBe(false);
  });
});

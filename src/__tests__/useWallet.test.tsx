import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useWallet } from '../hooks/useWallet';
import { WalletProvider } from '../context/WalletContext';
import { renderHook } from './renderHook';

describe('useWallet', () => {
  it('throws when used outside of a WalletProvider', () => {
    // Errors thrown during render are noisy in test output; silence the
    // expected React error boundary log for this one assertion.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useWallet())).toThrow(
      'useWalletContext must be used inside <WalletProvider>',
    );

    consoleError.mockRestore();
  });

  it('returns the disconnected initial state when wrapped in a WalletProvider', () => {
    let value: ReturnType<typeof useWallet> | undefined;

    function Consumer() {
      value = useWallet();
      return null;
    }

    const container = document.createElement('div');
    act(() => {
      createRoot(container).render(
        <WalletProvider>
          <Consumer />
        </WalletProvider>,
      );
    });

    expect(value?.address).toBeNull();
    expect(value?.connected).toBe(false);
    expect(value?.connecting).toBe(false);
    expect(value?.error).toBeNull();
    expect(typeof value?.connect).toBe('function');
    expect(typeof value?.disconnect).toBe('function');
  });
});

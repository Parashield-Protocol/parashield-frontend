'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { connectWallet, disconnectWallet, getStoredAddress, getConnectedAddress, getWalletNetworkPassphrase, signAuthMessage, EXPECTED_NETWORK_PASSPHRASE } from '@/lib/stellar';
import { toUserMessage } from '@/lib/errors';
import { fetchChallenge, login, setAuthErrorHandler } from '@/lib/api';
import storage from '@/lib/storage';
import {
  ADDRESS_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
  NETWORK_LABEL,
  NETWORK_STORAGE_KEY,
  WALLET_STORAGE_KEY,
  networkLabelForPassphrase,
} from '@/lib/constants';
import { EXPIRY_NOTIFIED_PREFIX, WALLET_KIT_STORAGE_KEY, migrateLegacyStorage } from '@/lib/storageKeys';
import type { WalletState } from '@/types';

/** Storage keys tied to the connected wallet / signed-in session (#687). */
const SESSION_STORAGE_KEYS = [
  AUTH_TOKEN_STORAGE_KEY,
  WALLET_STORAGE_KEY,
  ADDRESS_STORAGE_KEY,
  NETWORK_STORAGE_KEY,
  WALLET_KIT_STORAGE_KEY,
] as const;

interface WalletContextValue {
  address:           string | null;
  connected:         boolean;
  connecting:        boolean;
  error:             string | null;
  walletState:       WalletState;
  networkPassphrase: string | null;
  connect:           () => Promise<void>;
  disconnect:        () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

/** How often to re-read the wallet's network while connected (#724). */
export const NETWORK_RECHECK_INTERVAL_MS = 5_000;

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address,    setAddress]    = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [networkPassphrase, setNetworkPassphrase] = useState<string | null>(null);

  const disconnect = useCallback(() => {
    disconnectWallet();
    // Clear all wallet/session data, not just the auth token, so nothing tied
    // to this wallet survives logout on a shared device (#687).
    storage.clearSession(SESSION_STORAGE_KEYS, [EXPIRY_NOTIFIED_PREFIX]);
    setAddress(null);
    setError(null);
    setNetworkPassphrase(null);
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const { address: addr, networkPassphrase } = await connectWallet();

      // Best-effort: if the wallet reports a network, ensure it matches the app's.
      if (networkPassphrase && networkPassphrase !== EXPECTED_NETWORK_PASSPHRASE) {
        disconnect();
        setError(
          `Your wallet is connected to ${networkLabelForPassphrase(networkPassphrase)} but this app runs on ${NETWORK_LABEL}. Switch your wallet network and try again.`,
        );
        return;
      }

      try {
        // 1. Obtain a challenge nonce (server-issued or locally generated).
        const challenge = await fetchChallenge(addr);
        // 2. Ask the wallet to sign the challenge — this proves key ownership.
        const signedChallenge = await signAuthMessage(challenge);
        // 3. Exchange the signed challenge for a JWT.
        const { token } = await login(addr, signedChallenge);
        storage.setSession(AUTH_TOKEN_STORAGE_KEY, token);
      } catch (authErr) {
        const msg = toUserMessage(authErr);
        // disconnect() ends with setError(null), so it must run BEFORE we set
        // the auth-failure message — otherwise the message is wiped immediately.
        // This mirrors the network-mismatch branch above (disconnect(); setError(...)).
        disconnect();
        setError(`Auth failed: ${msg}`);
        return;
      }
      setAddress(addr);
      if (networkPassphrase) setNetworkPassphrase(networkPassphrase);
    } catch (err) {
      const msg = toUserMessage(err);
      if (!msg.includes('Wallet modal closed')) setError(msg);
    } finally {
      setConnecting(false);
    }
  }, [disconnect]);

  // Restore connected state only when a valid session token also exists.
  // sessionStorage is cleared when the tab closes, so a stored address without
  // a token means the previous session has expired. Clear it rather than
  // briefly exposing a false "connected" state that the 401 interceptor would
  // revoke milliseconds later on the first API call.
  useEffect(() => {
    let cancelled = false;

    async function initWallet() {
      migrateLegacyStorage();
      const stored = getStoredAddress();
      if (!stored) return;

      const token = storage.getSession(AUTH_TOKEN_STORAGE_KEY);
      if (!token) {
        if (!cancelled) disconnect();
        return;
      }

      // Decode the JWT (without verification) to check expiry.
      // An expired token would cause the first API call to 401, briefly
      // showing a "connected" state before disconnecting (issue #369).
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp < Date.now() / 1000) {
          if (!cancelled) disconnect();
          return;
        }
      } catch {
        // Malformed token — treat as expired.
        if (!cancelled) disconnect();
        return;
      }

      try {
        const liveAddress = await getConnectedAddress();
        if (cancelled) return;
        if (liveAddress && liveAddress === stored) {
          setAddress(stored);
        } else {
          disconnect();
        }
      } catch {
        if (!cancelled) disconnect();
      }
    }

    void initWallet();
    return () => {
      cancelled = true;
    };
  }, [disconnect]);

  useEffect(() => {
    setAuthErrorHandler(disconnect);
  }, [disconnect]);

  // The wallet kit exposes no network-change event, so while connected
  // re-read the wallet's network on mount, when the tab regains focus, and on
  // an interval — otherwise a switch made in the wallet leaves the banner and
  // network checks on the stale value from connect time (#724).
  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    const recheck = async () => {
      const passphrase = await getWalletNetworkPassphrase();
      if (!cancelled && passphrase) setNetworkPassphrase(passphrase);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void recheck();
    };

    void recheck();
    const timer = setInterval(() => void recheck(), NETWORK_RECHECK_INTERVAL_MS);
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [address]);

  const walletState: WalletState = connecting
    ? { status: 'connecting' }
    : error
    ? { status: 'error', address: null, message: error }
    : address
    ? { status: 'connected', address }
    : { status: 'disconnected' };

  return (
    <WalletContext.Provider
      value={{ address, connected: !!address, connecting, error, walletState, networkPassphrase, connect, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWalletContext must be used inside <WalletProvider>');
  return ctx;
}

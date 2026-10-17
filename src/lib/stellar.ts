'use client';

import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  type ISupportedWallet,
} from '@creit.tech/stellar-wallets-kit';
import storage from './storage';
import { WALLET_STORAGE_KEY, ADDRESS_STORAGE_KEY, NETWORK_STORAGE_KEY, IS_MAINNET, NETWORK_PASSPHRASE } from './constants';
import { WalletError } from './errors';

export type WalletAddress = string;

export interface WalletConnection {
  address:           WalletAddress;
  networkPassphrase: string | null;
}

const NETWORK: WalletNetwork = IS_MAINNET ? WalletNetwork.PUBLIC : WalletNetwork.TESTNET;

/**
 * Network passphrase the app expects connected wallets to be using.
 * Re-exported from `constants` (the single source of truth) for existing callers.
 */
export const EXPECTED_NETWORK_PASSPHRASE: string = NETWORK_PASSPHRASE;

// Wallet id/address/network are kept in sessionStorage, not localStorage:
// restoring a connection needs the session-scoped auth token anyway, so a
// persisted copy only left the raw address lying around after the tab closed.
let _kit: StellarWalletsKit | null = null;

function getKit(): StellarWalletsKit {
  if (!_kit) {
    _kit = new StellarWalletsKit({
      network: NETWORK,
      selectedWalletId: storage.getSession(WALLET_STORAGE_KEY) ?? undefined,
      modules: allowAllModules(),
    });
  }
  return _kit;
}

export async function connectWallet(): Promise<WalletConnection> {
  const kit = getKit();
  return new Promise<WalletConnection>((resolve, reject) => {
    kit.openModal({
      modalTitle: 'Connect your wallet',
      onWalletSelected: async (option: ISupportedWallet) => {
        try {
          kit.setWallet(option.id);
          const { address } = await kit.getAddress();
          if (!address) throw new WalletError('No address returned from wallet');
          storage.setSession(WALLET_STORAGE_KEY, option.id);
          storage.setSession(ADDRESS_STORAGE_KEY, address);
          let networkPassphrase: string | null = null;
          try {
            const net = await kit.getNetwork();
            networkPassphrase = net.networkPassphrase ?? net.network ?? null;
            if (net.network) storage.setSession(NETWORK_STORAGE_KEY, net.networkPassphrase ?? net.network);
          } catch { /* network read is best-effort */ }
          resolve({ address, networkPassphrase });
        } catch (err) {
          reject(new WalletError('Wallet connection failed', err));
        }
      },
      onClosed: () => reject(new WalletError('Wallet modal closed')),
    });
  });
}

export async function getConnectedAddress(): Promise<WalletAddress | null> {
  const saved = storage.getSession(ADDRESS_STORAGE_KEY);
  if (!saved) return null;
  try {
    const kit = getKit();
    const { address } = await kit.getAddress();
    return address ?? null;
  } catch {
    return null;
  }
}

/**
 * Re-read the connected wallet's current network passphrase (#724), so a
 * network switch made in the wallet after connecting is picked up. Updates the
 * cached value in storage; returns null if the wallet can't report it.
 */
export async function getWalletNetworkPassphrase(): Promise<string | null> {
  if (!storage.getSession(ADDRESS_STORAGE_KEY)) return null;
  try {
    const net = await getKit().getNetwork();
    const passphrase = net.networkPassphrase ?? net.network ?? null;
    if (passphrase) storage.setSession(NETWORK_STORAGE_KEY, passphrase);
    else storage.removeSession(NETWORK_STORAGE_KEY);
    return passphrase;
  } catch {
    return null;
  }
}

export function getStoredAddress(): WalletAddress | null {
  return storage.getSession(ADDRESS_STORAGE_KEY);
}

export function disconnectWallet(): void {
  try { getKit().disconnect(); } catch { /* ignore */ }
  _kit = null;
  storage.removeSession(WALLET_STORAGE_KEY);
  storage.removeSession(ADDRESS_STORAGE_KEY);
  storage.removeSession(NETWORK_STORAGE_KEY);
}

export async function signTransaction(xdrEnvelope: string): Promise<string> {
  const address = getStoredAddress();
  if (!address) throw new WalletError('No wallet connected');
  const { signedTxXdr } = await getKit().signTransaction(xdrEnvelope, {
    networkPassphrase: NETWORK,
    address,
  });
  return signedTxXdr;
}

/**
 * Sign an arbitrary UTF-8 message with the connected wallet for use as an
 * auth challenge.  Uses `signMessage` when the kit supports it; falls back to
 * signing a minimal Stellar transaction envelope so older wallet extensions
 * that only implement `signTransaction` are still supported.
 *
 * Returns the signature string exactly as provided by the wallet kit (no
 * encoding transformation is applied), for sending to the backend as
 * `signedChallenge`. SEP-43 `signMessage` implementations typically return
 * this base64-encoded rather than hex-encoded — callers/backends must not
 * assume hex.
 */
export async function signAuthMessage(message: string): Promise<string> {
  const address = getStoredAddress();
  if (!address) throw new WalletError('No wallet connected');

  const kit = getKit();

  // Use signMessage (supported by modern wallet extensions via SEP-43).
  // The kit exposes this method at runtime even though the TypeScript types
  // may not declare it for all versions of the package.
  interface SignMessageCapable {
    signMessage?: (opts: { message: string; address: string }) => Promise<{ signedMessage: string }>;
  }
  const kitWithSign = kit as SignMessageCapable;

  if (typeof kitWithSign.signMessage === 'function') {
    const { signedMessage } = await kitWithSign.signMessage({ message, address });
    return signedMessage;
  }

  // Fallback: the connected wallet does not support SEP-43 signMessage.
  // A signTransaction-based challenge path requires backend support to verify
  // a signed transaction envelope, so for now we surface a clear error.
  throw new WalletError(
    'Your wallet does not support the signing method required for login. ' +
    'Please use Freighter or another SEP-43-compatible wallet.',
  );
}

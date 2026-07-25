import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockSignMessage = vi.fn();
const mockDisconnect  = vi.fn();

vi.mock('@creit.tech/stellar-wallets-kit', () => ({
  StellarWalletsKit: vi.fn().mockImplementation(() => ({
    signMessage:     mockSignMessage,
    disconnect:      mockDisconnect,
    setWallet:       vi.fn(),
    openModal:       vi.fn(),
    getAddress:      vi.fn(),
    getNetwork:      vi.fn(),
    signTransaction: vi.fn(),
  })),
  WalletNetwork: {
    PUBLIC:  'Public Global Stellar Network ; September 2015',
    TESTNET: 'Test SDF Network ; September 2015',
  },
  allowAllModules: vi.fn(() => []),
}));

import {
  EXPECTED_NETWORK_PASSPHRASE,
  getStoredAddress,
  disconnectWallet,
  signAuthMessage,
} from '../lib/stellar';
import { WalletError } from '../lib/errors';
import storage from '../lib/storage';
import {
  ADDRESS_STORAGE_KEY,
  WALLET_STORAGE_KEY,
  NETWORK_STORAGE_KEY,
} from '../lib/constants';

describe('stellar helpers', () => {
  beforeEach(() => {
    storage.remove(WALLET_STORAGE_KEY);
    storage.remove(ADDRESS_STORAGE_KEY);
    storage.remove(NETWORK_STORAGE_KEY);
    vi.clearAllMocks();
  });

  describe('EXPECTED_NETWORK_PASSPHRASE', () => {
    it('is a non-empty string', () => {
      expect(typeof EXPECTED_NETWORK_PASSPHRASE).toBe('string');
      expect(EXPECTED_NETWORK_PASSPHRASE.length).toBeGreaterThan(0);
    });

    it('equals the Testnet passphrase when STELLAR_NETWORK defaults to TESTNET', () => {
      // In test environments NEXT_PUBLIC_STELLAR_NETWORK is unset, so STELLAR_NETWORK
      // falls back to 'TESTNET' and EXPECTED_NETWORK_PASSPHRASE must match exactly.
      expect(EXPECTED_NETWORK_PASSPHRASE).toBe('Test SDF Network ; September 2015');
    });
  });

  describe('getStoredAddress', () => {
    it('returns null when no address has been persisted', () => {
      expect(getStoredAddress()).toBeNull();
    });

    it('returns the address written by the connect flow', () => {
      storage.set(ADDRESS_STORAGE_KEY, 'GABCDEF1234567890');
      expect(getStoredAddress()).toBe('GABCDEF1234567890');
    });
  });

  describe('disconnectWallet', () => {
    it('removes the wallet-id, address, and network keys from storage', () => {
      storage.set(WALLET_STORAGE_KEY,  'freighter');
      storage.set(ADDRESS_STORAGE_KEY, 'GTEST');
      storage.set(NETWORK_STORAGE_KEY, 'testnet');

      disconnectWallet();

      expect(storage.get(WALLET_STORAGE_KEY)).toBeNull();
      expect(storage.get(ADDRESS_STORAGE_KEY)).toBeNull();
      expect(storage.get(NETWORK_STORAGE_KEY)).toBeNull();
    });
  });

  describe('signAuthMessage', () => {
    it('throws WalletError when no wallet address is stored', async () => {
      await expect(signAuthMessage('challenge')).rejects.toThrow(WalletError);
    });

    it('passes through the signedMessage returned by kit.signMessage', async () => {
      storage.set(ADDRESS_STORAGE_KEY, 'GTEST123');
      storage.set(WALLET_STORAGE_KEY,  'freighter');
      mockSignMessage.mockResolvedValueOnce({ signedMessage: 'base64sig==' });

      const result = await signAuthMessage('my-challenge-nonce');

      expect(result).toBe('base64sig==');
      expect(mockSignMessage).toHaveBeenCalledWith({
        message: 'my-challenge-nonce',
        address: 'GTEST123',
      });
    });

    it('returns the raw base64 value without any encoding transformation', async () => {
      // signAuthMessage must return exactly what the wallet kit provides.
      // SEP-43 wallets return base64, not hex. The backend owns decoding.
      storage.set(ADDRESS_STORAGE_KEY, 'GTEST123');
      storage.set(WALLET_STORAGE_KEY,  'freighter');
      const b64 = 'aGVsbG8gd29ybGQ=';
      mockSignMessage.mockResolvedValueOnce({ signedMessage: b64 });

      expect(await signAuthMessage('challenge')).toBe(b64);
    });
  });
});

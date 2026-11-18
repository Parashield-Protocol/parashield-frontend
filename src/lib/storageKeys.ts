/**
 * Single registry of every browser-storage key the app reads or writes.
 * See docs/STORAGE.md for what each one holds and why.
 *
 * - Every first-party key lives under STORAGE_PREFIX, so the whole footprint
 *   can be audited and wiped by prefix. Don't write a raw string key anywhere
 *   else: add it here and to docs/STORAGE.md (storageKeys.test.ts enforces it).
 * - Anything tied to the wallet or session goes in sessionStorage, so it never
 *   outlives the tab. localStorage only holds non-identifying UI preferences.
 */
export const STORAGE_PREFIX = 'ps_';

export const STORAGE_KEYS = {
  // sessionStorage: wallet / session data, also wiped on logout (#687).
  authToken:              'ps_auth_token',
  walletId:               'ps_wallet_id',
  walletAddress:          'ps_wallet_address',
  walletNetwork:          'ps_wallet_network',
  testnetBannerDismissed: 'ps_testnet_banner_dismissed',
  // localStorage: UI preferences, deliberately kept across logout.
  theme:                  'ps_theme',
  categoryFilter:         'ps_category_filter',
} as const;

/**
 * Written by @creit.tech/stellar-wallets-kit itself (the wallets this browser
 * has used, for ordering its picker). We can't rename it, so it is cleared on
 * logout instead.
 */
export const WALLET_KIT_STORAGE_KEY = '@StellarWalletsKit/usedWalletsIds';

/**
 * Non-reversible, deterministic fingerprint of a string (cyrb53, 53-bit).
 * Used to scope browser-storage keys per wallet without writing the raw
 * address into the key name, where it is visible to anyone inspecting
 * DevTools > Application > Storage (#548). Not a cryptographic hash -- it only
 * needs to be stable and collision-resistant across a handful of wallets.
 */
export function fingerprint(value: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < value.length; i++) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** sessionStorage key for the policy IDs already warned about for a wallet. */
export function expiryNotifiedStorageKey(address: string): string {
  return `${EXPIRY_NOTIFIED_PREFIX}${fingerprint(address)}`;
}

/** Prefix shared by every wallet's expiry-warning key, for logout cleanup (#687). */
export const EXPIRY_NOTIFIED_PREFIX = `${STORAGE_PREFIX}expiry_notified_`;

/** Wallet keys that used to live in localStorage and now live in sessionStorage. */
const WALLET_KEYS_MOVED_TO_SESSION = [
  STORAGE_KEYS.walletId,
  STORAGE_KEYS.walletAddress,
  STORAGE_KEYS.walletNetwork,
] as const;

/** Old key names that predate the shared prefix. */
const RENAMED_SESSION_KEYS: Record<string, string> = {
  parashield_testnet_banner_dismissed: STORAGE_KEYS.testnetBannerDismissed,
};

/**
 * One-time cleanup of storage written by older builds. Safe to call on every
 * load: it is a no-op once nothing legacy is left.
 *
 * - Wallet id/address/network are removed from localStorage, where the raw
 *   address used to linger indefinitely after the tab closed. If this tab
 *   still has a live session they are carried over to sessionStorage first,
 *   so nobody is logged out by the upgrade.
 * - Keys from before the `ps_` prefix are renamed.
 */
export function migrateLegacyStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const hasSession = sessionStorage.getItem(STORAGE_KEYS.authToken) !== null;
    for (const key of WALLET_KEYS_MOVED_TO_SESSION) {
      const legacy = localStorage.getItem(key);
      if (legacy === null) continue;
      if (hasSession && sessionStorage.getItem(key) === null) sessionStorage.setItem(key, legacy);
      localStorage.removeItem(key);
    }
    for (const [oldKey, newKey] of Object.entries(RENAMED_SESSION_KEYS)) {
      const legacy = sessionStorage.getItem(oldKey);
      if (legacy === null) continue;
      if (sessionStorage.getItem(newKey) === null) sessionStorage.setItem(newKey, legacy);
      sessionStorage.removeItem(oldKey);
    }
  } catch {
    // Storage disabled (private mode) -- nothing to migrate.
  }
}

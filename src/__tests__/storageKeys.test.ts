import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  fingerprint,
  expiryNotifiedStorageKey,
  migrateLegacyStorage,
  EXPIRY_NOTIFIED_PREFIX,
  STORAGE_KEYS,
  STORAGE_PREFIX,
  WALLET_KIT_STORAGE_KEY,
} from '../lib/storageKeys';

const ROOT = resolve(__dirname, '../..');

const WALLET_A = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
const WALLET_B = 'GCKFBEIYTKP5RDBQMTVVALONAOPBXICILMAFL6ANEHMIYX7XFBZ7ZMGT';

describe('storageKeys (#548)', () => {
  it('does not include the raw wallet address in the expiry storage key', () => {
    const key = expiryNotifiedStorageKey(WALLET_A);
    expect(key.startsWith('ps_expiry_notified_')).toBe(true);
    expect(key).not.toContain(WALLET_A);
    expect(key).not.toContain(WALLET_A.slice(0, 8));
  });

  it('is deterministic per wallet so notifications persist across renders', () => {
    expect(expiryNotifiedStorageKey(WALLET_A)).toBe(expiryNotifiedStorageKey(WALLET_A));
  });

  it('gives different wallets different keys', () => {
    expect(expiryNotifiedStorageKey(WALLET_A)).not.toBe(expiryNotifiedStorageKey(WALLET_B));
    expect(fingerprint('a')).not.toBe(fingerprint('b'));
  });
});

describe('storage key registry', () => {
  it('namespaces every first-party key under the shared prefix, with no duplicates', () => {
    const keys = Object.values(STORAGE_KEYS);
    for (const key of keys) expect(key.startsWith(STORAGE_PREFIX)).toBe(true);
    expect(EXPIRY_NOTIFIED_PREFIX.startsWith(STORAGE_PREFIX)).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('documents every key in docs/STORAGE.md', () => {
    const doc = readFileSync(join(ROOT, 'docs/STORAGE.md'), 'utf8');
    for (const key of [...Object.values(STORAGE_KEYS), WALLET_KIT_STORAGE_KEY]) {
      expect(doc, `${key} missing from docs/STORAGE.md`).toContain(`\`${key}`);
    }
    expect(doc).toContain(`\`${EXPIRY_NOTIFIED_PREFIX}`);
  });

  // Audit: no raw storage key string may appear outside the registry, so a
  // new key can't be added without going through storageKeys.ts.
  it('no source file outside the registry uses a raw storage key', () => {
    const offenders: string[] = [];
    const rawKey = /['"`](ps_|parashield_|eduvault_)\w*/;
    const literalAccess = /(localStorage|sessionStorage)\.(get|set|remove)Item\(\s*['"`]/;
    for (const file of sourceFiles(join(ROOT, 'src'))) {
      if (file.endsWith('lib/storageKeys.ts')) continue;
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (/^\s*(\*|\/\/)/.test(line)) return; // comments
        if (rawKey.test(line) || literalAccess.test(line)) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe('migrateLegacyStorage', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it('removes wallet data from localStorage when there is no live session', () => {
    localStorage.setItem('ps_wallet_address', WALLET_A);
    localStorage.setItem('ps_wallet_id', 'freighter');
    localStorage.setItem('ps_theme', 'light');

    migrateLegacyStorage();

    expect(localStorage.getItem('ps_wallet_address')).toBeNull();
    expect(localStorage.getItem('ps_wallet_id')).toBeNull();
    expect(sessionStorage.getItem('ps_wallet_address')).toBeNull();
    // Preferences are left alone.
    expect(localStorage.getItem('ps_theme')).toBe('light');
  });

  it('carries wallet data into sessionStorage when the tab still has a session', () => {
    sessionStorage.setItem(STORAGE_KEYS.authToken, 'jwt');
    localStorage.setItem('ps_wallet_address', WALLET_A);
    localStorage.setItem('ps_wallet_network', 'Test SDF Network ; September 2015');

    migrateLegacyStorage();

    expect(localStorage.getItem('ps_wallet_address')).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.walletAddress)).toBe(WALLET_A);
    expect(sessionStorage.getItem(STORAGE_KEYS.walletNetwork)).toBe('Test SDF Network ; September 2015');
  });

  it('renames the pre-namespace testnet banner key', () => {
    sessionStorage.setItem('parashield_testnet_banner_dismissed', '1');

    migrateLegacyStorage();

    expect(sessionStorage.getItem('parashield_testnet_banner_dismissed')).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.testnetBannerDismissed)).toBe('1');
  });
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

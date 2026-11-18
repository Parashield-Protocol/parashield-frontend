import { STORAGE_KEYS } from './storageKeys';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const _rawNetwork = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'TESTNET')
  .trim()
  .toUpperCase() as 'TESTNET' | 'PUBLIC' | 'MAINNET';

if (_rawNetwork !== 'TESTNET' && _rawNetwork !== 'PUBLIC') {
  console.warn(
    `[parashield] Unrecognised NEXT_PUBLIC_STELLAR_NETWORK "${process.env.NEXT_PUBLIC_STELLAR_NETWORK}". ` +
    'Expected "TESTNET" or "PUBLIC". Falling back to TESTNET.',
  );
}

export const STELLAR_NETWORK: 'TESTNET' | 'PUBLIC' =
  _rawNetwork === 'PUBLIC' || _rawNetwork === 'MAINNET' ? 'PUBLIC' : 'TESTNET';

/**
 * Single source of truth for everything derived from the active Stellar
 * network (#489). Import these instead of re-checking
 * `STELLAR_NETWORK === 'PUBLIC'` in individual modules/components.
 */
export const IS_MAINNET = STELLAR_NETWORK === 'PUBLIC';

export const NETWORK_PASSPHRASES = {
  PUBLIC:  'Public Global Stellar Network ; September 2015',
  TESTNET: 'Test SDF Network ; September 2015',
} as const;

/** Passphrase transactions are built/signed with and wallets must match. */
export const NETWORK_PASSPHRASE: string = NETWORK_PASSPHRASES[STELLAR_NETWORK];

/** Human-readable name of the app's network. */
export const NETWORK_LABEL = IS_MAINNET ? 'Mainnet' : 'Testnet';

/** Human-readable name for an arbitrary wallet-reported passphrase. */
export function networkLabelForPassphrase(passphrase: string | null): string {
  if (passphrase === NETWORK_PASSPHRASES.PUBLIC)  return 'Mainnet';
  if (passphrase === NETWORK_PASSPHRASES.TESTNET) return 'Testnet';
  return 'an unsupported network';
}

export const EXPLORER_TX_BASE_URL = IS_MAINNET
  ? 'https://stellar.expert/explorer/public/tx/'
  : 'https://stellar.expert/explorer/testnet/tx/';

export const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ??
  (IS_MAINNET
    ? 'https://soroban.stellar.org'
    : 'https://soroban-testnet.stellar.org');

export const STROOPS_PER_UNIT = 10_000_000n;

// Minimum deposit: 0.01 USDC (100,000 stroops)
// At STROOPS_PER_UNIT = 10_000_000n, 100_000n stroops = 0.01 USDC.
// This prevents dust deposits that may round to 0 or be rejected by the pool contract.
export const MIN_DEPOSIT_STROOPS = 100_000n;

// Minimum withdrawal: 0.01 LP shares (100,000 stroops), matching the deposit
// floor so dust withdrawals that round to 0 USDC or fail on chain are blocked
// client-side. A holder whose entire balance is below this can still withdraw
// all of it, so small positions are never stuck.
export const MIN_WITHDRAW_STROOPS = 100_000n;

const _CONTRACT_RE = /^C[A-Z2-7]{55}$/;

function validateContractId(envKey: string, label: string): string {
  const raw = process.env[envKey] ?? '';
  const id = raw.trim();
  if (!id) {
    throw new Error(
      `[parashield] ${label} (${envKey}) is not set. ` +
      `Add ${envKey}=<contract_id> to your .env file and restart the app.`,
    );
  }
  if (!_CONTRACT_RE.test(id)) {
    throw new Error(
      `[parashield] ${label} (${envKey}) is invalid: "${id}". ` +
      'Expected a Stellar contract ID (starts with C, 56 alphanumeric characters).',
    );
  }
  return id;
}

export const POLICY_CONTRACT_ID =
  process.env.NEXT_PUBLIC_POLICY_CONTRACT_ID ?? '';

export const CLAIMS_CONTRACT_ID =
  process.env.NEXT_PUBLIC_CLAIMS_CONTRACT_ID ?? '';

/**
 * Warn (never throw) if a required contract ID is missing or malformed.
 * Call once at app startup (e.g. from layout.tsx) so misconfiguration is
 * loudly logged instead of surfacing silently deep in a purchase/claim flow.
 *
 * Deliberately non-fatal (#454): `layout.tsx` evaluates this at module load,
 * which Next.js also runs during `next build` to statically analyze routes --
 * throwing here previously crashed the entire build (and blocked preview
 * deployments and local dev) whenever contract-ID env vars weren't set,
 * which is expected for those environments. Logging keeps genuine
 * misconfiguration visible in server logs without blocking the build.
 */
export function validateConfig(): void {
  for (const [envKey, label] of [
    ['NEXT_PUBLIC_POLICY_CONTRACT_ID', 'Policy Contract ID'],
    ['NEXT_PUBLIC_ORACLE_CONTRACT_ID', 'Oracle Contract ID'],
    ['NEXT_PUBLIC_CLAIMS_CONTRACT_ID', 'Claims Contract ID'],
  ] as const) {
    try {
      validateContractId(envKey, label);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
    }
  }
}

import type { Category, PolicyStatus, ClaimStatus } from '@/types';

export const CATEGORY_LABELS: Record<Category, string> = {
  crop:     'Crop Insurance',
  flight:   'Flight Delay',
  disaster: 'Natural Disaster',
  health:   'Health',
  defi:     'DeFi Cover',
};

export const CATEGORY_ICONS: Record<Category, string> = {
  crop:     '🌾',
  flight:   '✈️',
  disaster: '🌪️',
  health:   '🏥',
  defi:     '🔐',
};

export const STATUS_COLOURS: Record<PolicyStatus | ClaimStatus, string> = {
  Active:     'emerald',
  Expired:    'gray',
  Claimed:    'sky',
  Cancelled:  'red',
  Pending:    'amber',
  Processing: 'sky',
  Paid:       'emerald',
  Rejected:   'red',
};

// Defined in the storage-key registry; re-exported for existing callers.
export const WALLET_STORAGE_KEY     = STORAGE_KEYS.walletId;
export const ADDRESS_STORAGE_KEY    = STORAGE_KEYS.walletAddress;
export const NETWORK_STORAGE_KEY    = STORAGE_KEYS.walletNetwork;
export const AUTH_TOKEN_STORAGE_KEY = STORAGE_KEYS.authToken;

export const TOAST_DEFAULT_DURATION_MS = 4000;
export const COPY_FEEDBACK_DURATION_MS  = 2000;
export const POLLING_INTERVAL_MS       = 30_000;
export const ORACLE_REFRESH_INTERVAL_MS = 60_000;
export const CLAIMS_REFRESH_INTERVAL_MS = 15_000;
export const CLAIM_POLL_INTERVAL_MS    = 3000;
export const CLAIM_POLL_MAX_ATTEMPTS   = 20;

/**
 * Hard input length caps (#736). Enforced both via `maxLength` on the field
 * and in submit-time validation, so a paste or programmatic set cannot smuggle
 * unbounded strings into the UI or API.
 */
export const MAX_INPUT_LENGTHS = {
  /** Search queries. */
  search: 80,
  /** Short free-text labels (wallet label, policy label). */
  label: 64,
  /** Flight numbers / PNR-style references. */
  reference: 16,
  /** Oracle parameter strings like "rainfall:1.5,36.8:2026-06". */
  oracleParams: 64,
  /** Numeric amount strings (covers "123456.78" with headroom). */
  amount: 16,
} as const;

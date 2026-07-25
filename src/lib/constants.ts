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

export const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ??
  (STELLAR_NETWORK === 'PUBLIC'
    ? 'https://soroban.stellar.org'
    : 'https://soroban-testnet.stellar.org');

export const STROOPS_PER_UNIT = 10_000_000n;

// Minimum deposit: 0.01 USDC (100,000 stroops)
// At STROOPS_PER_UNIT = 10_000_000n, 100_000n stroops = 0.01 USDC.
// This prevents dust deposits that may round to 0 or be rejected by the pool contract.
export const MIN_DEPOSIT_STROOPS = 100_000n;

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
 * Validate that all required contract IDs are present and well-formed.
 * Call once at app startup (e.g. from layout.tsx) so misconfiguration
 * fails fast with a clear message instead of deep in a purchase/claim flow.
 */
export function validateConfig(): void {
  validateContractId('NEXT_PUBLIC_POLICY_CONTRACT_ID', 'Policy Contract ID');
  validateContractId('NEXT_PUBLIC_ORACLE_CONTRACT_ID', 'Oracle Contract ID');
  validateContractId('NEXT_PUBLIC_CLAIMS_CONTRACT_ID', 'Claims Contract ID');
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

export const WALLET_STORAGE_KEY   = 'ps_wallet_id';
export const ADDRESS_STORAGE_KEY  = 'ps_wallet_address';
export const NETWORK_STORAGE_KEY  = 'ps_wallet_network';
export const AUTH_TOKEN_STORAGE_KEY = 'ps_auth_token';

export const TOAST_DEFAULT_DURATION_MS = 4000;
export const POLLING_INTERVAL_MS       = 30_000;
export const ORACLE_REFRESH_INTERVAL_MS = 60_000;
export const CLAIMS_REFRESH_INTERVAL_MS = 15_000;

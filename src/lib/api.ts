import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { ApiError } from './errors';
import { API_URL, AUTH_TOKEN_STORAGE_KEY } from './constants';
import storage from './storage';
import type { Product, Policy, Claim, OracleReading, PoolStats, PoolShareInfo, ProtocolStats, ApiResponse, PaginatedResponse } from '@/types';

let onAuthError: (() => void) | null = null;

export function setAuthErrorHandler(handler: () => void): void {
  onAuthError = handler;
}

const client = axios.create({ baseURL: API_URL, timeout: 60_000 });

client.interceptors.request.use((config) => {
  const token = storage.getSession(AUTH_TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ message?: string; error?: string }>) => {
    const status  = err.response?.status ?? 0;
    if (status === 401) {
      storage.removeSession(AUTH_TOKEN_STORAGE_KEY);
      if (onAuthError) onAuthError();
    }
    const message = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
    throw new ApiError(message, status);
  },
);

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); }
    catch (err) {
      lastErr = err;
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) throw err;
      if (i < retries) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

// A 2xx HTTP status only means the request reached the server — the backend
// can still report a logical failure via { success: false, error } in the
// body (e.g. invalid signature). Without this check, callers destructure
// `data.data` as if it were the real payload and get a TypeError instead of
// the actual backend error (issue #198).
function unwrap<T>(data: ApiResponse<T>, status: number): T {
  if (!data.success) {
    throw new ApiError(data.error ?? 'Request failed', status);
  }
  return data.data;
}

function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return withRetry(async () => {
    const res = await client.get<ApiResponse<T>>(url, config);
    return unwrap(res.data, res.status);
  });
}

// POST is intentionally fire-once — retries on state-mutating requests can
// cause duplicate side-effects (e.g. double policy purchase) if the server
// processed the first attempt but the response was lost (issue #130).
function post<T>(url: string, body: unknown): Promise<T> {
  return client.post<ApiResponse<T>>(url, body).then((res) => unwrap(res.data, res.status));
}

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * Fetch a server-issued nonce for the given wallet address (issue #131).
 *
 * The nonce MUST come from the server — a client-generated nonce defeats the
 * challenge-response security model and allows replay attacks. All errors
 * (network failures, 404, 5xx) propagate to the caller so the connect-wallet
 * flow can display a meaningful error rather than silently accepting a
 * client-forged challenge.
 */
export function fetchChallenge(wallet: string): Promise<string> {
  return get<string>(`/auth/challenge?wallet=${encodeURIComponent(wallet)}`);
}

export function login(wallet: string, signedChallenge: string): Promise<{ token: string }> {
  return post('/auth/login', { wallet, signedChallenge });
}

// ── Products ──────────────────────────────────────────────────────────────────

export function fetchProducts(): Promise<Product[]> {
  return get<Product[]>('/policies/products');
}

export function fetchProduct(id: string): Promise<Product> {
  return get<Product>(`/policies/products/${id}`);
}

// ── Policies ──────────────────────────────────────────────────────────────────

export function fetchUserPolicies(wallet: string): Promise<Policy[]> {
  return get<Policy[]>('/policies', { params: { wallet } });
}

export function fetchPolicy(id: string): Promise<Policy> {
  return get<Policy>(`/policies/${id}`);
}

export interface BuyPolicyPayload {
  productId:  string;
  coverage:   string;
  oracleKey:  string;
  duration:   number;
  wallet:     string;
  signedXdr:  string;
}

export function buyPolicy(payload: BuyPolicyPayload): Promise<{ policyId: string; txHash: string }> {
  return post('/policies/buy', payload);
}

// ── Claims ────────────────────────────────────────────────────────────────────

export function fetchUserClaims(wallet: string): Promise<Claim[]> {
  return get<Claim[]>('/claims', { params: { wallet } });
}

export function fetchClaim(claimId: string): Promise<Claim | null> {
  return get<Claim>(`/claims/${claimId}`).catch((err) => {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  });
}

export function submitClaim(claimant: string, policyId: string): Promise<string> {
  return post<{ claimId: string }>('/claims', { claimant, policyId })
    .then((d) => d.claimId);
}

// ── Oracle ────────────────────────────────────────────────────────────────────

export function fetchOracleReading(key: string): Promise<OracleReading | null> {
  return get<OracleReading>('/oracle/reading', { params: { key } }).catch((err) => {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  });
}

export function fetchRainfallPreview(
  lat: number, lng: number, year: number, month: number,
): Promise<{ value: string; confidence: number }> {
  return get('/oracle/rainfall', { params: { lat, lng, year, month } });
}

export function fetchAllOracleReadings(): Promise<OracleReading[]> {
  return get<OracleReading[]>('/oracle/readings');
}

// ── Pools ─────────────────────────────────────────────────────────────────────

export function fetchPoolStats(): Promise<PoolStats[]> {
  return get<PoolStats[]>('/pools');
}

export function fetchPoolById(poolId: string): Promise<PoolStats> {
  return get<PoolStats>(`/pools/${poolId}`);
}

export function fetchPoolShares(poolId: string): Promise<PoolShareInfo> {
  return get<PoolShareInfo>(`/pools/${poolId}/shares`);
}

// ── Protocol stats ────────────────────────────────────────────────────────────

export function fetchProtocolStats(): Promise<ProtocolStats> {
  return Promise.all([
    get<{ totalCoverage: string }>('/policies/stats'),
    get<{ totalPayouts: string }>('/claims/stats'),
  ]).then(([policies, claims]) => ({
    totalCoverage: policies.totalCoverage,
    totalPayouts:    claims.totalPayouts,
    activeProducts:  0,
  }));
}

import type { Policy } from '@/types';

/**
 * In-memory cache of single-policy reads used by `usePolicy` (#730).
 *
 * Entries expire after `POLICY_CACHE_TTL_MS`, and every policy mutation
 * (purchase, claim) must call `invalidatePolicyCache` so a page never shows
 * pre-mutation data from the cache. Keys carry `POLICY_CACHE_VERSION`; bump it
 * when the `Policy` shape changes so old entries are never read back.
 */
export const POLICY_CACHE_TTL_MS = 30_000;
export const POLICY_CACHE_VERSION = 1;

const cache = new Map<string, { data: Policy; ts: number }>();
const key = (id: string) => `v${POLICY_CACHE_VERSION}:${id}`;

export function getCachedPolicy(id: string, now = Date.now()): Policy | null {
  const entry = cache.get(key(id));
  if (!entry) return null;
  if (now - entry.ts >= POLICY_CACHE_TTL_MS) {
    cache.delete(key(id));
    return null;
  }
  return entry.data;
}

export function setCachedPolicy(id: string, data: Policy, now = Date.now()): void {
  cache.set(key(id), { data, ts: now });
}

/** Drop one policy, or every cached policy when no id is given. */
export function invalidatePolicyCache(id?: string): void {
  if (id === undefined) cache.clear();
  else cache.delete(key(id));
}

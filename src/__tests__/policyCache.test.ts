import { describe, it, expect, beforeEach } from 'vitest';
import {
  POLICY_CACHE_TTL_MS,
  getCachedPolicy,
  invalidatePolicyCache,
  setCachedPolicy,
} from '../lib/policyCache';
import type { Policy } from '@/types';

const policy = (id: string) => ({ id }) as unknown as Policy;

describe('policyCache (#730)', () => {
  beforeEach(() => invalidatePolicyCache());

  it('serves a fresh entry and expires it after the TTL', () => {
    setCachedPolicy('p1', policy('p1'), 1_000);
    expect(getCachedPolicy('p1', 1_000 + POLICY_CACHE_TTL_MS - 1)).toEqual(policy('p1'));
    expect(getCachedPolicy('p1', 1_000 + POLICY_CACHE_TTL_MS)).toBeNull();
  });

  it('invalidates a single policy', () => {
    setCachedPolicy('p1', policy('p1'));
    setCachedPolicy('p2', policy('p2'));
    invalidatePolicyCache('p1');
    expect(getCachedPolicy('p1')).toBeNull();
    expect(getCachedPolicy('p2')).toEqual(policy('p2'));
  });

  it('invalidates everything when no id is given (e.g. after a purchase)', () => {
    setCachedPolicy('p1', policy('p1'));
    setCachedPolicy('p2', policy('p2'));
    invalidatePolicyCache();
    expect(getCachedPolicy('p1')).toBeNull();
    expect(getCachedPolicy('p2')).toBeNull();
  });
});

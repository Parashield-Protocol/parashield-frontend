import { describe, expect, it } from 'vitest';
import type { Product } from '@/types';
import { combineProtocolStats } from '../api';

const ok = <T,>(value: T): PromiseFulfilledResult<T> => ({ status: 'fulfilled', value });
const fail = (reason = new Error('500')): PromiseRejectedResult => ({ status: 'rejected', reason });

const products = [
  { id: 'a', status: 'Active' },
  { id: 'b', status: 'Paused' },
  { id: 'c', status: 'Active' },
] as unknown as Product[];

describe('combineProtocolStats (#900)', () => {
  it('returns every metric when all sub-requests succeed', () => {
    expect(
      combineProtocolStats(ok({ totalCoverage: '100' }), ok({ totalPayouts: '7' }), ok(products)),
    ).toEqual({ totalCoverage: '100', totalPayouts: '7', activeProducts: 2 });
  });

  it('keeps the other metrics when the products endpoint fails', () => {
    expect(
      combineProtocolStats(ok({ totalCoverage: '100' }), ok({ totalPayouts: '7' }), fail()),
    ).toEqual({ totalCoverage: '100', totalPayouts: '7', activeProducts: null });
  });

  it('nulls only the failed metric', () => {
    expect(
      combineProtocolStats(fail(), ok({ totalPayouts: '7' }), ok(products)),
    ).toEqual({ totalCoverage: null, totalPayouts: '7', activeProducts: 2 });
  });

  it('rejects only when every sub-request failed', () => {
    const reason = new Error('backend down');
    expect(() => combineProtocolStats(fail(reason), fail(), fail())).toThrow(reason);
  });
});

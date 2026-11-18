import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rpc as StellarRpc } from '@stellar/stellar-sdk';
import { confirmTransaction, getRpc } from '../contract';
import { ContractError } from '../errors';

const getTransaction = vi.fn();

vi.mock('../stellar', () => ({ signTransaction: vi.fn() }));
vi.mock('../policyCache', () => ({ invalidatePolicyCache: vi.fn() }));

vi.mock('@stellar/stellar-sdk', () => ({
  Contract: vi.fn(),
  Operation: { restoreFootprint: vi.fn() },
  TransactionBuilder: vi.fn(),
  BASE_FEE: '100',
  nativeToScVal: vi.fn(),
  scValToNative: vi.fn(),
  xdr: {},
  rpc: {
    Server: vi.fn(),
    Api: { GetTransactionStatus: { SUCCESS: 'SUCCESS', FAILED: 'FAILED', NOT_FOUND: 'NOT_FOUND' } },
  },
}));

const ServerMock = vi.mocked(StellarRpc.Server);

beforeEach(() => {
  getTransaction.mockReset();
  ServerMock.mockReset();
  ServerMock.mockImplementation(function (this: unknown, url: string) {
    return { url, getTransaction } as never;
  } as never);
});

describe('getRpc() (#903)', () => {
  it('reuses the server for the same URL and rebuilds it when the URL changes', () => {
    const first = getRpc('https://rpc-a.example');
    expect(getRpc('https://rpc-a.example')).toBe(first);

    const second = getRpc('https://rpc-b.example');
    expect(second).not.toBe(first);
    expect(ServerMock).toHaveBeenLastCalledWith('https://rpc-b.example');
  });
});

describe('confirmTransaction() (#904)', () => {
  afterEach(() => vi.useRealTimers());

  it('returns the hash once the transaction succeeds', async () => {
    getTransaction.mockResolvedValue({ status: 'SUCCESS' });
    await expect(confirmTransaction('h1')).resolves.toBe('h1');
  });

  it('throws a ContractError when the transaction fails on-chain', async () => {
    getTransaction.mockResolvedValue({ status: 'FAILED', resultXdr: 'xdr' });
    await expect(confirmTransaction('h2')).rejects.toThrow(ContractError);
    await expect(confirmTransaction('h2')).rejects.toThrow('Transaction failed on-chain.');
  });

  it('times out with the shared message after the given budget', async () => {
    vi.useFakeTimers();
    getTransaction.mockResolvedValue({ status: 'NOT_FOUND' });

    const pending = confirmTransaction('h3', 6_000);
    const assertion = expect(pending).rejects.toThrow('Transaction not confirmed after 6s');
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
    // Polls at 0s, 3s and 6s, then gives up.
    expect(getTransaction).toHaveBeenCalledTimes(3);
  });
});

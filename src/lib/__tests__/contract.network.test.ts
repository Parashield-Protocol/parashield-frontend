import { describe, it, expect, vi } from 'vitest';

// #922 — a transport failure from simulateTransaction (offline, timeout,
// unreachable RPC) must surface as a friendly ContractError, not raw
// RPC/HTTP error text.
const { networkError } = vi.hoisted(() => ({
  networkError: new Error('fetch failed: connect ECONNREFUSED 10.0.0.1:443'),
}));

vi.mock('../stellar', () => ({
  signTransaction: vi.fn(),
}));

vi.mock('@stellar/stellar-sdk', () => {
  class TransactionBuilder {
    addOperation() {
      return this;
    }
    setTimeout() {
      return this;
    }
    build() {
      return {};
    }
  }
  class Contract {
    call() {
      return {};
    }
  }
  class Server {
    getAccount = vi.fn().mockResolvedValue({});
    simulateTransaction = vi.fn().mockRejectedValue(networkError);
  }
  return {
    Contract,
    TransactionBuilder,
    Operation: { restoreFootprint: vi.fn() },
    BASE_FEE: '100',
    nativeToScVal: vi.fn(),
    scValToNative: vi.fn(),
    xdr: {},
    rpc: {
      Server,
      Api: { isSimulationError: () => false, isSimulationRestore: () => false },
      assembleTransaction: vi.fn(),
    },
  };
});

const { buildBuyPolicyTx } = await import('../contract');
const { ContractError, toUserMessage } = await import('../errors');

describe('simulateAndAssemble network errors (#922)', () => {
  it('wraps a simulateTransaction transport failure in a ContractError', async () => {
    const promise = buildBuyPolicyTx('GWALLET', 'p1', 1n, 'rainfall:0,0:2026-06', 30);

    await expect(promise).rejects.toBeInstanceOf(ContractError);
    await expect(promise).rejects.toMatchObject({
      message: 'Unable to reach the Stellar network. Please check your connection and try again.',
      details: networkError,
    });
  });

  it('shows the user the friendly message, not the raw RPC text', async () => {
    const err = await buildBuyPolicyTx('GWALLET', 'p1', 1n, 'rainfall:0,0:2026-06', 30).catch(
      (e: unknown) => e,
    );

    expect(toUserMessage(err)).toContain('Unable to reach the Stellar network');
    expect(toUserMessage(err)).not.toContain('ECONNREFUSED');
  });
});

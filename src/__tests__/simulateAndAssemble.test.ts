/**
 * simulateAndAssemble error paths (#938) and the restore txBadSeq retry (#936).
 *
 * Only the RPC server and assembleTransaction are faked; the SDK's own
 * Api.isSimulationError / isSimulationRestore predicates and the real
 * TransactionBuilder are used, so the branch selection under test is the
 * library's, not a re-implementation.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Account,
  Keypair,
  Operation,
  SorobanDataBuilder,
  TransactionBuilder,
  type Transaction,
} from '@stellar/stellar-sdk';

const rpcMock = vi.hoisted(() => ({
  simulateTransaction: vi.fn(),
  getAccount: vi.fn(),
  sendTransaction: vi.fn(),
  getTransaction: vi.fn(),
  assembleTransaction: vi.fn(),
}));

vi.mock('@stellar/stellar-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@stellar/stellar-sdk')>();
  class FakeServer {
    simulateTransaction = rpcMock.simulateTransaction;
    getAccount = rpcMock.getAccount;
    sendTransaction = rpcMock.sendTransaction;
    getTransaction = rpcMock.getTransaction;
  }
  return {
    ...actual,
    rpc: { ...actual.rpc, Server: FakeServer, assembleTransaction: rpcMock.assembleTransaction },
  };
});

const signMock = vi.hoisted(() => vi.fn(async (xdr: string) => xdr));
vi.mock('../lib/stellar', () => ({ signTransaction: signMock }));

import { isBadSequenceError, restoreArchivedState, simulateAndAssemble } from '../lib/contract';
import { NETWORK_PASSPHRASE } from '../lib/constants';
import { ContractError, StateArchivedError } from '../lib/errors';

const SOURCE = Keypair.random().publicKey();

function buildTx(sequence = '1'): Transaction {
  return new TransactionBuilder(new Account(SOURCE, sequence), {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.restoreFootprint({}))
    .setTimeout(30)
    .build();
}

function buildRestoreXdr(sequence: string): string {
  return new TransactionBuilder(new Account(SOURCE, sequence), {
    fee: '600',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .setSorobanData(new SorobanDataBuilder().build())
    .addOperation(Operation.restoreFootprint({}))
    .setTimeout(60)
    .build()
    .toXDR();
}

function badSeq() {
  return { result: () => ({ switch: () => ({ name: 'txBadSeq' }) }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('simulateAndAssemble (#938)', () => {
  it('throws ContractError with the simulation error details on a simulation error', async () => {
    rpcMock.simulateTransaction.mockResolvedValue({
      error: 'HostError: contract call failed',
      events: [],
      latestLedger: 1,
    });

    const err = await simulateAndAssemble(buildTx(), 'Unable to prepare.').catch((e) => e);

    expect(err).toBeInstanceOf(ContractError);
    expect(err).not.toBeInstanceOf(StateArchivedError);
    expect(err.message).toBe('Unable to prepare.');
    expect(err.details).toBe('HostError: contract call failed');
    expect(rpcMock.assembleTransaction).not.toHaveBeenCalled();
  });

  it('throws StateArchivedError carrying a restore transaction when simulation asks for a restore', async () => {
    rpcMock.simulateTransaction.mockResolvedValue({
      transactionData: new SorobanDataBuilder(),
      minResourceFee: '100',
      latestLedger: 1,
      events: [],
      restorePreamble: { minResourceFee: '500', transactionData: new SorobanDataBuilder() },
    });
    rpcMock.getAccount.mockResolvedValue(new Account(SOURCE, '7'));

    const err = await simulateAndAssemble(buildTx(), 'Unable to prepare.').catch((e) => e);

    expect(err).toBeInstanceOf(StateArchivedError);
    expect(err.minResourceFee).toBe('500');
    const restore = TransactionBuilder.fromXDR(err.restoreXdr, NETWORK_PASSPHRASE) as Transaction;
    expect(restore.source).toBe(SOURCE);
    expect(restore.sequence).toBe('8');
    expect(restore.operations[0].type).toBe('restoreFootprint');
    expect(rpcMock.assembleTransaction).not.toHaveBeenCalled();
  });

  it('returns the assembled transaction on success', async () => {
    const sim = { transactionData: new SorobanDataBuilder(), minResourceFee: '100', latestLedger: 1, events: [] };
    rpcMock.simulateTransaction.mockResolvedValue(sim);
    const assembled = buildTx('41');
    rpcMock.assembleTransaction.mockReturnValue({ build: () => assembled });
    const tx = buildTx();

    await expect(simulateAndAssemble(tx, 'Unable to prepare.')).resolves.toBe(assembled);
    expect(rpcMock.assembleTransaction).toHaveBeenCalledWith(tx, sim);
  });

  // Current behaviour, pinned so a fix for #922 is a visible change: a
  // transport failure from simulateTransaction propagates unchanged.
  it('lets a network error from simulateTransaction propagate unchanged (see #922)', async () => {
    const networkError = new TypeError('fetch failed');
    rpcMock.simulateTransaction.mockRejectedValue(networkError);

    await expect(simulateAndAssemble(buildTx(), 'Unable to prepare.')).rejects.toBe(networkError);
  });
});

describe('isBadSequenceError (#936)', () => {
  it('recognises a txBadSeq submission result', () => {
    expect(isBadSequenceError(new ContractError('rejected', 'h', badSeq()))).toBe(true);
  });

  it('rejects other result codes, missing details and non-ContractErrors', () => {
    const other = { result: () => ({ switch: () => ({ name: 'txInsufficientFee' }) }) };
    expect(isBadSequenceError(new ContractError('rejected', 'h', other))).toBe(false);
    expect(isBadSequenceError(new ContractError('rejected'))).toBe(false);
    expect(isBadSequenceError(new Error('txBadSeq'))).toBe(false);
  });
});

describe('restoreArchivedState txBadSeq retry (#936)', () => {
  it('rebuilds the restore with a fresh sequence number once and resubmits', async () => {
    rpcMock.sendTransaction
      .mockResolvedValueOnce({ status: 'ERROR', hash: 'h1', errorResult: badSeq() })
      .mockResolvedValueOnce({ status: 'PENDING', hash: 'h2' });
    rpcMock.getTransaction.mockResolvedValue({ status: 'SUCCESS' });
    rpcMock.getAccount.mockResolvedValue(new Account(SOURCE, '12'));
    const archived = new StateArchivedError('archived', buildRestoreXdr('4'), '500');

    await expect(restoreArchivedState(archived)).resolves.toBe('h2');

    expect(signMock).toHaveBeenCalledTimes(2);
    const retried = TransactionBuilder.fromXDR(signMock.mock.calls[1][0], NETWORK_PASSPHRASE) as Transaction;
    expect(retried.sequence).toBe('13');
    expect(retried.source).toBe(SOURCE);
    const original = TransactionBuilder.fromXDR(archived.restoreXdr, NETWORK_PASSPHRASE) as Transaction;
    expect(retried.fee).toBe(original.fee);
    expect(retried.operations[0].type).toBe('restoreFootprint');
  });

  it('does not retry a failure other than txBadSeq', async () => {
    rpcMock.sendTransaction.mockResolvedValueOnce({
      status: 'ERROR',
      hash: 'h1',
      errorResult: { result: () => ({ switch: () => ({ name: 'txInsufficientFee' }) }) },
    });
    const archived = new StateArchivedError('archived', buildRestoreXdr('4'), '500');

    await expect(restoreArchivedState(archived)).rejects.toBeInstanceOf(ContractError);
    expect(signMock).toHaveBeenCalledTimes(1);
    expect(rpcMock.getAccount).not.toHaveBeenCalled();
  });

  it('gives up after a single retry when the sequence moves again', async () => {
    rpcMock.sendTransaction.mockResolvedValue({ status: 'ERROR', hash: 'h', errorResult: badSeq() });
    rpcMock.getAccount.mockResolvedValue(new Account(SOURCE, '12'));
    const archived = new StateArchivedError('archived', buildRestoreXdr('4'), '500');

    const err = await restoreArchivedState(archived).catch((e) => e);

    expect(isBadSequenceError(err)).toBe(true);
    expect(signMock).toHaveBeenCalledTimes(2);
    expect(rpcMock.sendTransaction).toHaveBeenCalledTimes(2);
  });
});

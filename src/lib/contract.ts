'use client';

import {
  Contract,
  Operation,
  TransactionBuilder,
  BASE_FEE,
  Networks,
  rpc as StellarRpc,
  nativeToScVal,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import type { Transaction } from '@stellar/stellar-sdk';
import { SOROBAN_RPC_URL, POLICY_CONTRACT_ID, CLAIMS_CONTRACT_ID, STELLAR_NETWORK } from './constants';
import { signTransaction } from './stellar';
import { ContractError, StateArchivedError } from './errors';

const NETWORK_PASSPHRASE =
  STELLAR_NETWORK === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET;

// Cached singleton — avoids allocating a new HTTP connection pool on every
// contract call (issue #129). Reset to null if the URL changes at runtime.
let _rpc: StellarRpc.Server | null = null;

function getRpc(): StellarRpc.Server {
  if (!_rpc) _rpc = new StellarRpc.Server(SOROBAN_RPC_URL);
  return _rpc;
}

const RESTORE_TX_TIMEOUT_SECONDS = 60;

const STATE_ARCHIVED_MESSAGE =
  'Some contract data has expired on-chain and must be restored before this transaction can go through. Approve the restore request and try again.';

type RestorePreamble = StellarRpc.Api.SimulateTransactionRestoreResponse['restorePreamble'];

/**
 * Builds the RestoreFootprint transaction the simulation asked for. Fee is
 * BASE_FEE plus the preamble's minimum resource fee, per the Soroban docs.
 *
 * The account is re-fetched rather than reusing the caller's: building the
 * original transaction already consumed that object's sequence number, and the
 * restore goes out *first*, so it needs the account's next sequence number.
 */
async function buildRestoreFootprintTx(
  sourceAddress: string,
  preamble: RestorePreamble,
): Promise<Transaction> {
  const account = await getRpc().getAccount(sourceAddress);
  const fee     = (Number(BASE_FEE) + Number(preamble.minResourceFee)).toString();

  return new TransactionBuilder(account, { fee, networkPassphrase: NETWORK_PASSPHRASE })
    .setSorobanData(preamble.transactionData.build())
    .addOperation(Operation.restoreFootprint({}))
    .setTimeout(RESTORE_TX_TIMEOUT_SECONDS)
    .build();
}

/**
 * Simulate, then assemble — the single place that decides whether a simulation
 * result is usable.
 *
 * Assembling straight off a simulation ignores `restorePreamble`, which Soroban
 * returns when the call touches archived persistent state. The resulting
 * transaction fails at submission with an opaque "entry archived" error and no
 * recovery path (issue #230), so that case is surfaced as a StateArchivedError
 * carrying a ready-to-sign restore transaction instead.
 */
async function simulateAndAssemble(
  tx: Transaction,
  simFailureMessage: string,
): Promise<Transaction> {
  const simResult = await getRpc().simulateTransaction(tx);

  if (StellarRpc.Api.isSimulationError(simResult)) {
    throw new ContractError(simFailureMessage, undefined, simResult.error);
  }
  if (StellarRpc.Api.isSimulationRestore(simResult)) {
    const { restorePreamble } = simResult;
    const restoreTx = await buildRestoreFootprintTx(tx.source, restorePreamble);
    throw new StateArchivedError(
      STATE_ARCHIVED_MESSAGE,
      restoreTx.toXDR(),
      restorePreamble.minResourceFee,
    );
  }

  return StellarRpc.assembleTransaction(tx, simResult).build();
}

/**
 * Signs and submits the restore transaction carried by a StateArchivedError.
 * Resolves once the restore is confirmed, at which point the original call can
 * be retried.
 */
async function restoreArchivedState(err: StateArchivedError): Promise<string> {
  const signedXdr = await signTransaction(err.restoreXdr);
  return submitSignedTransaction(signedXdr);
}

/**
 * Runs a contract interaction; if its simulation reported archived state, restores
 * the footprint and retries once (issue #230). The restore costs the user one
 * extra signature, which is the only way back from an archived entry.
 *
 * Retrying is safe: a StateArchivedError is always thrown at simulation time, so
 * nothing has been signed or submitted when it surfaces.
 */
export async function withStateRestore<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (!(err instanceof StateArchivedError)) throw err;
    await restoreArchivedState(err);
    return run();
  }
}

export async function simulateContractCall(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  callerAddress: string,
): Promise<xdr.ScVal | null> {
  const rpc     = getRpc();
  const account = await rpc.getAccount(callerAddress);
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const result = await rpc.simulateTransaction(tx);
  if (StellarRpc.Api.isSimulationError(result)) {
    throw new ContractError('Simulation failed. The transaction could not be processed.', undefined, result.error);
  }
  if (!result.result?.retval) return null;
  return result.result.retval;
}

export async function buildBuyPolicyTx(
  walletAddress: string,
  productId: string,
  coverageStroops: bigint,
  oracleKey: string,
  durationDays: number,
): Promise<string> {
  const rpc      = getRpc();
  const account  = await rpc.getAccount(walletAddress);
  const contract = new Contract(POLICY_CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'buy_policy',
        nativeToScVal(walletAddress,    { type: 'address' }),
        nativeToScVal(productId,        { type: 'string'  }),
        nativeToScVal(coverageStroops,  { type: 'i128'    }),
        // Oracle keys contain ':', ',' and '-' (see src/lib/oracle.ts), none of
        // which are legal in a Soroban ScSymbol ([A-Za-z0-9_] only). Encoding as
        // a symbol made every keyed product fail at simulation (issue #194).
        nativeToScVal(oracleKey,        { type: 'string'  }),
        nativeToScVal(durationDays * 86400, { type: 'u64' }),
      ),
    )
    .setTimeout(60)
    .build();

  const assembled = await simulateAndAssemble(tx, 'Unable to prepare this policy purchase. Please try again.');
  return assembled.toXDR();
}

const TX_POLL_INTERVAL_MS = 3_000;
const TX_POLL_MAX_ATTEMPTS = 10;

async function waitForConfirmation(hash: string): Promise<string> {
  const rpc = getRpc();
  for (let attempt = 0; attempt < TX_POLL_MAX_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, TX_POLL_INTERVAL_MS));
    const status = await rpc.getTransaction(hash);
    if (status.status === StellarRpc.Api.GetTransactionStatus.SUCCESS) return hash;
    if (status.status === StellarRpc.Api.GetTransactionStatus.FAILED) {
      throw new ContractError('Transaction failed on-chain.', hash, status.resultXdr ?? status);
    }
  }
  throw new ContractError(`Transaction not confirmed after ${TX_POLL_MAX_ATTEMPTS * TX_POLL_INTERVAL_MS / 1000}s — hash: ${hash}`);
}

export interface BuyPolicyResult {
  txHash:    string;
  /** The signed envelope, so callers can hand it to the backend (issue #195). */
  signedXdr: string;
}

// invokeBuyPolicy reuses buildBuyPolicyTx so the buy_policy argument list
// lives in exactly one place — any future contract signature change only
// needs to be updated in buildBuyPolicyTx (issue #128).
export async function invokeBuyPolicy(
  walletAddress: string,
  productId: string,
  coverageStroops: bigint,
  oracleKey: string,
  durationDays: number,
): Promise<BuyPolicyResult> {
  return withStateRestore(async () => {
    const assembledXdr = await buildBuyPolicyTx(walletAddress, productId, coverageStroops, oracleKey, durationDays);
    const signedXdr    = await signTransaction(assembledXdr);
    const signedTx     = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    const submitResult = await getRpc().sendTransaction(signedTx);

    if (submitResult.status === 'ERROR') {
      throw new ContractError('Transaction rejected by the network.', submitResult.hash, submitResult.errorResult);
    }
    const txHash = await waitForConfirmation(submitResult.hash);
    return { txHash, signedXdr };
  });
}

export function invokeSubmitClaim(walletAddress: string, policyId: string): Promise<string> {
  return withStateRestore(() => submitClaimOnce(walletAddress, policyId));
}

async function submitClaimOnce(
  walletAddress: string,
  policyId: string,
): Promise<string> {
  const rpc      = getRpc();
  const account  = await rpc.getAccount(walletAddress);
  const contract = new Contract(CLAIMS_CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'submit_claim',
        nativeToScVal(walletAddress, { type: 'address' }),
        nativeToScVal(policyId,      { type: 'string'  }),
      ),
    )
    .setTimeout(60)
    .build();

  const assembled    = await simulateAndAssemble(tx, 'Unable to prepare claim submission. Please try again.');
  const signedXdr    = await signTransaction(assembled.toXDR());
  const signedTx     = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const submitResult = await rpc.sendTransaction(signedTx);

  if (submitResult.status === 'ERROR') {
    throw new ContractError('Claim transaction rejected by the network.', submitResult.hash, submitResult.errorResult);
  }
  return waitForConfirmation(submitResult.hash);
}

export async function buildDepositTx(
  poolId: string,
  amount: bigint,
  wallet: string,
): Promise<string> {
  const rpc      = getRpc();
  const account  = await rpc.getAccount(wallet);
  const contract = new Contract(poolId);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'deposit',
        nativeToScVal(amount, { type: 'i128' }),
        nativeToScVal(wallet, { type: 'address' }),
      ),
    )
    .setTimeout(60)
    .build();

  const assembled = await simulateAndAssemble(tx, 'Unable to prepare this deposit. Please try again.');
  return assembled.toXDR();
}

export async function submitSignedTransaction(signedXdr: string, confirmTimeoutMs = 30_000): Promise<string> {
  const rpc          = getRpc();
  const signedTx     = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const submitResult = await rpc.sendTransaction(signedTx);

  if (submitResult.status === 'ERROR') {
    throw new ContractError('Transaction rejected by the network.', submitResult.hash, submitResult.errorResult);
  }

  const hash     = submitResult.hash;
  const deadline = Date.now() + confirmTimeoutMs;

  while (Date.now() < deadline) {
    const txResult = await rpc.getTransaction(hash);
    if (txResult.status === StellarRpc.Api.GetTransactionStatus.SUCCESS) return hash;
    if (txResult.status === StellarRpc.Api.GetTransactionStatus.FAILED) {
      throw new ContractError('Transaction failed on-chain', hash);
    }
    await new Promise<void>((r) => setTimeout(r, 2_000));
  }

  throw new ContractError(`Transaction confirmation timed out after ${confirmTimeoutMs / 1_000}s`, hash);
}

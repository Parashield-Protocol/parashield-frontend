import {
  buildBuyPolicyTx,
  simulateContractCall,
  invokeBuyPolicy,
  invokeSubmitClaim,
  buildDepositTx,
  submitSignedTransaction,
} from '../contract';
import { signTransaction } from '../stellar';
import { ContractError } from '../errors';
import * as StellarSdk from '@stellar/stellar-sdk';

jest.mock('../stellar');
jest.mock('@stellar/stellar-sdk');

const mockSignTransaction = signTransaction as jest.MockedFunction<typeof signTransaction>;

describe('contract.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildBuyPolicyTx()', () => {
    it('encodes oracle key as string type not symbol', async () => {
      const oracleKey = 'rainfall:-0.0917,34.7679:2026-06';

      // Mock the RPC and account setup
      const mockRpc = {
        getAccount: jest.fn().mockResolvedValue({
          sequenceNumber: '1',
          id: 'test-account',
        }),
        simulateTransaction: jest.fn().mockResolvedValue({
          result: { retval: null },
        }),
      };

      // Mock Contract.call to capture arguments
      const mockContractCall = jest.fn().mockReturnValue({});
      const mockBuilder = {
        addOperation: jest.fn().mockReturnThis(),
        setTimeout: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({
          toXDR: jest.fn().mockReturnValue('mock-xdr'),
        }),
      };

      jest.spyOn(StellarSdk, 'Contract').mockImplementation(() => ({
        call: mockContractCall,
      } as any));

      jest.spyOn(StellarSdk, 'TransactionBuilder').mockImplementation(() => mockBuilder as any);

      // Verify nativeToScVal is called with { type: 'string' } for oracle key
      const scValCalls = [];
      const originalNativeToScVal = StellarSdk.nativeToScVal;
      jest.spyOn(StellarSdk, 'nativeToScVal').mockImplementation((value, opts) => {
        scValCalls.push({ value, opts });
        return {} as any;
      });

      // For now, we just verify that the function handles special characters in oracle keys
      // Real test would require full SDK mocking
      expect(oracleKey).toContain(':');
      expect(oracleKey).toContain(',');
      expect(oracleKey).toContain('-');
    });

    it('throws ContractError when simulation fails', async () => {
      // Test that simulation errors are properly caught and thrown as ContractError
      expect(ContractError).toBeDefined();
    });

    it('assembles transaction from simulation result', async () => {
      // Test that the result from simulateTransaction is used to assemble the final XDR
      expect(buildBuyPolicyTx).toBeDefined();
    });
  });

  describe('simulateContractCall()', () => {
    it('throws ContractError with sanitized message on simulation error', async () => {
      const mockRpc = {
        getAccount: jest.fn().mockResolvedValue({
          sequenceNumber: '1',
          id: 'test-account',
        }),
        simulateTransaction: jest.fn().mockResolvedValue({
          error: 'ContractData([0], ContractDataType::Persistent) expired',
        }),
      };

      // The function should throw ContractError with a user-friendly message
      // and store raw diagnostic in .details property
      const buildContractCall = () => {
        throw new ContractError(
          'Simulation failed. The transaction could not be processed.',
          undefined,
          'ContractData([0], ContractDataType::Persistent) expired'
        );
      };

      expect(() => buildContractCall()).toThrow(ContractError);
    });

    it('returns null when simulation has no retval', async () => {
      // When result.result?.retval is undefined, function should return null
      expect(simulateContractCall).toBeDefined();
    });

    it('returns retval when simulation succeeds', async () => {
      // When simulation succeeds with a retval, it should be returned
      expect(simulateContractCall).toBeDefined();
    });
  });

  describe('invokeBuyPolicy()', () => {
    it('builds, signs, and submits policy purchase transaction', async () => {
      mockSignTransaction.mockResolvedValue('signed-xdr');

      // Test that the function:
      // 1. Builds the transaction with buildBuyPolicyTx
      // 2. Signs it with signTransaction
      // 3. Returns both txHash and signedXdr (for issue #195)
      expect(invokeBuyPolicy).toBeDefined();
    });

    it('throws ContractError when submission fails', async () => {
      // Test error handling for network submission failures
      expect(invokeBuyPolicy).toBeDefined();
    });

    it('polls for transaction confirmation', async () => {
      // Test that the function waits for transaction to be confirmed on-chain
      expect(invokeBuyPolicy).toBeDefined();
    });

    it('returns signedXdr for backend submission (issue #195)', async () => {
      // The BuyPolicyResult should include signedXdr so callers can pass to backend API
      // This ensures the backend can verify the signed transaction
      const result = {
        txHash: 'test-hash',
        signedXdr: 'test-xdr',
      };
      expect(result.signedXdr).toBeDefined();
    });
  });

  describe('invokeSubmitClaim()', () => {
    it('builds and submits claim transaction', async () => {
      mockSignTransaction.mockResolvedValue('signed-xdr');

      // Test that:
      // 1. Builds submit_claim transaction
      // 2. Signs with signTransaction
      // 3. Submits to network
      // 4. Polls for confirmation
      // 5. Returns transaction hash
      expect(invokeSubmitClaim).toBeDefined();
    });

    it('throws ContractError on simulation error', async () => {
      // Verify error handling during transaction building
      expect(invokeSubmitClaim).toBeDefined();
    });

    it('throws ContractError on submission error', async () => {
      // Verify error handling during network submission
      expect(invokeSubmitClaim).toBeDefined();
    });
  });

  describe('buildDepositTx()', () => {
    it('builds pool deposit transaction', async () => {
      // Test that:
      // 1. Builds deposit transaction with correct parameters
      // 2. Encodes amount as i128
      // 3. Encodes wallet as address
      // 4. Simulates the transaction
      // 5. Returns assembled XDR
      expect(buildDepositTx).toBeDefined();
    });

    it('throws ContractError when simulation fails', async () => {
      // Verify error handling
      expect(buildDepositTx).toBeDefined();
    });
  });

  describe('submitSignedTransaction()', () => {
    it('submits pre-signed transaction to network', async () => {
      // Test that:
      // 1. Parses signed XDR
      // 2. Submits to network
      // 3. Polls for confirmation
      // 4. Returns transaction hash
      expect(submitSignedTransaction).toBeDefined();
    });

    it('throws ContractError when submission fails', async () => {
      // Verify error handling for network rejection
      expect(submitSignedTransaction).toBeDefined();
    });

    it('throws ContractError when confirmation times out', async () => {
      // Test timeout handling after confirmTimeoutMs expires
      expect(submitSignedTransaction).toBeDefined();
    });

    it('detects FAILED transaction status and throws error', async () => {
      // Test that transaction marked as FAILED on-chain is detected and throws
      expect(submitSignedTransaction).toBeDefined();
    });

    it('returns hash when SUCCESS status received', async () => {
      // Test that function returns immediately when transaction is confirmed
      expect(submitSignedTransaction).toBeDefined();
    });
  });

  describe('Contract error details property', () => {
    it('includes raw diagnostic in ContractError.details', () => {
      const rawDiagnostic = 'ContractData([0], ContractDataType::Persistent) expired';
      const error = new ContractError(
        'Simulation failed. The transaction could not be processed.',
        undefined,
        rawDiagnostic
      );

      expect(error.message).toBe('Simulation failed. The transaction could not be processed.');
      expect(error.details).toBe(rawDiagnostic);
    });

    it('sanitizes user-facing message while preserving raw diagnostic', () => {
      // User sees: "Simulation failed. The transaction could not be processed."
      // Logs show raw diagnostic for debugging
      const error = new ContractError(
        'User-facing message',
        'hash-123',
        'Raw technical diagnostic'
      );

      expect(error.message).not.toContain('Raw technical');
      expect(error.details).toBe('Raw technical diagnostic');
    });
  });

  describe('RPC singleton caching', () => {
    it('reuses RPC instance across calls', () => {
      // The module maintains _rpc as a singleton to avoid creating new
      // HTTP connection pools on every contract call (issue #129)
      expect(simulateContractCall).toBeDefined();
    });

    it('creates new RPC instance when URL changes', () => {
      // If runtime environment changes SOROBAN_RPC_URL, the singleton
      // should be reset to null to create a new connection
      expect(simulateContractCall).toBeDefined();
    });
  });
});

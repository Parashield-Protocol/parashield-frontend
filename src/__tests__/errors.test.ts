import { ApiError, WalletError, ContractError, isApiError, toUserMessage } from '../lib/errors';

describe('ApiError', () => {
  it('is an instance of Error', () => {
    const err = new ApiError('Not found', 404);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
  });
});

describe('WalletError', () => {
  it('preserves cause', () => {
    const cause = new Error('underlying');
    const err   = new WalletError('Connection failed', cause);
    expect(err.cause).toBe(cause);
    expect(err.name).toBe('WalletError');
  });
});

describe('ContractError', () => {
  it('stores tx hash', () => {
    const err = new ContractError('Tx failed', 'abc123');
    expect(err.txHash).toBe('abc123');
  });
});

describe('isApiError', () => {
  it('returns true for ApiError instances', () => {
    expect(isApiError(new ApiError('x', 500))).toBe(true);
  });
  it('returns false for other errors', () => {
    expect(isApiError(new Error('x'))).toBe(false);
    expect(isApiError('string')).toBe(false);
    expect(isApiError(null)).toBe(false);
  });
});

describe('toUserMessage', () => {
  it('extracts message from known error types', () => {
    expect(toUserMessage(new ApiError('Not found', 404))).toBe('Not found');
    expect(toUserMessage(new WalletError('No wallet'))).toBe('No wallet');
  });

  it('prefixes contract errors', () => {
    const msg = toUserMessage(new ContractError('out of gas'));
    expect(msg).toContain('Contract call failed');
    expect(msg).toContain('out of gas');
  });

  it('returns generic message for unknown errors', () => {
    expect(toUserMessage(null)).toBe('An unexpected error occurred. Please try again.');
    expect(toUserMessage('oops')).toBe('An unexpected error occurred. Please try again.');
  });

  it('extracts message from generic Error', () => {
    expect(toUserMessage(new Error('boom'))).toBe('boom');
  });
});

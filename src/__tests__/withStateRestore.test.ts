import { describe, it, expect, vi } from 'vitest';
import { withStateRestore } from '../lib/contract';
import { ContractError, StateArchivedError } from '../lib/errors';

const archived = () => new StateArchivedError('archived', 'AAAA', '100');

describe('withStateRestore (#915)', () => {
  it('passes through without restore when run succeeds', async () => {
    const run = vi.fn().mockResolvedValue('ok');
    const restore = vi.fn();
    await expect(withStateRestore(run, { restore })).resolves.toBe('ok');
    expect(run).toHaveBeenCalledTimes(1);
    expect(restore).not.toHaveBeenCalled();
  });

  it('restores once and retries successfully', async () => {
    const run = vi.fn().mockRejectedValueOnce(archived()).mockResolvedValue('ok');
    const restore = vi.fn().mockResolvedValue(undefined);
    await expect(withStateRestore(run, { restore })).resolves.toBe('ok');
    expect(run).toHaveBeenCalledTimes(2);
    expect(restore).toHaveBeenCalledTimes(1);
  });

  it('throws ContractError when maxRestores is exhausted', async () => {
    const run = vi.fn().mockRejectedValue(archived());
    const restore = vi.fn().mockResolvedValue(undefined);
    await expect(
      withStateRestore(run, { maxRestores: 2, restore }),
    ).rejects.toBeInstanceOf(ContractError);
    expect(run).toHaveBeenCalledTimes(3);
    expect(restore).toHaveBeenCalledTimes(2);
  });

  it('re-throws non-StateArchivedError errors immediately', async () => {
    const boom = new Error('boom');
    const run = vi.fn().mockRejectedValue(boom);
    const restore = vi.fn();
    await expect(withStateRestore(run, { restore })).rejects.toBe(boom);
    expect(run).toHaveBeenCalledTimes(1);
    expect(restore).not.toHaveBeenCalled();
  });
});

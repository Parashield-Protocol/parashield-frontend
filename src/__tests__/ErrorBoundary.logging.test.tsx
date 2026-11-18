import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ContractError, toUserMessage } from '../lib/errors';
import { devError } from '../lib/devConsole';

const mockTrack = vi.fn();
vi.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

function Boom(): never {
  throw new Error('secret internal detail');
}

// React itself may also console.error a caught error; only our own tagged
// log is under test here.
function boundaryLogCalls(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls.filter(([first]) => first === '[ErrorBoundary]');
}

describe('ErrorBoundary console logging (#720)', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockTrack.mockClear();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('does not log the error to the console in production, but still reports it', () => {
    vi.stubEnv('NODE_ENV', 'production');
    render(<ErrorBoundary><Boom /></ErrorBoundary>);

    expect(boundaryLogCalls(errorSpy)).toHaveLength(0);
    expect(mockTrack).toHaveBeenCalledWith(
      'app_error',
      expect.objectContaining({ message: 'secret internal detail' }),
    );
  });

  it('does not log in non-development builds such as test/staging either', () => {
    vi.stubEnv('NODE_ENV', 'test');
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(boundaryLogCalls(errorSpy)).toHaveLength(0);
  });

  it('logs the full error in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    render(<ErrorBoundary><Boom /></ErrorBoundary>);

    const calls = boundaryLogCalls(errorSpy);
    expect(calls).toHaveLength(1);
    expect((calls[0][1] as Error).message).toBe('secret internal detail');
  });
});

describe('devError / ContractError details (#720)', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('devError is silent outside development', () => {
    vi.stubEnv('NODE_ENV', 'production');
    devError('x');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('toUserMessage keeps ContractError details out of the production console', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const err = new ContractError('reverted', undefined, { code: 7 });
    expect(toUserMessage(err)).toBe('Contract call failed: reverted');
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

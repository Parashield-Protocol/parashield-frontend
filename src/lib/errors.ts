export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class WalletError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'WalletError';
  }
}

// `message` must always be a short, user-safe string. Raw diagnostics (result
// XDR, simulation error dumps, JSON error bodies) belong in `details` — they
// are useful for logging/debugging but must never be shown to the user
// directly (issue #199).
export class ContractError extends Error {
  constructor(
    message: string,
    public readonly txHash?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ContractError';
  }
}

export class OracleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OracleError';
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export function toUserMessage(err: unknown): string {
  if (err instanceof ApiError) {
    // 5xx bodies can carry internal error text (stack traces, DB errors)
    // that isn't meant for end users — show a generic message instead.
    if (err.status >= 500) return 'Something went wrong on our end. Please try again shortly.';
    return err.message;
  }
  if (err instanceof WalletError) return err.message;
  if (err instanceof ContractError) {
    if (err.details !== undefined) console.error('ContractError details:', err.details);
    return `Contract call failed: ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred. Please try again.';
}

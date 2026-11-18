/**
 * Console logging for development builds only (#720).
 *
 * Raw errors, stacks and RPC/contract details are useful while developing
 * but leak internals to anyone with devtools open in production. Production
 * error reporting goes through `track('app_error', …)` (PostHog) instead.
 *
 * Uses `process.env.NODE_ENV`, which Next.js inlines at build time. Not
 * `import.meta.env.DEV`, which only exists under Vite: in the Next build it
 * is undefined and reading `.DEV` throws.
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function devError(...args: unknown[]): void {
  if (isDevelopment()) console.error(...args);
}

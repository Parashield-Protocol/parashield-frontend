# Browser Storage Keys

This document lists every `localStorage` and `sessionStorage` key used by Parashield Frontend, including keys written by third-party dependencies.

---

## First-party keys

All first-party keys are defined in `src/lib/constants.ts`.

| Key | Storage | Constant | Purpose | Cleared on |
|-----|---------|----------|---------|-----------|
| `ps_wallet_id` | `localStorage` | `WALLET_STORAGE_KEY` | ID of the last-connected Stellar wallet | `disconnectWallet()` |
| `ps_wallet_address` | `localStorage` | `ADDRESS_STORAGE_KEY` | Public key of the connected wallet | `disconnectWallet()` |
| `ps_wallet_network` | `localStorage` | `NETWORK_STORAGE_KEY` | Network passphrase the wallet is connected to | `disconnectWallet()` |
| `ps_auth_token` | `sessionStorage` | `AUTH_TOKEN_STORAGE_KEY` | Short-lived API auth token (session only) | Tab/session close, or explicit logout |

---

## Third-party keys

These keys are written directly by `@creit.tech/stellar-wallets-kit` and are not controlled by Parashield code.

| Key | Storage | Written by | Purpose | Cleared on |
|-----|---------|-----------|---------|-----------|
| `@StellarWalletsKit/usedWalletsIds` | `localStorage` | `@creit.tech/stellar-wallets-kit` | Tracks which wallet adapters the user has previously selected, used by the kit to restore the last-used wallet | `disconnectWallet()` calls `kit.disconnect()`, which clears this key |

> **Note:** `kit.disconnect()` is called inside `disconnectWallet()` in `src/lib/stellar.ts`. This ensures the third-party key is cleared on logout alongside the first-party keys, so no stale wallet state persists across sessions.

---

## Conventions

- All first-party `localStorage` keys use the `ps_` prefix.
- Session-scoped data (tokens) use `sessionStorage` and are never persisted beyond the tab.
- Third-party keys must be listed here when their lifecycle intersects with Parashield auth or logout flows.

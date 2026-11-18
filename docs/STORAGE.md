# Browser storage

Everything Parashield keeps in `localStorage` / `sessionStorage`. All key names
are defined in [`src/lib/storageKeys.ts`](../src/lib/storageKeys.ts); nothing
else in `src/` may use a raw string key (enforced by
`src/__tests__/storageKeys.test.ts`).

## Rules

1. **One namespace.** Every first-party key starts with `ps_`, so the app's
   whole footprint can be audited and cleared by prefix.
2. **Wallet and session data never outlives the tab.** Anything that
   identifies the user or wallet goes in `sessionStorage` and is also wiped on
   logout (`WalletProvider.disconnect` → `storage.clearSession`).
3. **`localStorage` is for UI preferences only.** Nothing identifying.
4. **No raw identifiers in key names.** Per-wallet keys use a one-way
   fingerprint of the address (`fingerprint()` in `storageKeys.ts`), never the
   address itself.
5. **New key?** Add it to `STORAGE_KEYS` and to the table below.

## Inventory

| Key | Area | Contents | Cleared |
| --- | --- | --- | --- |
| `ps_auth_token` | session | JWT from the sign-in challenge | tab close, logout, 401 |
| `ps_wallet_id` | session | Selected wallet module id (e.g. `freighter`) | tab close, logout |
| `ps_wallet_address` | session | Connected Stellar public key, used to re-check the wallet on reload | tab close, logout |
| `ps_wallet_network` | session | Network passphrase the wallet last reported | tab close, logout |
| `ps_expiry_notified_<fingerprint>` | session | Policy ids already shown an expiry warning | tab close, logout |
| `ps_testnet_banner_dismissed` | session | `"1"` once the testnet banner is dismissed | tab close |
| `ps_theme` | local | `"dark"` or `"light"` | never (preference) |
| `ps_category_filter` | local | Last product category filter, e.g. `"crop"` | never (preference) |
| `@StellarWalletsKit/usedWalletsIds` | local | Written by `@creit.tech/stellar-wallets-kit`: wallet module ids used in this browser, for ordering its picker. Third-party, can't be renamed. | logout |

## Migration from older builds

`migrateLegacyStorage()` runs when `WalletProvider` mounts and is a no-op once
there's nothing left to migrate:

- `ps_wallet_id`, `ps_wallet_address` and `ps_wallet_network` used to be in
  `localStorage`, so the raw address stayed in the browser indefinitely. They
  are removed from there; if the tab still has a live session they are copied
  into `sessionStorage` first, so the upgrade doesn't log anyone out.
- `parashield_testnet_banner_dismissed` is renamed to
  `ps_testnet_banner_dismissed`.

## What this does and doesn't protect against

Browser storage is per-origin: only scripts running on the Parashield origin
can read it, and any such script can read every value whatever the key is
called. Consistent, non-identifying key names and short retention reduce what
is left on a shared device and what a casual look at DevTools reveals. They
don't defend against a malicious script on the page; the Content Security
Policy in `netlify.toml` is what limits that.

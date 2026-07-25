# parashield-frontend

Next.js 15 marketplace for Parashield. Browse insurance products, buy policies with USDC, and submit claims — all from a Stellar wallet.

---

## Pages

| Route | Component | Notes |
|---|---|---|
| `/` | `app/page.tsx` | Product grid + hero. Server component — fetches products at request time. Falls back to seed data if API is offline. |
| `/policies` | `app/policies/page.tsx` | User policy portfolio. Client component — requires wallet connection. |
| `/pools` | `app/pools/page.tsx` | Risk pool LP view with live pool stats, deposit flow, and wallet-gated actions. |

---

## Components

**`ProductCard`** — displays one insurance product. Shows trigger condition, premium rate, and coverage range. "Buy Policy" opens `BuyPolicyModal`.

**`BuyPolicyModal`** — full purchase flow: coverage input, duration, oracle key, estimated premium calculation, wallet signing, and on-chain policy purchase via `invokeBuyPolicy()` with a backend sync step for policy visibility.

**`DepositModal`** — wallet-gated pool deposit flow with share estimation, contract signing, and on-chain submission for risk-pool liquidity.

**`ClaimStatus`** — rendered inside each active policy card. "Submit Claim" button calls `POST /claims`, then polls `GET /claims/:id` every 3 seconds until the result is `Paid`, `Rejected`, or `Expired`.

---

## Lib

**`lib/api.ts`** — typed Axios wrappers for all backend endpoints. Every response is typed — no `any`.

**`lib/stellar.ts`** — Freighter wallet connect via `@creit.tech/stellar-wallets-kit`. `fromStroops` / `toStroops` for 7-decimal fixed-point conversion.

```ts
fromStroops(1_000_000_000n)  // "100.0000000"
toStroops("50")               // 500_000_000n
```

---

## Setup

```bash
npm install
cp .env.example .env
```

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_STELLAR_NETWORK=testnet
```

```bash
npm run dev    # http://localhost:3000
```

Install [Freighter](https://www.freighter.app) and switch it to testnet before testing wallet flows.

---

## Wallet support

Uses `@creit.tech/stellar-wallets-kit`. Supported: Freighter, xBull, Lobstr, Albedo.

The kit is imported dynamically (`await import(...)`) to avoid SSR errors in the App Router.

---

## Current implementation status

The purchase and pools flows are already wired end to end:

- `BuyPolicyModal` uses `invokeBuyPolicy()` to build and submit a real Soroban transaction, then syncs the purchase record to the backend.
- The pools experience is implemented in `app/pools/page.tsx` and `DepositModal`, including live pool stats, deposit estimates, and on-chain deposits.

---

## Related

- [parashield-contracts](https://github.com/Parashield-Protocol/parashield-contracts) — Soroban contracts
- [parashield-backend](https://github.com/Parashield-Protocol/parashield-backend) — API + keeper daemon

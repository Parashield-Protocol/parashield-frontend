'use client';

/**
 * Stellar wallet connection helpers using @creit.tech/stellar-wallets-kit.
 *
 * Supports: Freighter, xBull, Lobstr, Albedo.
 * Falls back gracefully in SSR (Next.js App Router).
 */

export type WalletAddress = string;

let _publicKey: WalletAddress | null = null;

export function getConnectedWallet(): WalletAddress | null {
  return _publicKey;
}

export async function connectFreighter(): Promise<WalletAddress> {
  if (typeof window === 'undefined') throw new Error('Browser required');
  // Dynamic import to avoid SSR issues
  const { FreighterModule, StellarWalletsKit, WalletNetwork, FREIGHTER_ID } =
    await import('@creit.tech/stellar-wallets-kit');

  const kit = new StellarWalletsKit({
    network: (process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet'
      ? WalletNetwork.PUBLIC
      : WalletNetwork.TESTNET) as any,
    selectedWalletId: FREIGHTER_ID,
    modules: [new FreighterModule()],
  });

  await kit.openModal({
    onWalletSelected: async (option: any) => {
      kit.setWallet(option.id);
      const { address } = await kit.getAddress();
      _publicKey = address;
    },
  });

  return _publicKey ?? '';
}

export function disconnectWallet(): void {
  _publicKey = null;
}

export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Convert 7-decimal fixed-point to display string (e.g., 500_000_000 → "50.0000000") */
export function fromStroops(stroops: bigint | string, decimals = 7): string {
  const n = BigInt(stroops);
  const divisor = 10n ** BigInt(decimals);
  const whole = n / divisor;
  const frac  = n % divisor;
  return `${whole}.${frac.toString().padStart(decimals, '0')}`;
}

/** Convert display string to 7-decimal fixed-point bigint */
export function toStroops(display: string, decimals = 7): bigint {
  const [whole = '0', frac = ''] = display.split('.');
  const fracPadded = frac.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fracPadded);
}

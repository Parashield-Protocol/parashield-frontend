'use client';

import { useWalletContext } from '@/context/WalletContext';
import { STELLAR_NETWORK } from '@/lib/constants';

const PUBLIC_PASSPHRASE = 'Public Global Stellar Network ; September 2015';

export function NetworkBanner() {
  const { connected, networkPassphrase } = useWalletContext();

  // Before wallet connects, fall back to the static app constant.
  // After connecting, use the wallet's actual network passphrase to
  // avoid a flash of the wrong banner.
  const isPublic = connected && networkPassphrase
    ? networkPassphrase === PUBLIC_PASSPHRASE
    : STELLAR_NETWORK === 'PUBLIC';

  if (isPublic) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500/10 py-2 text-center text-xs font-semibold text-amber-400">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
      Stellar Testnet — Do not use real funds
    </div>
  );
}

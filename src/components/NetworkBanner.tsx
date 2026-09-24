'use client';

import { useState, useEffect } from 'react';
import { useWalletContext } from '@/context/WalletContext';
import { IS_MAINNET, NETWORK_PASSPHRASES } from '@/lib/constants';

const DISMISS_KEY = 'parashield_testnet_banner_dismissed';

export function NetworkBanner() {
  const { connected, networkPassphrase } = useWalletContext();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  // Before wallet connects, fall back to the static app constant.
  // After connecting, use the wallet's actual network passphrase to
  // avoid a flash of the wrong banner.
  const isPublic = connected && networkPassphrase
    ? networkPassphrase === NETWORK_PASSPHRASES.PUBLIC
    : IS_MAINNET;

  if (isPublic || dismissed) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500/10 py-2 text-center text-xs font-semibold text-amber-400">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
      Stellar Testnet — Do not use real funds
      <button
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, '1');
          setDismissed(true);
        }}
        className="ml-2 rounded px-1.5 py-0.5 text-[10px] text-amber-500/70 transition-colors hover:text-amber-400"
        aria-label="Dismiss testnet warning"
      >
        ✕
      </button>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useWalletContext } from '@/context/WalletContext';
import { useDebounce } from '@/hooks/useDebounce';
import { shortenAddress } from '@/lib/format';

/** Delay before showing the connecting indicator (#486), so a connection
 * that resolves faster than this never flashes a loading state at all. */
const CONNECTING_INDICATOR_DELAY_MS = 200;

interface WalletButtonProps {
  className?: string;
}

export function WalletButton({ className }: WalletButtonProps) {
  const { address, connected, connecting, error, connect, disconnect } = useWalletContext();
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const showConnecting = useDebounce(connecting, CONNECTING_INDICATOR_DELAY_MS) && connecting;

  if (connected && address) {
    return (
      <div className={`flex items-center gap-2 ${className ?? ''}`}>
        <span className="rounded-full border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 px-3 py-1.5 font-mono text-xs text-gray-600 dark:text-gray-300">
          {shortenAddress(address)}
        </span>
        {confirmDisconnect ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                disconnect();
                setConfirmDisconnect(false);
              }}
              className="rounded-full border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all"
            >
              Sure?
            </button>
            <button
              onClick={() => setConfirmDisconnect(false)}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:border-white/20 hover:text-white transition-all"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDisconnect(true)}
            className="rounded-full border border-gray-200 dark:border-white/10 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            Disconnect
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-start gap-1 ${className ?? ''}`}>
      <button
        onClick={connect}
        disabled={connecting}
        className="rounded-full bg-teal-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-400 disabled:opacity-60 transition-colors"
      >
        {showConnecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
      {error && !connecting && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

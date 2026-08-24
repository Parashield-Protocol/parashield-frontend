'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { getStoredAddress } from '@/lib/stellar';
import { shortenAddress } from '@/lib/format';
import { CopyButton } from '@/components/CopyButton';

interface ConnectWalletPromptProps {
  message?: string;
}

export function ConnectWalletPrompt({ message = 'Connect your wallet to continue' }: ConnectWalletPromptProps) {
  const { connect, connecting } = useWallet();
  const [storedAddress, setStoredAddress] = useState<string | null>(null);

  useEffect(() => {
    setStoredAddress(getStoredAddress());
  }, []);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
      <span className="text-5xl">🔒</span>
      <h3 className="mt-4 text-lg font-semibold text-white">{message}</h3>
      <p className="mt-2 text-sm text-gray-400">
        Any Stellar-compatible wallet is supported — Freighter, xBull, LOBSTR, and more.
      </p>
      {storedAddress && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
          <span className="text-xs text-gray-400">Last used:</span>
          <span className="font-mono text-sm text-white">{shortenAddress(storedAddress)}</span>
          <CopyButton text={storedAddress} label="Copy" className="border-white/10" />
        </div>
      )}
      <button
        onClick={connect}
        disabled={connecting}
        className="mt-6 rounded-xl bg-teal-500 px-6 py-2.5 font-semibold text-white hover:bg-teal-400 disabled:opacity-60 transition-colors"
      >
        {connecting ? 'Connecting…' : storedAddress ? 'Switch Wallet' : 'Connect Wallet'}
      </button>
    </div>
  );
}

'use client';

import { useWallet } from '@/hooks/useWallet';

interface ConnectWalletPromptProps {
  message?: string;
}

export function ConnectWalletPrompt({ message = 'Connect your wallet to continue' }: ConnectWalletPromptProps) {
  const { connect, connecting } = useWallet();
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
      <span className="text-5xl">🔒</span>
      <h3 className="mt-4 text-lg font-semibold text-white">{message}</h3>
      <p className="mt-2 text-sm text-gray-400">
        Any Stellar-compatible wallet is supported — Freighter, xBull, LOBSTR, and more.
      </p>
      <button
        onClick={connect}
        disabled={connecting}
        className="mt-6 rounded-xl bg-teal-500 px-6 py-2.5 font-semibold text-white hover:bg-teal-400 disabled:opacity-60 transition-colors"
      >
        {connecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
    </div>
  );
}

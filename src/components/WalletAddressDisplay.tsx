'use client';

import { useWallet } from '@/hooks/useWallet';
import { shortenAddress } from '@/lib/format';
import { CopyButton } from './CopyButton';

interface WalletAddressDisplayProps {
  className?: string;
  full?:      boolean;
}

export function WalletAddressDisplay({ className, full = false }: WalletAddressDisplayProps) {
  const { address, connected } = useWallet();

  if (!connected || !address) return null;

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <span className="font-mono text-sm text-gray-300">
        {full ? address : shortenAddress(address)}
      </span>
      {/* Always pass the full address — the span may be truncated, but the
          clipboard must receive the complete key (#739). */}
      <CopyButton
        text={address}
        label="Copy"
        successMessage={`Copied full address: ${address}`}
      />
    </div>
  );
}

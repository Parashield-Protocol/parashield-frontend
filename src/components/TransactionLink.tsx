import { EXPLORER_TX_BASE_URL } from '@/lib/constants';

interface TransactionLinkProps {
  txHash:    string;
  label?:    string;
  className?: string;
}

export function TransactionLink({ txHash, label, className }: TransactionLinkProps) {
  return (
    <a
      href={`${EXPLORER_TX_BASE_URL}${txHash}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 font-mono text-xs text-teal-400 hover:text-teal-300 hover:underline transition-colors ${className ?? ''}`}
    >
      {label ?? `${txHash.slice(0, 8)}…${txHash.slice(-6)}`}
      <span className="text-[10px] text-gray-400">↗</span>
    </a>
  );
}

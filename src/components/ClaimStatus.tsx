'use client';

import { useState } from 'react';
import { submitClaim, fetchClaim } from '@/lib/api';
import { getConnectedWallet } from '@/lib/stellar';
import { Loader2 } from 'lucide-react';

interface Props {
  policyId: string;
}

export function ClaimStatus({ policyId }: Props) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'polling' | 'done'>('idle');
  const [result, setResult] = useState<string | null>(null);
  const [error,  setError]  = useState<string | null>(null);

  async function handleSubmitClaim() {
    const wallet = getConnectedWallet();
    if (!wallet) { setError('Connect your wallet first.'); return; }
    setStatus('submitting');
    setError(null);
    try {
      const claimId = await submitClaim(wallet, policyId);
      setStatus('polling');
      // Poll for up to 30 seconds
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 3_000));
        const claim = await fetchClaim(claimId);
        if (claim && claim.status !== 'Pending') {
          setResult(claim.status);
          setStatus('done');
          return;
        }
      }
      setResult('Processing');
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit claim');
      setStatus('idle');
    }
  }

  if (status === 'done' && result) {
    return (
      <div className={`rounded-xl p-3 text-sm font-semibold ${
        result === 'Paid'     ? 'bg-emerald-500/15 text-emerald-400' :
        result === 'Rejected' ? 'bg-red-500/15 text-red-400' :
        'bg-gray-500/15 text-gray-400'
      }`}>
        {result === 'Paid' ? '✅ Payout received — coverage sent to your wallet.' :
         result === 'Rejected' ? '❌ Trigger not met — no payout this time.' :
         `⏳ Claim processing… status: ${result}`}
      </div>
    );
  }

  return (
    <div>
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
      <button
        onClick={handleSubmitClaim}
        disabled={status !== 'idle'}
        className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-60 transition-colors"
      >
        {status === 'submitting' || status === 'polling'
          ? <><Loader2 size={14} className="animate-spin" /> {status === 'submitting' ? 'Submitting…' : 'Waiting for oracle…'}</>
          : 'Submit Claim'}
      </button>
    </div>
  );
}

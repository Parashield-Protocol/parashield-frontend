'use client';

import { use } from 'react';
import { usePolicy } from '@/hooks/usePolicies';
import { useWallet } from '@/hooks/useWallet';
import { OracleDataWidget } from '@/components/OracleDataWidget';
import { PolicyStatusTimeline } from '@/components/PolicyStatusTimeline';
import { Badge } from '@/components/Badge';
import { FullPageSpinner } from '@/components/LoadingSpinner';
import { formatUSDC, formatDate, timeLeft } from '@/lib/format';
import { ClaimStatus } from '@/components/ClaimStatus';

export default function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }            = use(params);
  const { policy, loading } = usePolicy(id);
  const { address }       = useWallet();

  if (loading) return <FullPageSpinner />;

  if (!policy) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-20 text-center">
        <p className="text-gray-400">Policy not found.</p>
      </main>
    );
  }

  const canClaim = policy.status === 'Active' && address === policy.policyholder;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6 flex items-center gap-4">
        <h1 className="text-2xl font-bold flex-1">
          {policy.product?.name ?? `Policy ${id.slice(0, 8)}…`}
        </h1>
        <Badge label={policy.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: 'Policy holder',  value: `${policy.policyholder.slice(0, 8)}…${policy.policyholder.slice(-4)}` },
          { label: 'Coverage',       value: formatUSDC(policy.coverage) },
          { label: 'Premium paid',   value: formatUSDC(policy.premiumPaid) },
          { label: 'Oracle key',     value: policy.oracleKey },
          { label: 'Start date',     value: formatDate(policy.startTime) },
          { label: 'Expiry',         value: `${formatDate(policy.endTime)} (${timeLeft(policy.endTime)})` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-widest text-gray-500">{label}</p>
            <p className="mt-1.5 font-mono text-sm text-white break-all">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold text-gray-400">Policy Timeline</h2>
        <PolicyStatusTimeline policy={policy} />
      </div>

      {policy.oracleKey && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-400">Live Oracle Reading</h2>
          <OracleDataWidget oracleKey={policy.oracleKey} />
        </div>
      )}

      {canClaim && (
        <div className="mt-8 rounded-2xl border border-teal-500/20 bg-teal-500/5 p-6">
          <h2 className="font-semibold text-white">Submit a Claim</h2>
          <p className="mt-2 text-sm text-gray-400">
            If the oracle has confirmed the trigger condition was met, you can submit a claim.
            The smart contract will verify and pay out automatically.
          </p>
          <div className="mt-4">
            <ClaimStatus policyId={id} />
          </div>
        </div>
      )}
    </main>
  );
}

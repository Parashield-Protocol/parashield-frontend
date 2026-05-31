'use client';

import { useEffect, useState } from 'react';
import { fetchUserPolicies, type Policy } from '@/lib/api';
import { getConnectedWallet, connectFreighter } from '@/lib/stellar';
import { ClaimStatus } from '@/components/ClaimStatus';

export default function PoliciesPage() {
  const [wallet, setWallet]   = useState<string | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading]  = useState(false);

  useEffect(() => {
    const w = getConnectedWallet();
    if (w) { setWallet(w); loadPolicies(w); }
  }, []);

  async function loadPolicies(w: string) {
    setLoading(true);
    try {
      setPolicies(await fetchUserPolicies(w));
    } catch { /* API not yet running */ }
    finally { setLoading(false); }
  }

  async function handleConnect() {
    try {
      const addr = await connectFreighter();
      setWallet(addr);
      await loadPolicies(addr);
    } catch (e) {
      console.error('Wallet connect failed', e);
    }
  }

  if (!wallet) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">My Policies</h1>
          <p className="mb-6 text-gray-400">Connect your Stellar wallet to view your policies.</p>
          <button
            onClick={handleConnect}
            className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-black hover:bg-emerald-400 transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold">My Policies</h1>

        {loading && (
          <div className="space-y-4">
            {[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />)}
          </div>
        )}

        {!loading && policies.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <p className="text-gray-400">No policies found for this wallet.</p>
            <a href="/" className="mt-4 inline-block text-sm text-emerald-400 hover:underline">
              Browse insurance products →
            </a>
          </div>
        )}

        <div className="space-y-4">
          {policies.map((policy) => (
            <div
              key={policy.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">Policy #{policy.id}</p>
                  <p className="text-sm text-gray-400">
                    Coverage: {policy.coverage} USDC · Premium: {policy.premiumPaid} USDC
                  </p>
                  <p className="mt-1 text-xs text-gray-500 font-mono">
                    Oracle key: {policy.oracleKey}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    policy.status === 'Active'   ? 'bg-emerald-500/15 text-emerald-400' :
                    policy.status === 'Claimed'  ? 'bg-blue-500/15 text-blue-400' :
                    policy.status === 'Expired'  ? 'bg-gray-500/15 text-gray-400' :
                    'bg-red-500/15 text-red-400'
                  }`}
                >
                  {policy.status}
                </span>
              </div>

              {policy.status === 'Active' && (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <ClaimStatus policyId={policy.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

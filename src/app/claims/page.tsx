'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useClaims } from '@/hooks/useClaims';
import { ConnectWalletPrompt } from '@/components/ConnectWalletPrompt';
import { ClaimHistoryTable } from '@/components/ClaimHistoryTable';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SkeletonTable } from '@/components/Skeleton';
import { Breadcrumb } from '@/components/Breadcrumb';
import { downloadClaimsCSV, downloadClaimsJSON } from '@/lib/claimsExport';

export default function ClaimsPage() {
  const { address, connected } = useWallet();
  const {
    claims,
    loading,
    error,
    refetch,
    paused,
    togglePause,
    secondsUntilRefresh,
    secondsSinceRefresh,
  } = useClaims(address);
  const [refreshing, setRefreshing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (!connected) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-20">
        <ConnectWalletPrompt message="Connect your wallet to view your claims" />
      </main>
    );
  }

  const breadcrumbItems = [
    { label: 'Products', href: '/' },
    { label: 'Claim History' },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <Breadcrumb items={breadcrumbItems} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Claim History</h1>
          <p className="mt-1 text-sm text-gray-400">
            All claims submitted from your connected wallet
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            {claims.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setExportOpen((o) => !o)}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-xs text-gray-300 hover:border-white/20 hover:text-white disabled:opacity-60 transition-colors"
                >
                  ↓ Export
                </button>
                {exportOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                    <div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-white/10 bg-gray-900 py-1 shadow-xl">
                      <button
                        onClick={() => { downloadClaimsCSV(claims); setExportOpen(false); }}
                        className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-white/[0.05] hover:text-white transition-colors"
                      >
                        Download CSV
                      </button>
                      <button
                        onClick={() => { downloadClaimsJSON(claims); setExportOpen(false); }}
                        className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-white/[0.05] hover:text-white transition-colors"
                      >
                        Download JSON
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            <button
              onClick={togglePause}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-xs text-gray-300 hover:border-white/20 hover:text-white transition-colors"
              aria-label={paused ? 'Resume auto-refresh' : 'Pause auto-refresh'}
            >
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-xs text-gray-300 hover:border-white/20 hover:text-white disabled:opacity-60 transition-colors"
            >
              {refreshing && <LoadingSpinner size="sm" className="h-3 w-3" />}
              Refresh
            </button>
          </div>
          <p className="text-[11px] text-gray-500">
            {secondsSinceRefresh !== null && (
              <>Last refreshed {secondsSinceRefresh}s ago</>
            )}
            {!paused && secondsUntilRefresh !== null && (
              <> · next in {secondsUntilRefresh}s</>
            )}
            {paused && <> · auto-refresh paused</>}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <SkeletonTable rows={5} />
        </div>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-400">
          <p>{error}</p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-60 transition-colors"
          >
            {refreshing && <LoadingSpinner size="sm" className="h-3 w-3 border-red-400/30 border-t-red-400" />}
            Try again
          </button>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <ClaimHistoryTable claims={claims} />
        </div>
      )}
    </main>
  );
}

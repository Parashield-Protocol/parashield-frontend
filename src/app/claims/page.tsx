'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useClaims } from '@/hooks/useClaims';
import { ConnectWalletPrompt } from '@/components/ConnectWalletPrompt';
import { ClaimHistoryTable } from '@/components/ClaimHistoryTable';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SkeletonTable } from '@/components/Skeleton';
import { LoadingRegion } from '@/components/LoadingRegion';
import { Breadcrumb } from '@/components/Breadcrumb';
import { downloadClaimsCSV, downloadClaimsJSON } from '@/lib/claimsExport';

export default function ClaimsPage() {
  const { address, connected } = useWallet();
  const {
    claims,
    loading,
    error,
    pollingError,
    refetch,
    paused,
    togglePause,
    secondsUntilRefresh,
    secondsSinceRefresh,
  } = useClaims(address);
  const [refreshing, setRefreshing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const exportMenuRef   = useRef<HTMLDivElement>(null);
  // Which item to focus when the menu opens: ArrowUp on the trigger opens on
  // the last item, everything else on the first (WAI-ARIA menu button).
  const exportFocusRef  = useRef<'first' | 'last'>('first');

  const closeExport = useCallback((restoreFocus: boolean) => {
    setExportOpen(false);
    if (restoreFocus) exportButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!exportOpen) return;
    const items = exportMenuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    items?.[exportFocusRef.current === 'last' ? items.length - 1 : 0]?.focus();
    exportFocusRef.current = 'first';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeExport(true);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [exportOpen, closeExport]);

  const handleExportTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      exportFocusRef.current = e.key === 'ArrowUp' ? 'last' : 'first';
      setExportOpen(true);
    }
  };

  const handleExportMenuKeyDown = (e: React.KeyboardEvent) => {
    const items = Array.from(
      exportMenuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    let next: number | null = null;
    if (e.key === 'ArrowDown') next = (current + 1) % items.length;
    else if (e.key === 'ArrowUp') next = (current - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else if (e.key === 'Tab') closeExport(false);

    if (next !== null) {
      e.preventDefault();
      items[next].focus();
    }
  };

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Claim History</h1>
          <p className="mt-1 text-sm text-gray-400">
            All claims submitted from your connected wallet
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            {claims.length > 0 && (
              <div className="relative">
                <button
                  ref={exportButtonRef}
                  onClick={() => setExportOpen((o) => !o)}
                  onKeyDown={handleExportTriggerKeyDown}
                  disabled={loading}
                  aria-haspopup="menu"
                  aria-expanded={exportOpen}
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-xs text-gray-300 hover:border-white/20 hover:text-white disabled:opacity-60 transition-colors"
                >
                  ↓ Export
                </button>
                {exportOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                    {/* Left-anchored on mobile (the controls are left-aligned there) and
                        capped to the viewport so it never overflows the screen edge (#546). */}
                    <div className="absolute left-0 z-30 mt-1 w-40 max-w-[calc(100vw-3rem)] rounded-xl border border-white/10 bg-gray-900 py-1 shadow-xl sm:left-auto sm:right-0"
                      ref={exportMenuRef}
                      role="menu"
                      aria-label="Export format"
                      onKeyDown={handleExportMenuKeyDown}
                    >
                      <button
                        role="menuitem"
                        tabIndex={-1}
                        onClick={() => { downloadClaimsCSV(claims); closeExport(true); }}
                        className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-white/[0.05] hover:text-white focus:bg-white/[0.05] focus:text-white focus:outline-none transition-colors"
                      >
                        Download CSV
                      </button>
                      <button
                        role="menuitem"
                        tabIndex={-1}
                        onClick={() => { downloadClaimsJSON(claims); closeExport(true); }}
                        className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-white/[0.05] hover:text-white focus:bg-white/[0.05] focus:text-white focus:outline-none transition-colors"
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

      <LoadingRegion loading={loading} label="Loading claims">
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
        <>
          {pollingError && (
            <div className="mt-8 flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-400">
              <span>Connection lost — showing last known claims. {pollingError}</span>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-500/30 px-3 py-1 hover:bg-amber-500/10 disabled:opacity-60 transition-colors"
              >
                {refreshing && <LoadingSpinner size="sm" className="h-3 w-3 border-amber-400/30 border-t-amber-400" />}
                Retry
              </button>
            </div>
          )}
          <div className={`rounded-2xl border border-white/10 bg-white/[0.02] p-6 ${pollingError ? 'mt-3' : 'mt-8'}`}>
            <ClaimHistoryTable claims={claims} />
          </div>
        </>
      )}
      </LoadingRegion>
    </main>
  );
}

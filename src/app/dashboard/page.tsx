"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useWallet } from "@/hooks/useWallet";
import { usePolicies } from "@/hooks/usePolicies";
import { fetchUserClaims } from "@/lib/api";
import { ConnectWalletPrompt } from "@/components/ConnectWalletPrompt";
import { PolicyCard } from "@/components/PolicyCard";
import { Badge } from "@/components/Badge";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { formatUSDC, formatDateTime, safeBigInt } from "@/lib/format";
import { StatsCard } from "@/components/StatsCard";
import { TREND_PERIOD_SECONDS, computeTrend, policyStatsAt } from "@/lib/statsTrend";
import { WalletAddressDisplay } from "@/components/WalletAddressDisplay";
import { useToast } from "@/context/ToastContext";
import { useExpiryWarnings } from "@/hooks/useExpiryWarnings";
import type { Claim } from "@/types";
import Link from "next/link";

const TREND_SUBLABEL = "vs. 30 days ago";

export default function DashboardPage() {
  const { address, connected } = useWallet();
  const { policies, loading, error, refetch } = usePolicies(address);
  const { show: showToast } = useToast();
  const [recentClaims, setRecentClaims] = useState<Claim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);

  const loadRecentClaims = useCallback(async () => {
    if (!address) return;
    setClaimsLoading(true);
    try {
      const data = await fetchUserClaims(address);
      setRecentClaims(data.slice(0, 5));
    } catch {
      // silently ignore — non-critical
    } finally {
      setClaimsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (connected && !loading) {
      void loadRecentClaims();
    }
  }, [connected, loading, loadRecentClaims]);

  // Warn (once per policy per session) about policies expiring within 24 hours
  useExpiryWarnings(policies, connected && !loading, address, showToast);

  const active = useMemo(() => policies.filter((p) => p.status === "Active"), [policies]);
  const totalCov = useMemo(() => active.reduce((sum, p) => sum + safeBigInt(p.coverage), 0n), [active]);
  const totalPaid = useMemo(() => active.reduce((sum, p) => sum + safeBigInt(p.premiumPaid), 0n), [active]);

  // Trend vs. TREND_PERIOD_SECONDS ago, rebuilt from policy timestamps (#688).
  const trends = useMemo(() => {
    const previous = policyStatsAt(policies, Math.floor(Date.now() / 1000) - TREND_PERIOD_SECONDS);
    return {
      active:   computeTrend(active.length, previous.active),
      total:    computeTrend(policies.length, previous.total),
      coverage: computeTrend(totalCov, previous.coverage),
      premiums: computeTrend(totalPaid, previous.premiums),
    };
  }, [policies, active, totalCov, totalPaid]);

  // Must stay below every hook: returning earlier changed the hook count
  // between renders whenever the wallet connected or disconnected.
  if (!connected) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-20">
        <ConnectWalletPrompt message="Connect your wallet to view your dashboard" />
      </main>
    );
  }


  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <WalletAddressDisplay full className="mt-1" />
        </div>
        <button
          onClick={() => {
            void refetch();
            void loadRecentClaims();
          }}
          disabled={loading}
          className="rounded-lg bg-teal-500 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-400 disabled:opacity-60 transition-colors flex items-center gap-2"
        >
          {loading && <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-teal-300 border-t-teal-100" />}
          Refresh
        </button>
      </div>

      {/* Stats */}
      {error ? (
        <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="rounded-xl bg-teal-500 px-6 py-2.5 font-semibold text-white hover:bg-teal-400 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatsCard
            label="Active policies"
            value={loading ? <Skeleton className="h-8 w-20" /> : active.length.toString()}
            {...(loading ? {} : trends.active)}
            sublabel={loading ? undefined : TREND_SUBLABEL}
          />
          <StatsCard
            label="Total policies"
            value={loading ? <Skeleton className="h-8 w-20" /> : policies.length.toString()}
            {...(loading ? {} : trends.total)}
            sublabel={loading ? undefined : TREND_SUBLABEL}
          />
          <StatsCard
            label="Total coverage"
            value={loading ? <Skeleton className="h-8 w-24" /> : formatUSDC(totalCov)}
            {...(loading ? {} : trends.coverage)}
            sublabel={loading ? undefined : TREND_SUBLABEL}
          />
          <StatsCard
            label="Total premiums"
            value={loading ? <Skeleton className="h-8 w-24" /> : formatUSDC(totalPaid)}
            {...(loading ? {} : trends.premiums)}
            sublabel={loading ? undefined : TREND_SUBLABEL}
          />
        </div>
      )}

      {/* Active policies */}
      <div className="mt-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold">Active Policies</h2>
          <Link
            href="/policies"
            className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
          >
            View all {active.length > 6 ? `(${active.length}) ` : ""}→
          </Link>
        </div>

        {loading ? (
          <div className="grid-fluid-cards gap-4">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-gray-400">Unable to load policies — {error}</p>
        ) : active.length === 0 ? (
          <EmptyState
            icon="🛡️"
            title="No active policies"
            description="Browse our insurance products and buy your first policy."
            action={
              <Link
                href="/"
                className="rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-400 transition-colors"
              >
                Browse products
              </Link>
            }
          />
        ) : (
          <div className="grid-fluid-cards gap-4">
            {active.slice(0, 6).map((p) => (
              <PolicyCard key={p.id} policy={p} />
            ))}
          </div>
        )}
      </div>

      {/* Recent claims */}
      <div className="mt-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold">Recent Claims</h2>
          <Link
            href="/claims"
            className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
          >
            View all →
          </Link>
        </div>

        {claimsLoading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : recentClaims.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No claims yet"
            description="When you file a claim on one of your active policies, it will appear here."
            actionLabel="Browse policies"
            actionHref="/policies"
          />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] max-md:border-0 max-md:bg-transparent">
            {/* Stacks into cards below `md` while keeping table semantics (#754). */}
            <table role="table" className="responsive-table w-full text-sm">
              <thead role="rowgroup">
                <tr role="row" className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-400">
                  <th role="columnheader" scope="col" className="px-6 py-3">Claim ID</th>
                  <th role="columnheader" scope="col" className="px-6 py-3">Submitted</th>
                  <th role="columnheader" scope="col" className="px-6 py-3">Payout</th>
                  <th role="columnheader" scope="col" className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {recentClaims.map((claim) => (
                  <tr
                    key={claim.id}
                    role="row"
                    className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                  >
                    <td role="cell" data-label="Claim ID" className="px-6 py-4 font-mono text-xs text-gray-400">
                      <Link
                        href={`/policies/${claim.policyId}`}
                        aria-label={`View policy for claim ${claim.id}`}
                        className="rounded-sm text-teal-400 transition-colors hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                      >
                        {claim.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td role="cell" data-label="Submitted" className="px-6 py-4 text-xs text-gray-400">
                      {formatDateTime(claim.submittedAt)}
                    </td>
                    <td role="cell" data-label="Payout" className="px-6 py-4 text-xs font-semibold text-emerald-400">
                      {claim.payoutAmount ? formatUSDC(claim.payoutAmount) : '—'}
                    </td>
                    <td role="cell" data-label="Status" className="px-6 py-4">
                      <Badge label={claim.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            href: "/claims",
            icon: "📋",
            title: "Claim History",
            desc: "View all your submitted claims and their status.",
          },
          {
            href: "/oracle",
            icon: "🌐",
            title: "Oracle Status",
            desc: "Live data feeds powering the trigger conditions.",
          },
          {
            href: "/pools",
            icon: "💧",
            title: "Risk Pools",
            desc: "Provide liquidity and earn yield as an underwriter.",
          },
        ].map(({ href, icon, title, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all hover:border-white/20 hover:bg-white/[0.05]"
          >
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="font-semibold text-white">{title}</p>
              <p className="mt-1 text-xs text-gray-400 leading-relaxed">
                {desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

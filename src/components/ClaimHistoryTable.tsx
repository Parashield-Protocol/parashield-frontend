'use client';

import Link from 'next/link';
import { memo, useMemo, useState } from 'react';
import { Badge } from './Badge';
import { EmptyState } from './EmptyState';
import { TransactionLink } from './TransactionLink';
import type { Claim } from '@/types';
import { formatUSDC, formatDateTime } from '@/lib/format';

interface ClaimHistoryTableProps {
  claims:    Claim[];
  className?: string;
}

function ClaimHistoryTableComponent({ claims, className }: ClaimHistoryTableProps) {
  type SortColumn = 'submittedAt' | 'status' | 'payoutAmount' | 'triggerMet';
  type SortDirection = 'asc' | 'desc';

  // Presentational only: claims are fetched by useClaims in the page. Sorting is
  // derived via useMemo so parent re-renders reuse the same ordered array
  // identity whenever `claims` and `sort` are unchanged (#737).
  const [sort, setSort] = useState<{ column: SortColumn; direction: SortDirection }>({
    column: 'submittedAt',
    direction: 'desc',
  });

  const sortedClaims = useMemo(() => {
    const compareValues = (a: Claim, b: Claim): number => {
      switch (sort.column) {
        case 'submittedAt':
          return a.submittedAt - b.submittedAt;
        case 'status':
          return a.status.localeCompare(b.status);
        case 'payoutAmount': {
          const aValue = a.payoutAmount ? BigInt(a.payoutAmount) : null;
          const bValue = b.payoutAmount ? BigInt(b.payoutAmount) : null;
          if (aValue === null && bValue === null) return 0;
          if (aValue === null) return 1;
          if (bValue === null) return -1;
          if (aValue === bValue) return 0;
          return aValue < bValue ? -1 : 1;
        }
        case 'triggerMet':
          return Number(a.triggerMet) - Number(b.triggerMet);
      }

      return 0;
    };

    const direction = sort.direction === 'asc' ? 1 : -1;

    return claims
      .map((claim, index) => ({ claim, index }))
      .sort((left, right) => {
        const primary = compareValues(left.claim, right.claim);
        if (primary !== 0) {
          return primary * direction;
        }
        return left.index - right.index;
      })
      .map(({ claim }) => claim);
  }, [claims, sort]);

  const toggleSort = (column: SortColumn) => {
    setSort((current) => {
      if (current.column === column) {
        return {
          column,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return {
        column,
        direction: column === 'status' ? 'asc' : 'desc',
      };
    });
  };

  const sortIndicator = (column: SortColumn) => {
    if (sort.column !== column) return null;
    return sort.direction === 'asc' ? '↑' : '↓';
  };

  if (!claims.length) {
    return (
      <EmptyState
        icon="📋"
        title="No claims yet"
        description="When you submit a claim, it will appear here with its current status."
        className={className}
      />
    );
  }

  return (
    <div className={`${className ?? ''}`}>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-400">
              <th className="pb-3 pr-4">Claim ID</th>
              <th className="pb-3 pr-4">Policy</th>
              <th
                className="pb-3 pr-4"
                aria-sort={sort.column === 'triggerMet' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <button
                  type="button"
                  onClick={() => toggleSort('triggerMet')}
                  className={`inline-flex items-center gap-1 transition-colors hover:text-white ${
                    sort.column === 'triggerMet' ? 'text-white' : ''
                  }`}
                >
                  Trigger {sortIndicator('triggerMet')}
                </button>
              </th>
              <th
                className="pb-3 pr-4"
                aria-sort={sort.column === 'payoutAmount' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <button
                  type="button"
                  onClick={() => toggleSort('payoutAmount')}
                  className={`inline-flex items-center gap-1 transition-colors hover:text-white ${
                    sort.column === 'payoutAmount' ? 'text-white' : ''
                  }`}
                >
                  Payout {sortIndicator('payoutAmount')}
                </button>
              </th>
              <th
                className="pb-3 pr-4"
                aria-sort={sort.column === 'submittedAt' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <button
                  type="button"
                  onClick={() => toggleSort('submittedAt')}
                  className={`inline-flex items-center gap-1 transition-colors hover:text-white ${
                    sort.column === 'submittedAt' ? 'text-white' : ''
                  }`}
                >
                  Submitted {sortIndicator('submittedAt')}
                </button>
              </th>
              <th className="pb-3 pr-4">Tx</th>
              <th
                className="pb-3"
                aria-sort={sort.column === 'status' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <button
                  type="button"
                  onClick={() => toggleSort('status')}
                  className={`inline-flex items-center gap-1 transition-colors hover:text-white ${
                    sort.column === 'status' ? 'text-white' : ''
                  }`}
                >
                  Status {sortIndicator('status')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedClaims.map((claim) => (
              <tr
                key={claim.id}
                className="relative border-b border-white/5 transition-colors hover:bg-white/[0.02]"
              >
                <td className="py-4 pr-4 font-mono text-xs text-gray-400">
                  <Link
                    href={`/policies/${claim.policyId}`}
                    aria-label={`View policy for claim ${claim.id}`}
                    className="rounded-sm transition-colors before:absolute before:inset-0 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    {claim.id.slice(0, 8)}…
                  </Link>
                </td>
                <td className="py-4 pr-4 font-mono text-xs">
                  <Link
                    href={`/policies/${claim.policyId}`}
                    className="relative z-10 rounded-sm text-teal-400 transition-colors hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                  >
                    {claim.policyId.slice(0, 8)}…
                  </Link>
                </td>
                <td className="py-4 pr-4">
                  <span className={`text-xs font-semibold ${claim.triggerMet ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {claim.triggerMet ? '✓ Met' : '✕ Not met'}
                  </span>
                </td>
                <td className="py-4 pr-4 text-xs font-semibold text-emerald-400">
                  {claim.payoutAmount ? formatUSDC(claim.payoutAmount) : '—'}
                </td>
                <td className="py-4 pr-4 text-xs text-gray-400">
                  {formatDateTime(claim.submittedAt)}
                </td>
                <td className="py-4 pr-4">
                  {claim.txHash ? (
                    <TransactionLink txHash={claim.txHash} className="relative z-10" />
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="py-4">
                  <Badge label={claim.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-3">
        {sortedClaims.map((claim) => (
          <div
            key={claim.id}
            className="relative rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3 transition-colors hover:border-white/20"
          >
            <div className="flex items-center justify-between">
              <Link
                href={`/policies/${claim.policyId}`}
                aria-label={`View policy for claim ${claim.id}`}
                className="rounded-sm font-mono text-xs text-gray-400 before:absolute before:inset-0 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              >
                {claim.id.slice(0, 8)}…
              </Link>
              <Badge label={claim.status} />
            </div>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
              <span className="text-gray-400">Policy</span>
              <Link
                href={`/policies/${claim.policyId}`}
                className="relative z-10 truncate rounded-sm font-mono text-teal-400 transition-colors hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              >
                {claim.policyId.slice(0, 8)}…
              </Link>
              <span className="text-gray-400">Trigger</span>
              <span className={claim.triggerMet ? 'font-semibold text-emerald-400' : 'text-gray-400'}>
                {claim.triggerMet ? '✓ Met' : '✕ Not met'}
              </span>
              <span className="text-gray-400">Payout</span>
              <span className="font-semibold text-emerald-400">
                {claim.payoutAmount ? formatUSDC(claim.payoutAmount) : '—'}
              </span>
              <span className="text-gray-400">Submitted</span>
              <span className="text-gray-400">{formatDateTime(claim.submittedAt)}</span>
              <span className="text-gray-400">Tx</span>
              <span>
                {claim.txHash ? (
                  <TransactionLink txHash={claim.txHash} className="relative z-10" />
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const ClaimHistoryTable = memo(ClaimHistoryTableComponent);

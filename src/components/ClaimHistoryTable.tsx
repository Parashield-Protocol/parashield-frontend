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

  const ariaSort = (column: SortColumn) =>
    sort.column === column ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none';

  const sortHeader = (column: SortColumn, label: string, className: string) => (
    <th role="columnheader" scope="col" className={className} aria-sort={ariaSort(column)}>
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className={`inline-flex items-center gap-1 transition-colors hover:text-white ${
          sort.column === column ? 'text-white' : ''
        }`}
      >
        {label} {sortIndicator(column)}
      </button>
    </th>
  );

  // One <table> at every viewport: below `md` the `.responsive-table` CSS
  // stacks each row into a card and renders each cell's `data-label`, so
  // screen readers keep table navigation on mobile (#754). Explicit roles
  // guard against engines that drop semantics when `display` changes.
  return (
    <div className={`overflow-x-auto ${className ?? ''}`}>
      <table role="table" className="responsive-table w-full text-sm">
        <thead role="rowgroup">
          <tr role="row" className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-400">
            <th role="columnheader" scope="col" className="pb-3 pr-4">Claim ID</th>
            <th role="columnheader" scope="col" className="pb-3 pr-4">Policy</th>
            {sortHeader('triggerMet', 'Trigger', 'pb-3 pr-4')}
            {sortHeader('payoutAmount', 'Payout', 'pb-3 pr-4')}
            {sortHeader('submittedAt', 'Submitted', 'pb-3 pr-4')}
            <th role="columnheader" scope="col" className="pb-3 pr-4">Tx</th>
            {sortHeader('status', 'Status', 'pb-3')}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {sortedClaims.map((claim) => (
            <tr
              key={claim.id}
              role="row"
              className="relative border-b border-white/5 transition-colors hover:bg-white/[0.02]"
            >
              <td role="cell" data-label="Claim ID" className="py-4 pr-4 font-mono text-xs text-gray-400">
                <Link
                  href={`/policies/${claim.policyId}`}
                  aria-label={`View policy for claim ${claim.id}`}
                  className="rounded-sm transition-colors before:absolute before:inset-0 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  {claim.id.slice(0, 8)}…
                </Link>
              </td>
              <td role="cell" data-label="Policy" className="py-4 pr-4 font-mono text-xs">
                <Link
                  href={`/policies/${claim.policyId}`}
                  className="relative z-10 rounded-sm text-teal-400 transition-colors hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                >
                  {claim.policyId.slice(0, 8)}…
                </Link>
              </td>
              <td role="cell" data-label="Trigger" className="py-4 pr-4">
                <span className={`text-xs font-semibold ${claim.triggerMet ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {claim.triggerMet ? '✓ Met' : '✕ Not met'}
                </span>
              </td>
              <td role="cell" data-label="Payout" className="py-4 pr-4 text-xs font-semibold text-emerald-400">
                {claim.payoutAmount ? formatUSDC(claim.payoutAmount) : '—'}
              </td>
              <td role="cell" data-label="Submitted" className="py-4 pr-4 text-xs text-gray-400">
                {formatDateTime(claim.submittedAt)}
              </td>
              <td role="cell" data-label="Tx" className="py-4 pr-4">
                {claim.txHash ? (
                  <TransactionLink txHash={claim.txHash} className="relative z-10" />
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </td>
              <td role="cell" data-label="Status" className="py-4">
                <Badge label={claim.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const ClaimHistoryTable = memo(ClaimHistoryTableComponent);

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from './Badge';
import { EmptyState } from './EmptyState';
import { TransactionLink } from './TransactionLink';
import type { Claim } from '@/types';
import { formatUSDC, formatDateTime } from '@/lib/format';

interface ClaimHistoryTableProps {
  claims:    Claim[];
  className?: string;
}

export function ClaimHistoryTable({ claims, className }: ClaimHistoryTableProps) {
  type SortColumn = 'submittedAt' | 'status' | 'payoutAmount' | 'triggerMet';
  type SortDirection = 'asc' | 'desc';

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
        if (sort.column === 'payoutAmount') {
          const leftValue = left.claim.payoutAmount ? BigInt(left.claim.payoutAmount) : null;
          const rightValue = right.claim.payoutAmount ? BigInt(right.claim.payoutAmount) : null;

          if (leftValue === null && rightValue === null) {
            return left.index - right.index;
          }

          if (leftValue === null) return 1;
          if (rightValue === null) return -1;

          if (leftValue !== rightValue) {
            const payoutDirection = sort.direction === 'asc' ? 1 : -1;
            return (leftValue < rightValue ? -1 : 1) * payoutDirection;
          }
        }

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
    <div className={`overflow-x-auto ${className ?? ''}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-500">
            <th className="pb-3 pr-4">Claim ID</th>
            <th className="pb-3 pr-4">Policy</th>
            <th className="pb-3 pr-4">
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
            <th className="pb-3 pr-4">
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
            <th className="pb-3 pr-4">
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
            <th className="pb-3">
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
              className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
            >
              <td className="py-4 pr-4 font-mono text-xs text-gray-400">
                {claim.id.slice(0, 8)}…
              </td>
              <td className="py-4 pr-4 font-mono text-xs">
                <Link
                  href={`/policies/${claim.policyId}`}
                  className="text-teal-400 hover:text-teal-300 transition-colors"
                >
                  {claim.policyId.slice(0, 8)}…
                </Link>
              </td>
              <td className="py-4 pr-4">
                <span className={`text-xs font-semibold ${claim.triggerMet ? 'text-emerald-400' : 'text-gray-500'}`}>
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
                {claim.txHash && claim.status === 'Paid' ? (
                  <TransactionLink txHash={claim.txHash} />
                ) : (
                  <span className="text-xs text-gray-500">—</span>
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
  );
}

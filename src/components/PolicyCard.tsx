'use client';

import Link from 'next/link';
import { memo } from 'react';
import { Badge } from './Badge';
import type { Policy } from '@/types';
import { formatUSDC, formatDate, timeLeft } from '@/lib/format';
import { CATEGORY_ICONS } from '@/lib/constants';

interface PolicyCardProps {
  policy: Policy;
}

function PolicyCardComponent({ policy }: PolicyCardProps) {
  const icon       = policy.product ? CATEGORY_ICONS[policy.product.category] ?? '🛡️' : '🛡️';
  const name       = policy.product?.name ?? `Policy #${policy.id.slice(0, 8)}`;
  const isActive   = policy.status === 'Active';

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // Navigate to policy detail page
      window.location.href = `/policies/${policy.id}`;
    }
  };

  let expiresLabel: string;
  let expiresValue: string;
  if (isActive) {
    expiresLabel = 'Expires';
    expiresValue = timeLeft(policy.endTime);
  } else if (policy.status === 'Cancelled') {
    expiresLabel = 'Cancelled';
    expiresValue = policy.cancelledAt ? formatDate(policy.cancelledAt) : formatDate(policy.endTime);
  } else if (policy.status === 'Claimed') {
    expiresLabel = 'Claimed';
    expiresValue = formatDate(policy.endTime);
  } else {
    expiresLabel = 'Expired';
    expiresValue = formatDate(policy.endTime);
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => { window.location.href = `/policies/${policy.id}`; }}
      onKeyDown={handleCardKeyDown}
      aria-label={`${name} — ${policy.status} — View details`}
      className={`flex flex-col rounded-2xl border p-5 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
      isActive
        ? 'border-teal-500/20 bg-teal-500/5 hover:border-teal-500/40'
        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl">{icon}</span>
        <Badge label={policy.status} />
      </div>

      <h3 className="mt-3 text-sm font-semibold leading-snug text-white">{name}</h3>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-gray-400">Coverage</dt>
          <dd className="mt-0.5 font-semibold text-emerald-400">{formatUSDC(policy.coverage)}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Premium paid</dt>
          <dd className="mt-0.5 font-semibold">{formatUSDC(policy.premiumPaid)}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Start date</dt>
          <dd className="mt-0.5 text-gray-300">{formatDate(policy.startTime)}</dd>
        </div>
        <div>
          <dt className="text-gray-400">{expiresLabel}</dt>
          <dd className={`mt-0.5 font-semibold ${isActive ? 'text-amber-400' : 'text-gray-400'}`}>
            {expiresValue}
          </dd>
        </div>
      </dl>

      <Link
        href={`/policies/${policy.id}`}
        className="mt-4 block w-full rounded-xl border border-white/10 py-2 text-center text-xs font-semibold text-gray-300 transition-colors hover:border-white/20 hover:text-white"
      >
        View details →
      </Link>
    </div>
  );
}

export const PolicyCard = memo(PolicyCardComponent);

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { memo, useCallback } from 'react';
import { Badge } from './Badge';
import type { Policy } from '@/types';
import { formatUSDC, formatDate, formatDateTime, timeLeft } from '@/lib/format';
import { CATEGORY_ICONS } from '@/lib/constants';
import { EXPIRY_WARNING_MS } from '@/hooks/useExpiryWarnings';

/**
 * Whether an Active policy ends within the next 24h (#680), the same window
 * useExpiryWarnings uses for its toast. `endTime` is unix seconds.
 */
export function isExpiringSoon(policy: Policy, nowMs: number = Date.now()): boolean {
  if (policy.status !== 'Active') return false;
  const remainingMs = policy.endTime * 1000 - nowMs;
  return remainingMs > 0 && remainingMs < EXPIRY_WARNING_MS;
}

/**
 * Format a coverage amount, or "Invalid" (with a console warning) when it is
 * negative or not an integer stroop value — never render a bad amount as-is (#715).
 */
export function formatCoverage(stroops: string | bigint, policyId: string): string {
  let value: bigint;
  try {
    value = typeof stroops === 'bigint' ? stroops : BigInt(stroops);
  } catch {
    console.warn(`PolicyCard: unparseable coverage "${String(stroops)}" for policy ${policyId}`);
    return 'Invalid';
  }
  if (value < BigInt(0)) {
    console.warn(`PolicyCard: negative coverage ${value} for policy ${policyId}`);
    return 'Invalid';
  }
  return formatUSDC(value);
}

interface PolicyCardProps {
  policy: Policy;
}

function PolicyCardComponent({ policy }: PolicyCardProps) {
  const router = useRouter();
  const icon       = policy.product ? CATEGORY_ICONS[policy.product.category] ?? '🛡️' : '🛡️';
  const name       = policy.product?.name ?? `Policy #${policy.id.slice(0, 8)}`;
  const isActive   = policy.status === 'Active';
  const expiringSoon = isExpiringSoon(policy);
  const policyHref = `/policies/${policy.id}`;
  const coverage   = formatCoverage(policy.coverage, policy.id);
  const coverageClass = coverage === 'Invalid' ? 'text-red-400' : 'text-emerald-400';

  const navigateToPolicy = useCallback(() => {
    router.push(policyHref);
  }, [router, policyHref]);

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigateToPolicy();
    }
  };

  // Active shows a relative countdown; every other status shows an absolute
  // date, since "time left" isn't meaningful once a policy is no longer
  // active. Rather than forcing one format everywhere, every value carries
  // the absolute date as a title tooltip too (#474), so the countdown case
  // is never ambiguous about the actual date.
  let expiresLabel: string;
  let expiresValue: string;
  let expiresTitle: string;
  if (isActive) {
    expiresLabel = 'Expires';
    expiresValue = timeLeft(policy.endTime);
    expiresTitle = formatDateTime(policy.endTime);
  } else if (policy.status === 'Cancelled') {
    expiresLabel = 'Cancelled';
    const cancelledOrEnd = policy.cancelledAt ?? policy.endTime;
    expiresValue = formatDate(cancelledOrEnd);
    expiresTitle = formatDateTime(cancelledOrEnd);
  } else if (policy.status === 'Claimed') {
    expiresLabel = 'Claimed';
    expiresValue = formatDate(policy.endTime);
    expiresTitle = formatDateTime(policy.endTime);
  } else {
    expiresLabel = 'Expired';
    expiresValue = formatDate(policy.endTime);
    expiresTitle = formatDateTime(policy.endTime);
  }

  return (
    <div className="group relative">
      <div
        role="link"
        tabIndex={0}
        onClick={navigateToPolicy}
        onKeyDown={handleCardKeyDown}
        aria-label={`${name} — ${policy.status} — View details`}
        className={`flex flex-col rounded-2xl border p-5 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
        isActive
          ? 'border-teal-500/20 bg-teal-500/5 hover:border-teal-500/40'
          : 'border-white/10 bg-white/[0.02] hover:border-white/20'
      }`}>
        <div className="flex items-start justify-between gap-2">
          <span className="text-2xl">{icon}</span>
          {expiringSoon ? (
            // Distinct amber badge + exact time on hover for policies that
            // need attention within 24h (#680).
            <span title={`Expires ${formatDateTime(policy.endTime)}`}>
              <Badge label="Expiring soon" variant="amber" icon="⚠" />
            </span>
          ) : (
            <Badge label={policy.status} />
          )}
        </div>

      <h3 className="mt-3 text-sm font-semibold leading-snug text-white">{name}</h3>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-gray-400">Coverage</dt>
          <dd className={`mt-0.5 font-semibold ${coverageClass}`}>{coverage}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Premium paid</dt>
          <dd className="mt-0.5 font-semibold">{policy.premiumPaid != null ? formatUSDC(policy.premiumPaid) : '—'}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Start date</dt>
          <dd className="mt-0.5 text-gray-300">{formatDate(policy.startTime)}</dd>
        </div>
        <div>
          <dt className="text-gray-400">{expiresLabel}</dt>
          <dd
            title={expiresTitle}
            className={`mt-0.5 font-semibold ${isActive ? 'text-amber-400' : 'text-gray-400'}`}
          >
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

      {/* Hover tooltip */}
      <div className="pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-full opacity-0 transition-opacity duration-150 group-hover:opacity-100 mb-2 w-72 rounded-xl border border-white/10 bg-gray-900 p-4 shadow-2xl">
        <p className="text-xs font-semibold text-white mb-2">Full Details</p>
        <dl className="space-y-1.5 text-[11px]">
          <div className="flex justify-between gap-2">
            <dt className="text-gray-400 shrink-0">Policyholder</dt>
            <dd className="font-mono text-gray-200 truncate" title={policy.policyholder}>{policy.policyholder}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-gray-400 shrink-0">Start</dt>
            <dd className="text-gray-200">{formatDateTime(policy.startTime)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-gray-400 shrink-0">End</dt>
            <dd className="text-gray-200">{formatDateTime(policy.endTime)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-gray-400 shrink-0">Coverage</dt>
            <dd className={`${coverageClass} font-semibold`}>{coverage}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-gray-400 shrink-0">Premium</dt>
            <dd className="text-gray-200">{policy.premiumPaid != null ? formatUSDC(policy.premiumPaid) : '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-gray-400 shrink-0">Oracle</dt>
            <dd className="font-mono text-gray-200 truncate" title={policy.oracleKey}>{policy.oracleKey}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export const PolicyCard = memo(PolicyCardComponent);

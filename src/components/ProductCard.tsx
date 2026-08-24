'use client';

import { useState } from 'react';
import type { Product } from '@/types';
import { BuyPolicyModal } from './BuyPolicyModal';
import { Badge } from './Badge';
import { TriggerConditionBadge } from './TriggerConditionBadge';
import { basisPointsToPercent, formatUSDC } from '@/lib/format';
import { CATEGORY_ICONS } from '@/lib/constants';

interface ProductCardProps {
  product: Product;
  compareSelected?: boolean;
  onCompareToggle?: (product: Product) => void;
}

export function ProductCard({ product, compareSelected, onCompareToggle }: ProductCardProps) {
  const [open, setOpen] = useState(false);
  const icon            = CATEGORY_ICONS[product.category] ?? '🛡️';
  const isActive        = product.status === 'Active';

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isActive) setOpen(true);
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => isActive && setOpen(true)}
        onKeyDown={handleCardKeyDown}
        aria-label={`${product.name} — ${isActive ? 'Buy Policy' : product.status}`}
        className={`flex flex-col rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] p-6 transition-all hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-100 dark:hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${!isActive ? 'opacity-60' : ''}`}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="text-3xl">{icon}</span>
          <div className="flex items-center gap-2">
            {onCompareToggle && (
              <label
                className="flex items-center gap-1.5 text-xs text-gray-400"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={!!compareSelected}
                  onChange={() => onCompareToggle(product)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-teal-500 focus:ring-teal-500"
                />
                Compare
              </label>
            )}
            <Badge label={product.category} variant="teal" />
            {!isActive && <Badge label={product.status} />}
          </div>
        </div>

        <h3 className="mt-4 text-base font-semibold leading-snug text-gray-950 dark:text-white">{product.name}</h3>

        <div className="mt-2">
          <TriggerConditionBadge product={product} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-gray-100 dark:bg-white/5 p-3">
            <dt className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">Premium</dt>
            <dd className="mt-0.5 font-semibold text-teal-400">
              {basisPointsToPercent(product.premiumRate)}
            </dd>
          </div>
          <div className="rounded-xl bg-gray-100 dark:bg-white/5 p-3">
            <dt className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">Max Coverage</dt>
            <dd className="mt-0.5 font-semibold text-gray-950 dark:text-white">{formatUSDC(product.coverageMax)}</dd>
          </div>
        </dl>

        <button
          onClick={() => setOpen(true)}
          disabled={!isActive}
          className={`mt-6 w-full rounded-xl py-2.5 text-sm font-semibold transition-colors ${
            isActive
              ? 'bg-teal-500 text-white hover:bg-teal-400'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {isActive ? 'Buy Policy' : product.status === 'Paused' ? 'Temporarily unavailable' : 'No longer available'}
        </button>
      </div>

      {open && <BuyPolicyModal product={product} onClose={() => setOpen(false)} />}
    </>
  );
}

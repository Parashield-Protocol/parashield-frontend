'use client';

import { memo, useCallback, useState } from 'react';
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

function ProductCardComponent({ product, compareSelected, onCompareToggle }: ProductCardProps) {
  const [open, setOpen] = useState(false);
  const icon            = CATEGORY_ICONS[product.category] ?? '🛡️';
  const isActive        = product.status === 'Active';

  const handleCompareChange = useCallback(() => {
    onCompareToggle?.(product);
  }, [onCompareToggle, product]);

  return (
    <>
      {/* Not role="button" (#668): a button's children are presentational to
          assistive tech, which hid the nested Compare checkbox from screen
          readers. Clicking anywhere still opens the modal for mouse users;
          keyboard users get the real "Buy Policy" button below. */}
      {/* Clickable affordance (#783): active cards get a pointer cursor, lift
          and teal border on hover. The card itself isn't focusable (see above),
          so keyboard users get the same border + ring via has-[:focus-visible]
          when any control inside it has keyboard focus. */}
      <div
        data-testid="product-card"
        onClick={() => isActive && setOpen(true)}
        className={`flex flex-col rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] p-6 transition-all duration-200 motion-reduce:transition-none ${
          isActive
            ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:shadow-teal-500/10 hover:border-teal-500/40 dark:hover:border-teal-400/40 hover:bg-gray-100 dark:hover:bg-white/[0.05] motion-reduce:hover:translate-y-0 has-[:focus-visible]:border-teal-500/60 dark:has-[:focus-visible]:border-teal-400/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-400/40'
            : 'cursor-default opacity-60'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="text-3xl">{icon}</span>
          <div className="flex items-center gap-2">
            {onCompareToggle && (
              <label
                className="flex items-center gap-1.5 text-xs text-gray-400"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={!!compareSelected}
                  onChange={handleCompareChange}
                  aria-label={`Compare ${product.name}`}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-teal-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                />
                Compare
              </label>
            )}
            <Badge label={product.category} variant="teal" />
            {!isActive && <Badge label={product.status} />}
          </div>
        </div>

        <h3 className="mt-4 text-base font-semibold leading-snug text-gray-950 dark:text-white">{product.name}</h3>

        {product.description && (
          <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed" title={product.description}>
            {product.description}
          </p>
        )}

        <div className="mt-2">
          <TriggerConditionBadge product={product} />
        </div>

        <dl className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-3 text-sm">
          <div className="min-w-0 rounded-xl bg-gray-100 dark:bg-white/5 p-3">
            <dt className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">Premium</dt>
            <dd className="mt-0.5 font-semibold text-teal-400">
              {basisPointsToPercent(product.premiumRate)}
            </dd>
          </div>
          <div className="min-w-0 rounded-xl bg-gray-100 dark:bg-white/5 p-3">
            <dt className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">Min Coverage</dt>
            <dd className="mt-0.5 font-semibold text-gray-950 dark:text-white">{formatUSDC(product.coverageMin)}</dd>
          </div>
          <div className="min-w-0 rounded-xl bg-gray-100 dark:bg-white/5 p-3">
            <dt className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">Max Coverage</dt>
            <dd className="mt-0.5 font-semibold text-gray-950 dark:text-white">{formatUSDC(product.coverageMax)}</dd>
          </div>
        </dl>

        <button
          onClick={() => setOpen(true)}
          disabled={!isActive}
          aria-disabled={!isActive}
          aria-label={isActive ? 'Buy Policy' : `Buy Policy — ${product.status === 'Paused' ? 'temporarily unavailable' : 'no longer available'}`}
          className={`mt-6 w-full rounded-xl py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
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

export const ProductCard = memo(ProductCardComponent);

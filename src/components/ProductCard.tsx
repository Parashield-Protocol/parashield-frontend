'use client';

import { useState } from 'react';
import type { Product } from '@/types';
import { BuyPolicyModal } from './BuyPolicyModal';
import { Badge } from './Badge';
import { basisPointsToPercent, formatUSDC } from '@/lib/format';
import { CATEGORY_ICONS } from '@/lib/constants';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [open, setOpen] = useState(false);
  const icon            = CATEGORY_ICONS[product.category] ?? '🛡️';

  return (
    <>
      <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all hover:border-white/20 hover:bg-white/[0.05]">
        <div className="flex items-start justify-between gap-3">
          <span className="text-3xl">{icon}</span>
          <Badge label={product.category} variant="teal" />
        </div>

        <h3 className="mt-4 text-base font-semibold leading-snug text-white">{product.name}</h3>

        <p className="mt-2 text-sm text-gray-400">
          Trigger:{' '}
          <span className="font-mono text-white">
            {product.comparison === 'LessThan' ? '<' : product.comparison === 'GreaterThan' ? '>' : '='}
            {' '}{product.threshold}
          </span>
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white/5 p-3">
            <dt className="text-[10px] uppercase tracking-widest text-gray-500">Premium</dt>
            <dd className="mt-0.5 font-semibold text-teal-400">
              {basisPointsToPercent(product.premiumRate)}
            </dd>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <dt className="text-[10px] uppercase tracking-widest text-gray-500">Max Coverage</dt>
            <dd className="mt-0.5 font-semibold text-white">{product.coverageMax} USDC</dd>
          </div>
        </dl>

        <button
          onClick={() => setOpen(true)}
          className="mt-6 w-full rounded-xl bg-teal-500 py-2.5 text-sm font-semibold text-white hover:bg-teal-400 transition-colors"
        >
          Buy Policy
        </button>
      </div>

      {open && <BuyPolicyModal product={product} onClose={() => setOpen(false)} />}
    </>
  );
}

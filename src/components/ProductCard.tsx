'use client';

import { useState } from 'react';
import type { Product } from '@/lib/api';
import { BuyPolicyModal } from './BuyPolicyModal';

const CATEGORY_ICON: Record<string, string> = {
  crop:     '🌾',
  flight:   '✈️',
  disaster: '🌪️',
  health:   '🏥',
  defi:     '🔐',
};

const CATEGORY_COLOUR: Record<string, string> = {
  crop:     'emerald',
  flight:   'sky',
  disaster: 'amber',
  health:   'pink',
  defi:     'purple',
};

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [open, setOpen] = useState(false);
  const icon   = CATEGORY_ICON[product.category]   ?? '🛡️';
  const colour = CATEGORY_COLOUR[product.category] ?? 'gray';

  const premiumPct = (product.premiumRate / 100).toFixed(2);

  return (
    <>
      <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:border-white/20 hover:bg-white/[0.05] transition-all">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <span className="text-3xl">{icon}</span>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest bg-${colour}-500/10 text-${colour}-400`}
          >
            {product.category}
          </span>
        </div>

        <h3 className="mt-4 text-lg font-semibold leading-snug">{product.name}</h3>

        {/* Trigger */}
        <p className="mt-2 text-sm text-gray-400">
          Trigger:{' '}
          <span className="font-mono text-white">
            {product.comparison === 'LessThan' ? '<' : product.comparison === 'GreaterThan' ? '>' : '='}
            {' '}{product.threshold}
          </span>
        </p>

        {/* Stats */}
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white/5 p-3">
            <dt className="text-[10px] uppercase tracking-widest text-gray-500">Premium</dt>
            <dd className="mt-0.5 font-semibold text-emerald-400">{premiumPct}%</dd>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <dt className="text-[10px] uppercase tracking-widest text-gray-500">Max Coverage</dt>
            <dd className="mt-0.5 font-semibold">{product.coverageMax} USDC</dd>
          </div>
        </dl>

        <button
          onClick={() => setOpen(true)}
          className="mt-auto mt-6 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors"
        >
          Buy Policy
        </button>
      </div>

      {open && <BuyPolicyModal product={product} onClose={() => setOpen(false)} />}
    </>
  );
}

'use client';

import { CATEGORY_ICONS, CATEGORY_LABELS } from '@/lib/constants';
import type { Category } from '@/types';

type FilterValue = Category | 'all';

interface CategoryFilterProps {
  value:    FilterValue;
  onChange: (value: FilterValue) => void;
  className?: string;
}

const CATEGORIES: FilterValue[] = ['all', 'crop', 'flight', 'disaster', 'health', 'defi'];

export function CategoryFilter({ value, onChange, className }: CategoryFilterProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ''}`}>
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          aria-pressed={value === cat}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
            value === cat
              ? 'bg-teal-500 text-white'
              : 'border border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
          }`}
        >
          {cat !== 'all' && <span>{CATEGORY_ICONS[cat]}</span>}
          {cat === 'all' ? 'All products' : CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  );
}

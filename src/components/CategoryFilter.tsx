'use client';

import { useCallback, useRef } from 'react';
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
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let nextIndex: number | null = null;

      if (e.key === 'ArrowRight') {
        nextIndex = index === CATEGORIES.length - 1 ? 0 : index + 1;
      } else if (e.key === 'ArrowLeft') {
        nextIndex = index === 0 ? CATEGORIES.length - 1 : index - 1;
      } else if (e.key === 'Home') {
        nextIndex = 0;
      } else if (e.key === 'End') {
        nextIndex = CATEGORIES.length - 1;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        onChange(CATEGORIES[nextIndex]);
        tabRefs.current[nextIndex]?.focus();
      }
    },
    [onChange],
  );

  return (
    <div
      role="tablist"
      aria-label="Category filter"
      className={`flex flex-wrap gap-2 ${className ?? ''}`}
    >
      {CATEGORIES.map((cat, i) => (
        <button
          key={cat}
          ref={(el) => { tabRefs.current[i] = el; }}
          role="tab"
          aria-selected={value === cat}
          tabIndex={value === cat ? 0 : -1}
          onClick={() => onChange(cat)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
            value === cat
              ? 'bg-teal-500 text-white'
              : 'border border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
          }`}
        >
          {cat !== 'all' && <span>{CATEGORY_ICONS[cat]}</span>}
          {cat === 'all' ? 'All policies' : CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  );
}

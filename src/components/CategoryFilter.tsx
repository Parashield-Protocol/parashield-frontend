'use client';

import { memo, useCallback, useRef } from 'react';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '@/lib/constants';
import type { Category } from '@/types';

type FilterValue = Category | 'all';

interface CategoryFilterProps {
  value:    FilterValue;
  onChange: (value: FilterValue) => void;
  className?: string;
}

const CATEGORIES: FilterValue[] = ['all', 'crop', 'flight', 'disaster', 'health', 'defi'];

interface CategoryTabProps {
  cat:       FilterValue;
  index:     number;
  selected:  boolean;
  onSelect:  (index: number) => void;
  onKeyDown: (e: React.KeyboardEvent, index: number) => void;
  setRef:    (index: number, el: HTMLButtonElement | null) => void;
}

// Memoized so a filter change only re-renders the previously and newly
// selected tabs (#590). Every callback prop is stable across renders.
const CategoryTab = memo(function CategoryTab({
  cat, index, selected, onSelect, onKeyDown, setRef,
}: CategoryTabProps) {
  return (
    <button
      ref={(el) => setRef(index, el)}
      role="tab"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={() => onSelect(index)}
      onKeyDown={(e) => onKeyDown(e, index)}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
        selected
          ? 'bg-teal-500 text-white'
          : 'border border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
      }`}
    >
      {cat !== 'all' && <span>{CATEGORY_ICONS[cat]}</span>}
      {cat === 'all' ? 'All policies' : CATEGORY_LABELS[cat]}
    </button>
  );
});

export function CategoryFilter({ value, onChange, className }: CategoryFilterProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Read through a ref so the tab callbacks stay stable even when the parent
  // passes a new onChange each render, which would otherwise defeat memo().
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handleSelect = useCallback((index: number) => {
    onChangeRef.current(CATEGORIES[index]);
  }, []);

  const setRef = useCallback((index: number, el: HTMLButtonElement | null) => {
    tabRefs.current[index] = el;
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
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
      onChangeRef.current(CATEGORIES[nextIndex]);
      tabRefs.current[nextIndex]?.focus();
    }
  }, []);

  return (
    <div
      role="tablist"
      aria-label="Category filter"
      className={`flex flex-wrap gap-2 ${className ?? ''}`}
    >
      {CATEGORIES.map((cat, i) => (
        <CategoryTab
          key={cat}
          ref={(el) => { tabRefs.current[i] = el; }}
          role="tab"
          aria-selected={value === cat}
          aria-pressed={value === cat}
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

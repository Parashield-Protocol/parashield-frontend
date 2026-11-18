'use client';

import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchBarProps {
  onSearch:   (query: string) => void;
  placeholder?: string;
  className?:   string;
}

export function SearchBar({
  onSearch,
  placeholder = 'Search…',
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery   = useDebounce(query, 250);

  const onSearchRef  = useRef(onSearch);
  const clearedRef   = useRef(false);
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  useEffect(() => {
    // Skip the debounce flush if the user just hit clear — the clear
    // handler already called onSearch('') immediately, so firing again
    // with whatever stale value was in the debounce pipe is redundant.
    if (clearedRef.current) {
      clearedRef.current = false;
      return;
    }
    onSearchRef.current(debouncedQuery);
  }, [debouncedQuery]);

  function handleClear() {
    clearedRef.current = true;
    setQuery('');
    onSearchRef.current('');
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        🔍
      </span>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-gray-400 focus:border-teal-500 focus:outline-none"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white transition-colors"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}

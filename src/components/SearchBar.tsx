'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchBarProps {
  onSearch:   (query: string) => void;
  placeholder?: string;
  className?:   string;
  /** Delay before `onSearch` fires after the user stops typing. */
  debounceMs?:  number;
}

export function SearchBar({
  onSearch,
  placeholder = 'Search…',
  className,
  debounceMs = 250,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery   = useDebounce(query, debounceMs);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/') {
      setQuery('');
      onSearch('');
    }
  }, [pathname, onSearch]);

  useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  return (
    <div className={`relative ${className ?? ''}`}>
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-gray-400 focus:border-teal-500 focus:outline-none"
      />
      {query && (
        <button
          onClick={() => {
            // Clearing is a deliberate action, so reset the results immediately.
            setQuery('');
            onSearch('');
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          aria-label="Clear search"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

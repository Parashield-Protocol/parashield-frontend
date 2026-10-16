'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2, Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { MAX_INPUT_LENGTHS } from '@/lib/constants';

interface SearchBarProps {
  onSearch:   (query: string) => void;
  placeholder?: string;
  className?:   string;
  /** Delay before `onSearch` fires after the user stops typing. */
  debounceMs?:  number;
  /** Accessible name for the input (placeholder text is not a label). */
  label?:       string;
  /** id of the element whose contents this search filters (aria-controls). */
  resultsId?:   string;
  /**
   * Number of results currently shown. When provided, changes are announced
   * to screen readers via a polite live region while a query is active.
   */
  resultCount?: number;
}

/**
 * Controlled search input: the field updates on every keystroke, and only the
 * `onSearch` callback is debounced so typing never lags behind the user.
 */
export const SearchBar = memo(function SearchBar({
  onSearch,
  placeholder = 'Search…',
  className,
  debounceMs = 250,
  label = 'Search',
  resultsId,
  resultCount,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery   = useDebounce(query, debounceMs);
  // True while the latest keystroke is still waiting out the debounce (#653).
  // Clearing fires onSearch('') immediately, so an empty query is never pending.
  const isPending = query !== '' && query !== debouncedQuery;
  const pathname = usePathname();
  // Last value handed to `onSearch`, so clears and the debounce settling on the
  // same value don't trigger a redundant parent re-filter.
  const lastEmitted = useRef<string | null>(null);

  const emit = useCallback((value: string) => {
    if (lastEmitted.current === value) return;
    lastEmitted.current = value;
    onSearch(value);
  }, [onSearch]);

  useEffect(() => {
    if (pathname === '/') {
      setQuery('');
      emit('');
    }
  }, [pathname, emit]);

  useEffect(() => {
    emit(debouncedQuery);
  }, [debouncedQuery, emit]);

  return (
    <div className={`relative ${className ?? ''}`}>
      {isPending ? (
        <Loader2
          size={16}
          aria-hidden="true"
          data-testid="search-pending"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-teal-400"
        />
      ) : (
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
      )}
      <input
        type="text"
        aria-busy={isPending}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        maxLength={MAX_INPUT_LENGTHS.search}
        placeholder={placeholder}
        aria-label={label}
        aria-controls={resultsId}
        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-gray-400 focus:border-teal-500 focus:outline-none"
      />
      {query && (
        <button
          onClick={() => {
            // Clearing is a deliberate action, so reset the results immediately.
            setQuery('');
            emit('');
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          aria-label="Clear search"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
      {resultCount !== undefined && (
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {debouncedQuery.trim()
            ? `${resultCount} ${resultCount === 1 ? 'result' : 'results'} for "${debouncedQuery.trim()}"`
            : ''}
        </p>
      )}
    </div>
  );
});

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { usePolicies } from '@/hooks/usePolicies';
import { PolicyCard } from '@/components/PolicyCard';
import { ConnectWalletPrompt } from '@/components/ConnectWalletPrompt';
import { SkeletonCard } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/Badge';
import Link from 'next/link';

type Filter = 'All' | 'Active' | 'Pending' | 'Processing' | 'Expired' | 'Claimed' | 'Cancelled';
type SortOption = 'newest' | 'oldest' | 'amount-high' | 'amount-low' | 'expiry';
type ViewMode = 'grid' | 'list';

const FILTERS: Filter[] = ['All', 'Active', 'Pending', 'Processing', 'Expired', 'Claimed', 'Cancelled'];

// Loading skeleton count for better perceived performance
const SKELETON_COUNT = 6;

// Sort options for policy display
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'amount-high', label: 'Highest Amount' },
  { value: 'amount-low', label: 'Lowest Amount' },
  { value: 'expiry', label: 'Expiring Soon' },
];

export default function PoliciesPage() {
  const { address, connected } = useWallet();
  const { policies, loading, error, refetch } = usePolicies(address);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize state from URL query params (#746)
  const [filter, setFilter] = useState<Filter>(
    () => (searchParams.get('status') as Filter) || 'All'
  );
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 0);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState<SortOption>(
    () => (searchParams.get('sort') as SortOption) || 'newest'
  );
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (searchParams.get('view') as ViewMode) || 'grid'
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const POLICIES_PER_PAGE = 12;

  // Sync filter state to URL query params (#746)
  useEffect(() => {
    const params = new URLSearchParams();
    if (filter !== 'All') params.set('status', filter);
    if (searchQuery) params.set('q', searchQuery);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    if (viewMode !== 'grid') params.set('view', viewMode);
    if (page > 0) params.set('page', String(page));

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [filter, searchQuery, sortBy, viewMode, page, pathname, router]);

  // Early return for disconnected wallet
  if (!connected) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-20">
        <ConnectWalletPrompt message="Connect your wallet to view your policies" />
      </main>
    );
  }

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      // Ensure minimum 500ms for visual feedback
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [refetch]);

  // Memoize status counts to prevent recalculation on every render
  const statusCounts = useMemo(
    () =>
      policies.reduce<Record<string, number>>((acc, p) => {
        acc[p.status] = (acc[p.status] ?? 0) + 1;
        return acc;
      }, {}),
    [policies]
  );

  // Memoize filter counts for performance
  const filterCounts: Record<Filter, number> = useMemo(
    () => ({
      All: policies.length,
      Active: statusCounts['Active'] ?? 0,
      Pending: statusCounts['Pending'] ?? 0,
      Processing: statusCounts['Processing'] ?? 0,
      Expired: statusCounts['Expired'] ?? 0,
      Claimed: statusCounts['Claimed'] ?? 0,
      Cancelled: statusCounts['Cancelled'] ?? 0,
    }),
    [policies.length, statusCounts]
  );

  // Filter policies by status
  const filteredByStatus = useMemo(
    () => (filter === 'All' ? policies : policies.filter((p) => p.status === filter)),
    [filter, policies]
  );

  // Search filtered policies
  const searchedPolicies = useMemo(() => {
    if (!searchQuery.trim()) return filteredByStatus;
    
    const query = searchQuery.toLowerCase();
    return filteredByStatus.filter((p) => {
      // Search in policy ID, status, and amount
      return (
        p.id.toLowerCase().includes(query) ||
        p.status.toLowerCase().includes(query) ||
        (p.amount && p.amount.toString().includes(query)) ||
        (p.productName && p.productName.toLowerCase().includes(query))
      );
    });
  }, [filteredByStatus, searchQuery]);

  // Sort policies
  const sortedPolicies = useMemo(() => {
    const sorted = [...searchedPolicies];
    
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
      case 'oldest':
        return sorted.sort((a, b) => 
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        );
      case 'amount-high':
        return sorted.sort((a, b) => (b.amount || 0) - (a.amount || 0));
      case 'amount-low':
        return sorted.sort((a, b) => (a.amount || 0) - (b.amount || 0));
      case 'expiry':
        return sorted.sort((a, b) => {
          if (!a.expiresAt) return 1;
          if (!b.expiresAt) return -1;
          return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
        });
      default:
        return sorted;
    }
  }, [searchedPolicies, sortBy]);

  const totalPages = Math.ceil(sortedPolicies.length / POLICIES_PER_PAGE);
  const paginatedPolicies = sortedPolicies.slice(
    page * POLICIES_PER_PAGE,
    (page + 1) * POLICIES_PER_PAGE
  );

  // Reset to first page when filter, search, or sort changes
  const handleFilterChange = useCallback((newFilter: Filter) => {
    setFilter(newFilter);
    setPage(0);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(0);
  }, []);

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as SortOption);
    setPage(0);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setPage(0);
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      {/* Header Section */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Policies</h1>
          <p className="mt-1 text-sm text-gray-400">
            {loading ? (
              <span className="inline-block animate-pulse">Loading policies...</span>
            ) : filter === 'All' ? (
              `${policies.length} total ${policies.length === 1 ? 'policy' : 'policies'}`
            ) : (
              `${sortedPolicies.length} ${filter.toLowerCase()} ${
                sortedPolicies.length === 1 ? 'policy' : 'policies'
              }`
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          {!loading && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh policies"
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-400 hover:border-white/20 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh policies"
            >
              <svg
                className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}

          {/* View Mode Toggle */}
          {!loading && policies.length > 0 && (
            <div className="flex rounded-lg border border-white/10 p-1">
              <button
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                className={`rounded px-2 py-1 text-xs transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-label="List view"
                className={`rounded px-2 py-1 text-xs transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Summary Badges */}
      {!loading && policies.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2" role="status" aria-label="Policy status summary">
          {Object.entries(statusCounts).map(([status, count]) => (
            <span
              key={status}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs"
            >
              <Badge label={status} />
              <span className="text-gray-400" aria-label={`${count} ${status} policies`}>
                {count}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Search and Sort Controls */}
      {!loading && policies.length > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search policies by ID, status, or product..."
              aria-label="Search policies"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 pl-10 text-sm text-white placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-3 top-2.5 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={handleSortChange}
              aria-label="Sort policies"
              className="appearance-none rounded-lg border border-white/10 bg-white/5 px-4 py-2 pr-10 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-gray-900">
                  {option.label}
                </option>
              ))}
            </select>
            <svg
              className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      )}

      {!loading && policies.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Policy filter tabs">
          {FILTERS.map((tab) => {
            const count = filterCounts[tab];
            const isActive = filter === tab;
            return (
              <button
                key={tab}
                role="tab"
                aria-selected={isActive}
                aria-controls="policies-grid"
                onClick={() => handleFilterChange(tab)}
                disabled={count === 0 && !isActive}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-teal-500 text-white'
                    : count === 0
                      ? 'border border-white/5 text-gray-400 cursor-not-allowed opacity-50'
                      : 'border border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                }`}
              >
                {tab}
                <span className="ml-1.5 text-[10px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div 
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          role="status"
          aria-label="Loading policies"
        >
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error && policies.length === 0 ? (
        <EmptyState
          icon="⚠️"
          title="Failed to load policies"
          description={error}
          action={
            <button
              onClick={() => void refetch()}
              className="rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-400 transition-colors"
            >
              Try again
            </button>
          }
        />
      ) : policies.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No policies yet"
          description="Buy your first parametric insurance policy from the products marketplace."
          action={
            <Link href="/" className="rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-400 transition-colors">
              Browse products
            </Link>
          }
        />
      ) : filteredByStatus.length === 0 ? (
        <EmptyState
          icon="🔍"
          title={`No ${filter.toLowerCase()} policies`}
          description="Try a different filter to see your other policies."
        />
      ) : searchedPolicies.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No matching policies"
          description={`No policies found matching "${searchQuery}". Try a different search term.`}
          action={
            <button
              onClick={clearSearch}
              className="rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-400 transition-colors"
            >
              Clear search
            </button>
          }
        />
      ) : (
        <>
          <div 
            id="policies-grid"
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
                : 'flex flex-col gap-3'
            }
            role="region"
            aria-label={`${filter} policies ${viewMode}`}
          >
            {paginatedPolicies.map((p) => (
              <PolicyCard key={p.id} policy={p} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4" role="navigation" aria-label="Pagination">
              <p className="text-xs text-gray-400">
                Showing {page * POLICIES_PER_PAGE + 1}–
                {Math.min((page + 1) * POLICIES_PER_PAGE, sortedPolicies.length)} of{' '}
                {sortedPolicies.length}
                {searchQuery && ` (filtered from ${filteredByStatus.length})`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  aria-label="Previous page"
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:border-white/20 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {/* Page Numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i;
                    } else if (page < 3) {
                      pageNum = i;
                    } else if (page > totalPages - 4) {
                      pageNum = totalPages - 5 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        aria-label={`Go to page ${pageNum + 1}`}
                        aria-current={page === pageNum ? 'page' : undefined}
                        className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${
                          page === pageNum
                            ? 'bg-teal-500 text-white'
                            : 'border border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  aria-label="Next page"
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:border-white/20 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { BASE_FEE } from '@stellar/stellar-sdk';
import { useProducts } from '@/hooks/useProducts';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { fetchProtocolStats } from '@/lib/api';
import { formatUSDC, stroopsToDisplay } from '@/lib/format';
import { ProductCard } from '@/components/ProductCard';
import { Skeleton, SkeletonCard } from '@/components/Skeleton';
import { LogoWordmark } from '@/components/Logo';
import { SearchBar } from '@/components/SearchBar';
import { CategoryFilter } from '@/components/CategoryFilter';
import { EmptyState } from '@/components/EmptyState';
import { CompareModal } from '@/components/CompareModal';
import { CATEGORY_LABELS } from '@/lib/constants';
import type { Category, Product } from '@/types';

type CategoryFilterValue = Category | 'all';

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function StatValue({ loading, failed, children }: { loading: boolean; failed: boolean; children: React.ReactNode }) {
  if (loading) return <Skeleton className="mx-auto h-9 w-28" />;
  if (failed)  return <p className="text-3xl font-black text-teal-400">—</p>;
  return <p className="text-3xl font-black text-teal-400">{children}</p>;
}

export default function HomePage() {
  const { products, loading, error, refetch } = useProducts();
  const [searchQuery, setSearchQuery]   = useState('');
  const [category, setCategory]         = useState<CategoryFilterValue>('all');
  const [compareIds, setCompareIds]     = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen]   = useState(false);

  const toggleCompare = useCallback((product: Product) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
      } else if (next.size < 3) {
        next.add(product.id);
      }
      return next;
    });
  }, []);

  const compareProducts = useMemo(
    () => products.filter((p) => compareIds.has(p.id)),
    [products, compareIds],
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ps_category_filter');
      if (stored) {
        setCategory(JSON.parse(stored) as CategoryFilterValue);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('ps_category_filter', JSON.stringify(category));
    } catch {
      // ignore
    }
  }, [category]);

  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError,   setStatsError]   = useState(false);
  const [totalCoverage, setTotalCoverage] = useState<string | null>(null);
  const [totalPayouts,  setTotalPayouts]  = useState<string | null>(null);
  const [statsLastUpdated, setStatsLastUpdated] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  // Refresh the "Updated X ago" text every 60s
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    setStatsError(false);
    fetchProtocolStats()
      .then((stats) => {
        if (cancelled) return;
        setTotalCoverage(stats.totalCoverage);
        setTotalPayouts(stats.totalPayouts);
        setStatsLastUpdated(new Date());
      })
      .catch(() => { if (!cancelled) setStatsError(true); })
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const activeProductCount = useMemo(
    () => products.filter((p) => p.status === 'Active').length,
    [products],
  );

  const filteredProducts = useMemo(() => {
    let result = products;
    if (category !== 'all') {
      result = result.filter((p) => p.category === category);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false),
      );
    }
    return result;
  }, [products, category, searchQuery]);

  return (
    <main className="min-h-screen bg-gray-950 dark:bg-gray-950 bg-white dark:text-white text-gray-950">
      {/* JSON-LD structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Parashield Insurance Products',
            description: 'Parametric insurance products on Stellar blockchain with automatic USDC payouts',
            itemListElement: filteredProducts.map((product: Product, index: number) => ({
              '@type': 'ListItem',
              position: index + 1,
              item: {
                '@type': 'Product',
                name: product.name,
                description: product.description ?? `${CATEGORY_LABELS[product.category]} insurance policy`,
                category: CATEGORY_LABELS[product.category],
                offers: {
                  '@type': 'Offer',
                  priceCurrency: 'USDC',
                  price: stroopsToDisplay(product.coverageMax, 2),
                  availability: product.status === 'Active'
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/OutOfStock',
                },
              },
            })),
          }),
        }}
      />
      {/* Hero */}
      <section className="border-b border-gray-200 dark:border-white/10 px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex justify-center">
            <LogoWordmark size={40} />
          </div>
          <span className="mb-4 inline-block rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-teal-400">
            Parametric insurance on Stellar
          </span>
          <h1 className="mt-4 text-5xl font-bold tracking-tight">
            Insurance that pays out{' '}
            <span className="text-teal-400">automatically</span>
          </h1>
          <p className="mt-6 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            When the trigger condition is met — drought, flight delay, storm, DeFi exploit —
            the smart contract pays you in USDC within seconds.
            No claims form. No adjuster. No waiting.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>⚡ Seconds, not weeks</span>
            <span>·</span>
            <span>🌍 MoneyGram cash-out globally</span>
            <span>·</span>
            <span>🔒 Soroban smart contracts</span>
            <span>·</span>
            <span>💵 USDC payouts</span>
          </div>
        </div>
      </section>

      {/* Product marketplace */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Insurance Products</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Live on Stellar testnet · Payouts in USDC</p>
        </div>

        <CategoryFilter value={category} onChange={setCategory} className="mb-4" />
        <SearchBar
          onSearch={setSearchQuery}
          placeholder="Search products…"
          className="mb-8 max-w-md"
        />

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-400">
            <p>{error}</p>
            <button
              onClick={refetch}
              className="mt-3 rounded-lg border border-red-500/30 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No products found"
            description={searchQuery
              ? `No products match "${searchQuery}". Try a different search or category.`
              : 'No products in this category yet.'}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filteredProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                compareSelected={compareIds.has(p.id)}
                onCompareToggle={toggleCompare}
              />
            ))}
          </div>
        )}

        {compareIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/10 bg-gray-900/95 px-6 py-3 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">
                {compareIds.size} of 3 selected
              </span>
              <button
                onClick={() => setCompareOpen(true)}
                disabled={compareIds.size < 2}
                className="rounded-xl bg-teal-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Compare
              </button>
              <button
                onClick={() => setCompareIds(new Set())}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {compareOpen && compareProducts.length >= 2 && (
          <CompareModal
            products={compareProducts}
            onClose={() => setCompareOpen(false)}
          />
        )}
      </section>

      {/* How it works */}
      <section className="border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-bold">How it works</h2>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: '01', title: 'Choose a product', desc: 'Select an insurance product — crop rainfall, flight delay, natural disaster, or DeFi protocol cover.' },
              { n: '02', title: 'Pay premium in USDC', desc: 'Connect your Stellar wallet. Your premium is locked in the smart contract as collateral.' },
              { n: '03', title: 'Oracle monitors', desc: 'NOAA, AviationStack, and on-chain monitors feed verified data to the Oracle Verifier contract every hour.' },
              { n: '04', title: 'Automatic payout', desc: 'Trigger confirmed → contract transfers your coverage to your wallet. No form, no adjuster, no delay.' },
            ].map((step) => (
              <li key={step.n} className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-6">
                <span className="text-3xl font-black text-teal-500/30">{step.n}</span>
                <p className="mt-3 font-semibold text-gray-950 dark:text-white">{step.title}</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-gray-200 dark:border-white/10 px-6 py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 text-center sm:grid-cols-4">
          <div>
            <StatValue loading={statsLoading} failed={statsError}>
              {totalCoverage !== null ? formatUSDC(totalCoverage, false) : null}
            </StatValue>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Total coverage issued</p>
          </div>
          <div>
            <StatValue loading={loading} failed={!!error}>
              {activeProductCount}
            </StatValue>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Active products</p>
          </div>
          <div>
            <StatValue loading={statsLoading} failed={statsError}>
              {totalPayouts !== null ? formatUSDC(totalPayouts, false) : null}
            </StatValue>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Total payouts</p>
          </div>
          <div>
            <p className="text-3xl font-black text-teal-400">{stroopsToDisplay(BASE_FEE, 5)} XLM</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Per transaction (network base fee)</p>
          </div>
        </div>
        {statsLastUpdated && !statsLoading && (
          <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            Updated {timeAgo(statsLastUpdated)}
          </p>
        )}
      </section>
    </main>
  );
}

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { fetchProtocolStats } from '@/lib/api';
import { formatUSDC } from '@/lib/format';
import { ProductCard } from '@/components/ProductCard';
import { Skeleton, SkeletonCard } from '@/components/Skeleton';
import { LogoWordmark } from '@/components/Logo';

function StatValue({ loading, failed, children }: { loading: boolean; failed: boolean; children: React.ReactNode }) {
  if (loading) return <Skeleton className="mx-auto h-9 w-28" />;
  if (failed)  return <p className="text-3xl font-black text-teal-400">—</p>;
  return <p className="text-3xl font-black text-teal-400">{children}</p>;
}

export default function HomePage() {
  const { products, loading, error: productsError } = useProducts();

  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError,   setStatsError]   = useState(false);
  const [totalCoverage, setTotalCoverage] = useState<string | null>(null);
  const [totalPayouts,  setTotalPayouts]  = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    setStatsError(false);
    fetchProtocolStats()
      .then((stats) => {
        if (cancelled) return;
        setTotalCoverage(stats.totalCoverage);
        setTotalPayouts(stats.totalPayouts);
      })
      .catch(() => { if (!cancelled) setStatsError(true); })
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const activeProductCount = useMemo(
    () => products.filter((p) => p.status === 'Active').length,
    [products],
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <section className="border-b border-white/10 px-6 py-20 text-center">
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
          <p className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto">
            When the trigger condition is met — drought, flight delay, storm, DeFi exploit —
            the smart contract pays you in USDC within seconds.
            No claims form. No adjuster. No waiting.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-gray-500">
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
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Insurance Products</h2>
            <p className="mt-1 text-sm text-gray-500">Live on Stellar testnet · Payouts in USDC</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? [1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)
            : products.map((p) => <ProductCard key={p.id} product={p} />)
          }
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/10 bg-white/[0.02] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-bold">How it works</h2>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: '01', title: 'Choose a product', desc: 'Select an insurance product — crop rainfall, flight delay, natural disaster, or DeFi protocol cover.' },
              { n: '02', title: 'Pay premium in USDC', desc: 'Connect your Stellar wallet. Your premium is locked in the smart contract as collateral.' },
              { n: '03', title: 'Oracle monitors', desc: 'NOAA, AviationStack, and on-chain monitors feed verified data to the Oracle Verifier contract every hour.' },
              { n: '04', title: 'Automatic payout', desc: 'Trigger confirmed → contract transfers your coverage to your wallet. No form, no adjuster, no delay.' },
            ].map((step) => (
              <li key={step.n} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <span className="text-3xl font-black text-teal-500/30">{step.n}</span>
                <p className="mt-3 font-semibold text-white">{step.title}</p>
                <p className="mt-2 text-sm text-gray-400 leading-relaxed">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-white/10 px-6 py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 text-center sm:grid-cols-4">
          <div>
            <StatValue loading={statsLoading} failed={statsError}>
              {totalCoverage !== null ? formatUSDC(totalCoverage, false) : null}
            </StatValue>
            <p className="mt-1 text-sm text-gray-500">Total coverage issued</p>
          </div>
          <div>
            <StatValue loading={loading} failed={!!productsError}>
              {activeProductCount}
            </StatValue>
            <p className="mt-1 text-sm text-gray-500">Active products</p>
          </div>
          <div>
            <StatValue loading={statsLoading} failed={statsError}>
              {totalPayouts !== null ? formatUSDC(totalPayouts, false) : null}
            </StatValue>
            <p className="mt-1 text-sm text-gray-500">Total payouts</p>
          </div>
          <div>
            <p className="text-3xl font-black text-teal-400">$0.00001</p>
            <p className="mt-1 text-sm text-gray-500">Per transaction</p>
          </div>
        </div>
      </section>
    </main>
  );
}

import { Suspense } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { fetchProducts, type Product } from '@/lib/api';

async function ProductGrid() {
  let products: Product[] = [];
  try {
    products = await fetchProducts();
  } catch {
    // API not yet running — show placeholder products
    products = [
      {
        id: '1',
        name: 'Crop Insurance – Kisumu Rainfall',
        category: 'crop',
        triggerType: 'Threshold',
        threshold: '50.0000000',
        comparison: 'LessThan',
        coverageMin: '10.0000000',
        coverageMax: '1000.0000000',
        premiumRate: 500,
        maxDuration: 365,
        status: 'Active',
      },
      {
        id: '2',
        name: 'Flight Delay Insurance',
        category: 'flight',
        triggerType: 'Threshold',
        threshold: '120.0000000',
        comparison: 'GreaterThan',
        coverageMin: '20.0000000',
        coverageMax: '500.0000000',
        premiumRate: 400,
        maxDuration: 1,
        status: 'Active',
      },
      {
        id: '3',
        name: 'DeFi Protocol Cover',
        category: 'defi',
        triggerType: 'Binary',
        threshold: '1.0000000',
        comparison: 'Equal',
        coverageMin: '100.0000000',
        coverageMax: '10000.0000000',
        premiumRate: 200,
        maxDuration: 90,
        status: 'Active',
      },
    ];
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <section className="border-b border-white/10 px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <span className="mb-4 inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
            First parametric insurance on Stellar
          </span>
          <h1 className="mt-4 text-5xl font-bold tracking-tight">
            Insurance that pays out{' '}
            <span className="text-emerald-400">automatically</span>
          </h1>
          <p className="mt-6 text-lg text-gray-400">
            When the trigger condition is met — drought, storm, flight delay, DeFi exploit —
            the smart contract pays you in USDC within seconds.
            No claims adjuster. No paperwork. No waiting 30 days.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">⚡ Seconds not weeks</span>
            <span>·</span>
            <span className="flex items-center gap-1">🌍 300K+ MoneyGram locations</span>
            <span>·</span>
            <span className="flex items-center gap-1">🔒 Soroban smart contracts</span>
          </div>
        </div>
      </section>

      {/* Product marketplace */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Insurance Products</h2>
          <span className="text-sm text-gray-500">Powered by USDC · Stellar testnet</span>
        </div>
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          }
        >
          <ProductGrid />
        </Suspense>
      </section>

      {/* How it works */}
      <section className="border-t border-white/10 bg-white/[0.02] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-bold">How Parashield works</h2>
          <ol className="space-y-6">
            {[
              { n: '1', title: 'Choose a product', desc: 'Select an insurance product — crop rainfall, flight delay, natural disaster, or DeFi cover.' },
              { n: '2', title: 'Pay premium in USDC', desc: 'Connect your Stellar wallet. Pay a small premium (as low as 2%). Coverage is locked in the smart contract.' },
              { n: '3', title: 'Oracle monitors conditions', desc: 'NOAA, AviationStack, or on-chain monitors feed real-world data to the Oracle Verifier every hour.' },
              { n: '4', title: 'Automatic payout', desc: 'When the trigger condition is confirmed, the smart contract transfers your coverage to your wallet. Seconds, not days.' },
            ].map((step) => (
              <li key={step.n} className="flex gap-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 font-bold text-emerald-400 ring-1 ring-emerald-500/30">
                  {step.n}
                </span>
                <div>
                  <p className="font-semibold text-white">{step.title}</p>
                  <p className="mt-1 text-sm text-gray-400">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}

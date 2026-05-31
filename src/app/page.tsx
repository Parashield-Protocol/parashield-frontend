'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { fetchProducts, type Product } from '@/lib/api';

const SEED_PRODUCTS: Product[] = [
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
  {
    id: '4',
    name: 'Natural Disaster Cover',
    category: 'disaster',
    triggerType: 'Threshold',
    threshold: '180.0000000',
    comparison: 'GreaterThan',
    coverageMin: '50.0000000',
    coverageMax: '5000.0000000',
    premiumRate: 300,
    maxDuration: 180,
    status: 'Active',
  },
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);

  useEffect(() => {
    fetchProducts().then(setProducts).catch(() => {/* use seed data */});
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <section className="border-b border-white/10 px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <span className="mb-4 inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Parametric insurance on Stellar
          </span>
          <h1 className="mt-4 text-5xl font-bold tracking-tight">
            Insurance that pays out{' '}
            <span className="text-emerald-400">automatically</span>
          </h1>
          <p className="mt-6 text-lg text-gray-400">
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
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
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
                <span className="text-3xl font-black text-emerald-500/30">{step.n}</span>
                <p className="mt-3 font-semibold text-white">{step.title}</p>
                <p className="mt-2 text-sm text-gray-400 leading-relaxed">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-white/10 px-6 py-12">
        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-6 text-center">
          {[
            { v: '33', l: 'Tests passing' },
            { v: '3', l: 'Live contracts' },
            { v: '$0.00001', l: 'Per transaction' },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-3xl font-black text-emerald-400">{s.v}</p>
              <p className="mt-1 text-sm text-gray-500">{s.l}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

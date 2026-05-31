'use client';

import { useState } from 'react';
import type { Product } from '@/lib/api';
import { connectFreighter, getConnectedWallet } from '@/lib/stellar';

interface Props {
  product: Product;
  onClose: () => void;
}

export function BuyPolicyModal({ product, onClose }: Props) {
  const [coverage,  setCoverage]  = useState('');
  const [duration,  setDuration]  = useState('30');
  const [oracleKey, setOracleKey] = useState('');
  const [step,      setStep]      = useState<'form' | 'signing' | 'success' | 'error'>('form');
  const [error,     setError]     = useState('');

  const premiumPct    = product.premiumRate / 10_000;
  const coverageNum   = parseFloat(coverage) || 0;
  const estimatedPrem = (coverageNum * premiumPct).toFixed(7);

  async function handleBuy() {
    setError('');
    const wallet = getConnectedWallet() ?? await connectFreighter();
    if (!wallet) { setError('Connect your wallet first.'); return; }

    const cov = parseFloat(coverage);
    if (isNaN(cov) || cov < parseFloat(product.coverageMin) || cov > parseFloat(product.coverageMax)) {
      setError(`Coverage must be between ${product.coverageMin} and ${product.coverageMax} USDC`);
      return;
    }
    if (!oracleKey.trim()) { setError('Oracle key is required.'); return; }

    setStep('signing');
    try {
      // TODO: build and sign buy_policy Soroban tx via @stellar/stellar-sdk
      // For v1, simulate a 2-second delay then show success
      await new Promise((r) => setTimeout(r, 2000));
      setStep('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaction failed');
      setStep('error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold">Buy Policy</h2>
        <p className="mt-1 text-sm text-gray-400">{product.name}</p>

        {step === 'success' ? (
          <div className="mt-8 text-center">
            <p className="text-4xl">✅</p>
            <p className="mt-3 font-semibold text-emerald-400">Policy purchased!</p>
            <p className="mt-1 text-sm text-gray-400">
              Your coverage is now active. You&apos;ll be notified automatically if the trigger fires.
            </p>
            <button onClick={onClose} className="mt-6 w-full rounded-xl bg-emerald-500 py-2.5 font-semibold text-black hover:bg-emerald-400 transition-colors">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Coverage Amount (USDC)
                </label>
                <input
                  type="number"
                  value={coverage}
                  onChange={(e) => setCoverage(e.target.value)}
                  placeholder={`${product.coverageMin} – ${product.coverageMax}`}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Duration (days, max {product.maxDuration})
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min={1}
                  max={product.maxDuration}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Oracle Key
                </label>
                <input
                  type="text"
                  value={oracleKey}
                  onChange={(e) => setOracleKey(e.target.value)}
                  placeholder='e.g. "kis2606" for Kisumu June 2026'
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-gray-500">
                  Max 9 chars (Soroban Symbol). Ask the oracle operator for the correct key.
                </p>
              </div>

              {coverageNum > 0 && (
                <div className="rounded-xl bg-white/5 p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Premium ({(premiumPct * 100).toFixed(2)}%)</span>
                    <span className="font-semibold text-emerald-400">{estimatedPrem} USDC</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-gray-400">Coverage</span>
                    <span className="font-semibold">{coverageNum.toFixed(7)} USDC</span>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            <button
              onClick={handleBuy}
              disabled={step === 'signing'}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 font-semibold text-black hover:bg-emerald-400 disabled:opacity-60 transition-colors"
            >
              {step === 'signing' ? 'Signing…' : 'Buy Policy'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import type { Product } from '@/types';
import { useWallet } from '@/hooks/useWallet';
import { displayToStroops, stroopsToDisplay, estimatePremium, basisPointsToPercent } from '@/lib/format';
import { toUserMessage } from '@/lib/errors';
import { invokeBuyPolicy } from '@/lib/contract';
import { buyPolicy as recordPolicyPurchase } from '@/lib/api';
import { buildRainfallKey, buildFlightKey } from '@/lib/oracle';
import { Modal } from './Modal';
import { StepProgress } from './ProgressBar';
import { useToast } from '@/context/ToastContext';
import { INPUT_CLASS, SELECT_CLASS, LABEL_CLASS, ERROR_TEXT, INFO_TEXT, CARD_PANEL } from '@/lib/styles';

interface Props {
  product: Product;
  onClose: () => void;
}

const STEPS = ['Configure', 'Review', 'Sign'];

// estimatePremium throws on anything displayToStroops rejects (empty, negative,
// partially-typed numbers). It runs on every keystroke — outside validate() —
// so a single '-' used to blow up the whole modal (issue #197).
function safeEstimatePremium(coverageDisplay: string, premiumRateBps: number): string {
  try {
    return estimatePremium(coverageDisplay, premiumRateBps);
  } catch {
    return '—';
  }
}

export function BuyPolicyModal({ product, onClose }: Props) {
  const { address, connect, connecting, error: walletError } = useWallet();
  const { show: showToast }             = useToast();

  const [coverage,  setCoverage]  = useState('');
  const [duration,  setDuration]  = useState(String(Math.min(30, product.maxDuration)));
  const [oracleKey, setOracleKey] = useState('');
  const [step,      setStep]      = useState(0);
  const [busy,      setBusy]      = useState(false);
  const [error,     setError]     = useState('');

  // Crop builder state
  const [lat, setLat] = useState('-0.0917');
  const [lng, setLng] = useState('34.7679');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  // Flight builder state
  const [flightNumber, setFlightNumber] = useState('');
  const [flightDate, setFlightDate] = useState(new Date().toISOString().split('T')[0]);

  const minDisplay = stroopsToDisplay(product.coverageMin, 2);
  const maxDisplay = stroopsToDisplay(product.coverageMax, 2);
  const coverageNum   = parseFloat(coverage) || 0;
  const estimatedPrem = safeEstimatePremium(coverage, product.premiumRate);

  // Automatically build oracle key based on inputs
  useEffect(() => {
    if (product.category === 'crop') {
      const latNum = parseFloat(lat) || 0;
      const lngNum = parseFloat(lng) || 0;
      setOracleKey(buildRainfallKey(latNum, lngNum, year, month));
    } else if (product.category === 'flight') {
      setOracleKey(buildFlightKey(flightNumber.trim(), flightDate));
    } else if (product.category === 'defi') {
      setOracleKey('defi');
    }
  }, [product.category, lat, lng, year, month, flightNumber, flightDate]);

  function validate(): string {
    const cov = parseFloat(coverage);
    if (isNaN(cov) || cov <= 0) {
      return 'Coverage must be a positive amount';
    }
    if (cov < parseFloat(minDisplay) || cov > parseFloat(maxDisplay)) {
      return `Coverage must be between ${minDisplay} and ${maxDisplay} USDC`;
    }
    const dur = parseInt(duration, 10);
    if (isNaN(dur) || dur < 1 || dur > product.maxDuration) {
      return `Duration must be between 1 and ${product.maxDuration} days`;
    }
    if (product.category === 'crop') {
      if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
        return 'Valid latitude and longitude are required';
      }
      if (oracleKey.trim().length > 32) {
        return 'Generated oracle key exceeds the 32-character limit';
      }
    } else if (product.category === 'flight') {
      if (!flightNumber.trim()) {
        return 'Flight number is required';
      }
      if (!flightDate) {
        return 'Flight date is required';
      }
      if (oracleKey.trim().length > 32) {
        return 'Generated oracle key exceeds the 32-character limit';
      }
    } else if (product.category === 'disaster' || product.category === 'health') {
      if (!oracleKey.trim() || oracleKey.trim().length > 32) {
        return 'Oracle key is required and must be at most 32 characters';
      }
    }
    return '';
  }

  async function handleBuy() {
    if (!address) { await connect(); return; }
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    if (step < 2) { setStep((s) => s + 1); return; }

    setBusy(true);
    setError('');
    try {
      const trimmedKey = oracleKey.trim();
      const { txHash, signedXdr } = await invokeBuyPolicy(
        address,
        product.id,
        BigInt(displayToStroops(coverage)),
        trimmedKey,
        parseInt(duration, 10),
      );

      // The purchase is already final on-chain at this point; the backend still
      // needs to be told about it or the policy never shows up in the UI, which
      // reads from the API (issue #195). A failure here is not a failed
      // purchase, so surface it as a warning rather than an error.
      try {
        await recordPolicyPurchase({
          productId: product.id,
          coverage:  displayToStroops(coverage).toString(),
          oracleKey: trimmedKey,
          duration:  parseInt(duration, 10),
          wallet:    address,
          signedXdr,
        });
      } catch (syncErr) {
        showToast(
          `Policy purchased on-chain (${txHash.slice(0, 8)}…) but could not be recorded: ${toUserMessage(syncErr)}`,
          'warning',
        );
      }

      showToast(`Policy activation transaction ${txHash.slice(0, 8)}… submitted`, 'success');
      onClose();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open title={`Buy — ${product.name}`} onClose={onClose}>
      <StepProgress steps={STEPS} current={step} />

      <div className="mt-6 space-y-4">
        {step === 0 && (
          <>
            <div>
              <label className={LABEL_CLASS}>
                Coverage Amount (USDC)
              </label>
              <input
                type="number"
                min={0}
                value={coverage}
                onChange={(e) => { setCoverage(e.target.value); setError(''); }}
                placeholder={`${minDisplay} – ${maxDisplay}`}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>
                Duration (days, max {product.maxDuration})
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => { setDuration(e.target.value); setError(''); }}
                min={1}
                max={product.maxDuration}
                className={INPUT_CLASS}
              />
            </div>

            {product.category === 'crop' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="e.g. -0.0917"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      placeholder="e.g. 34.7679"
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>
                      Month
                    </label>
                    <select
                      value={month}
                      onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                      className={SELECT_CLASS}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m} className="bg-gray-900 text-white">
                          {new Date(2026, m - 1).toLocaleString('en-US', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>
                      Year
                    </label>
                    <select
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value, 10))}
                      className={SELECT_CLASS}
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                        <option key={y} value={y} className="bg-gray-900 text-white">
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={`mt-2 ${INFO_TEXT}`}>
                  Computed Key: <span className="font-mono text-teal-400">{oracleKey}</span>
                </div>
              </div>
            )}

            {product.category === 'flight' && (
              <div className="space-y-4">
                <div>
                  <label className={LABEL_CLASS}>
                    Flight Number
                  </label>
                  <input
                    type="text"
                    value={flightNumber}
                    // Strip colons at the source: a ':' is the oracle-key delimiter,
                    // so one inside the flight number would break key parsing (#223).
                    onChange={(e) => setFlightNumber(e.target.value.replace(/:/g, ''))}
                    maxLength={16}
                    pattern="[^:]*"
                    placeholder="e.g. KQ100"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={flightDate}
                    onChange={(e) => setFlightDate(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div className={`mt-2 ${INFO_TEXT}`}>
                  Computed Key: <span className="font-mono text-teal-400">{oracleKey}</span>
                </div>
              </div>
            )}

            {product.category === 'defi' && (
              <div className="space-y-2">
                <label className={LABEL_CLASS}>
                  Oracle Key (Fixed)
                </label>
                <div className={`${INPUT_CLASS} font-mono text-gray-400 select-all`}>
                  defi
                </div>
              </div>
            )}

            {(product.category !== 'crop' && product.category !== 'flight' && product.category !== 'defi') && (
              <div className="space-y-2">
                <label className={LABEL_CLASS}>
                  Oracle Key
                </label>
                <input
                  type="text"
                  value={oracleKey}
                  onChange={(e) => { setOracleKey(e.target.value); setError(''); }}
                  placeholder='e.g. rainfall:1.5,36.8:2026-06'
                  maxLength={32}
                  className={INPUT_CLASS}
                />
                <p className="mt-1 text-[10px] text-gray-400">Max 32 chars</p>
                <div className={`mt-2 ${INFO_TEXT}`}>
                  Computed Key: <span className="font-mono text-teal-400">{oracleKey}</span>
                </div>
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <div className={CARD_PANEL}>
            <h4 className="font-semibold text-white">Review your policy</h4>
            <div className="flex justify-between text-gray-400">
              <span>Product</span>
              <span className="text-white font-medium">{product.name}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Coverage</span>
              <span className="text-emerald-400 font-semibold">{coverageNum.toFixed(2)} USDC</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Duration</span>
              <span className="text-white">{duration} days</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Oracle key</span>
              <span className="font-mono text-xs text-white">{oracleKey}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-3 text-gray-400">
              <span>Premium ({basisPointsToPercent(product.premiumRate)})</span>
              <span className="font-bold text-white">{estimatedPrem} USDC</span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 text-sm text-gray-400">
            <p>Your Stellar wallet will prompt you to sign the policy transaction.</p>
            <p className="text-xs">
              Premium of <strong className="text-white">{estimatedPrem} USDC</strong> will be deducted from your wallet balance.
            </p>
          </div>
        )}

        {error && <p className={ERROR_TEXT}>{error}</p>}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onClose}
          disabled={busy}
          className="rounded-xl border border-white/10 px-4 py-2.5 font-semibold text-gray-300 hover:border-white/20 hover:text-white disabled:opacity-60 transition-colors"
        >
          Cancel
        </button>
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={busy}
            className="rounded-xl border border-white/10 px-4 py-2.5 font-semibold text-gray-300 hover:border-white/20 hover:text-white disabled:opacity-60 transition-colors"
          >
            Back
          </button>
        )}
        <button
          onClick={handleBuy}
          disabled={busy || connecting}
          className="flex-1 rounded-xl bg-teal-500 py-2.5 font-semibold text-white hover:bg-teal-400 disabled:opacity-60 transition-colors"
        >
          {connecting  ? 'Connecting wallet…' :
           busy        ? 'Submitting…' :
           !address    ? 'Connect Wallet' :
           step === 2  ? 'Sign & Confirm' :
           step === 1  ? 'Confirm details' :
           'Next'}
        </button>
        {walletError && !address && (
          <p className="mt-2 text-sm text-red-400">{walletError}</p>
        )}
      </div>
    </Modal>
  );
}

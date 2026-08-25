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

  // Reset to step 0 when the product changes to avoid showing stale data
  // from a previous product's flow (issue #428).
  useEffect(() => {
    setStep(0);
  }, [product.id]);
  const [busy,      setBusy]      = useState(false);
  const [error,     setError]     = useState('');

  const [coverageError, setCoverageError] = useState('');
  const [durationError, setDurationError] = useState('');
  const [latError, setLatError] = useState('');
  const [lngError, setLngError] = useState('');
  const [flightNumberError, setFlightNumberError] = useState('');
  const [flightDateError, setFlightDateError] = useState('');
  const [oracleKeyError, setOracleKeyError] = useState('');

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

  function validateFields(): boolean {
    let isValid = true;

    // Reject scientific notation / non-plain-decimal input explicitly (#473,
    // #475) rather than relying on parseFloat/parseInt's lenient parsing:
    // parseFloat("5e8") happily returns 500000000, which could pass a naive
    // range check with a value the user never intended to type.
    if (!/^\d+(\.\d+)?$/.test(coverage.trim())) {
      setCoverageError('Coverage must be a plain positive number (no scientific notation)');
      isValid = false;
    } else {
      const cov = parseFloat(coverage);
      if (cov <= 0) {
        setCoverageError('Coverage must be a positive amount');
        isValid = false;
      } else if (cov < parseFloat(minDisplay) || cov > parseFloat(maxDisplay)) {
        setCoverageError(`Coverage must be between ${minDisplay} and ${maxDisplay} USDC`);
        isValid = false;
      } else {
        setCoverageError('');
      }
    }

    if (!/^\d+$/.test(duration.trim())) {
      setDurationError('Duration must be a whole number of days (no scientific notation or decimals)');
      isValid = false;
    } else {
      const dur = parseInt(duration, 10);
      if (dur < 1 || dur > product.maxDuration) {
        setDurationError(`Duration must be between 1 and ${product.maxDuration} days`);
        isValid = false;
      } else {
        setDurationError('');
      }
    }

    if (product.category === 'crop') {
      if (isNaN(parseFloat(lat))) {
        setLatError('Valid latitude is required');
        isValid = false;
      } else {
        setLatError('');
      }
      if (isNaN(parseFloat(lng))) {
        setLngError('Valid longitude is required');
        isValid = false;
      } else {
        setLngError('');
      }
      if (oracleKey.trim().length > 32) {
        setOracleKeyError('Generated oracle key exceeds the 32-character limit');
        isValid = false;
      } else {
        setOracleKeyError('');
      }
    } else if (product.category === 'flight') {
      if (!flightNumber.trim()) {
        setFlightNumberError('Flight number is required');
        isValid = false;
      } else {
        setFlightNumberError('');
      }
      if (!flightDate) {
        setFlightDateError('Flight date is required');
        isValid = false;
      } else {
        setFlightDateError('');
      }
      if (oracleKey.trim().length > 32) {
        setOracleKeyError('Generated oracle key exceeds the 32-character limit');
        isValid = false;
      } else {
        setOracleKeyError('');
      }
    } else if (product.category === 'disaster' || product.category === 'health') {
      if (!oracleKey.trim() || oracleKey.trim().length > 32) {
        setOracleKeyError('Oracle key is required and must be at most 32 characters');
        isValid = false;
      } else {
        setOracleKeyError('');
      }
    }

    return isValid;
  }

  async function handleBuy() {
    if (!address) { await connect(); return; }
    if (!validateFields()) { return; }
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
                min={minDisplay}
                max={maxDisplay}
                value={coverage}
                onChange={(e) => { setCoverage(e.target.value); setCoverageError(''); }}
                placeholder={`${minDisplay} – ${maxDisplay}`}
                className={`${INPUT_CLASS} ${coverageError ? 'border-red-500' : ''}`}
              />
              {coverageError && <p className="mt-1 text-xs text-red-400">{coverageError}</p>}
            </div>
            <div>
              <label className={LABEL_CLASS}>
                Duration (days, max {product.maxDuration})
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => { setDuration(e.target.value); setDurationError(''); }}
                min={1}
                max={product.maxDuration}
                className={`${INPUT_CLASS} ${durationError ? 'border-red-500' : ''}`}
              />
              {durationError && <p className="mt-1 text-xs text-red-400">{durationError}</p>}
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
                      onChange={(e) => { setLat(e.target.value); setLatError(''); }}
                      placeholder="e.g. -0.0917"
                      className={`${INPUT_CLASS} ${latError ? 'border-red-500' : ''}`}
                    />
                    {latError && <p className="mt-1 text-xs text-red-400">{latError}</p>}
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={lng}
                      onChange={(e) => { setLng(e.target.value); setLngError(''); }}
                      placeholder="e.g. 34.7679"
                      className={`${INPUT_CLASS} ${lngError ? 'border-red-500' : ''}`}
                    />
                    {lngError && <p className="mt-1 text-xs text-red-400">{lngError}</p>}
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
                        <option key={m} value={m} className="bg-white dark:bg-gray-900 text-gray-950 dark:text-white">
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
                      {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                        <option key={y} value={y} className="bg-white dark:bg-gray-900 text-gray-950 dark:text-white">
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={`mt-2 ${INFO_TEXT}`}>
                  Computed Key: <span className="font-mono text-teal-400">{oracleKey}</span>
                </div>
                {oracleKeyError && <p className="mt-1 text-xs text-red-400">{oracleKeyError}</p>}
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
                    onChange={(e) => { setFlightNumber(e.target.value.replace(/:/g, '')); setFlightNumberError(''); }}
                    maxLength={16}
                    pattern="[^:]*"
                    placeholder="e.g. KQ100"
                    className={`${INPUT_CLASS} ${flightNumberError ? 'border-red-500' : ''}`}
                  />
                  {flightNumberError && <p className="mt-1 text-xs text-red-400">{flightNumberError}</p>}
                </div>
                <div>
                  <label className={LABEL_CLASS}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={flightDate}
                    onChange={(e) => { setFlightDate(e.target.value); setFlightDateError(''); }}
                    className={`${INPUT_CLASS} ${flightDateError ? 'border-red-500' : ''}`}
                  />
                  {flightDateError && <p className="mt-1 text-xs text-red-400">{flightDateError}</p>}
                </div>
                <div className={`mt-2 ${INFO_TEXT}`}>
                  Computed Key: <span className="font-mono text-teal-400">{oracleKey}</span>
                </div>
                {oracleKeyError && <p className="mt-1 text-xs text-red-400">{oracleKeyError}</p>}
              </div>
            )}

            {product.category === 'defi' && (
              <div className="space-y-2">
                <label className={LABEL_CLASS}>
                  Oracle Key (Fixed)
                </label>
                <div className={`${INPUT_CLASS} font-mono text-gray-500 dark:text-gray-400 select-all`}>
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
                  onChange={(e) => { setOracleKey(e.target.value); setOracleKeyError(''); }}
                  placeholder='e.g. rainfall:1.5,36.8:2026-06'
                  maxLength={32}
                  className={`${INPUT_CLASS} ${oracleKeyError ? 'border-red-500' : ''}`}
                />
                <p className="mt-1 text-[10px] text-gray-400">Max 32 chars</p>
                {oracleKeyError && <p className="mt-1 text-xs text-red-400">{oracleKeyError}</p>}
                <div className={`mt-2 ${INFO_TEXT}`}>
                  Computed Key: <span className="font-mono text-teal-400">{oracleKey}</span>
                </div>
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <div className={CARD_PANEL}>
            <h4 className="font-semibold text-gray-950 dark:text-white">Review your policy</h4>
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Product</span>
              <span className="text-gray-950 dark:text-white font-medium">{product.name}</span>
            </div>
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Coverage</span>
              <span className="text-emerald-400 font-semibold">{coverageNum.toFixed(2)} USDC</span>
            </div>
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Duration</span>
              <span className="text-gray-950 dark:text-white">{duration} days</span>
            </div>
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Oracle key</span>
              <span className="font-mono text-xs text-gray-950 dark:text-white">{oracleKey}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 dark:border-white/10 pt-3 text-gray-500 dark:text-gray-400">
              <span>Premium ({basisPointsToPercent(product.premiumRate)})</span>
              <span className="font-bold text-gray-950 dark:text-white">{estimatedPrem} USDC</span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
            <p>Your Stellar wallet will prompt you to sign the policy transaction.</p>
            <p className="text-xs">
              Premium of <strong className="text-gray-950 dark:text-white">{estimatedPrem} USDC</strong> will be deducted from your wallet balance.
            </p>
          </div>
        )}

        {error && <p className={ERROR_TEXT}>{error}</p>}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onClose}
          disabled={busy}
          className="rounded-xl border border-gray-200 dark:border-white/10 px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-950 dark:hover:text-white disabled:opacity-60 transition-colors"
        >
          Cancel
        </button>
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={busy}
            className="rounded-xl border border-gray-200 dark:border-white/10 px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-950 dark:hover:text-white disabled:opacity-60 transition-colors"
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
          <p className="mt-2 text-sm text-red-500 dark:text-red-400">{walletError}</p>
        )}
      </div>
    </Modal>
  );
}

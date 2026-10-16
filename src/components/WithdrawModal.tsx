'use client';

import { useState, useEffect } from 'react';
import type { PoolStats } from '@/types';
import { useWallet } from '@/hooks/useWallet';
import { fetchPoolShares, fetchPoolUserShares } from '@/lib/api';
import { buildWithdrawTx, submitSignedTransaction, withStateRestore } from '@/lib/contract';
import { signTransaction } from '@/lib/stellar';
import { displayToStroops, stroopsToDisplay } from '@/lib/format';
import { ContractError, toUserMessage } from '@/lib/errors';
import { CATEGORY_LABELS, MIN_WITHDRAW_STROOPS } from '@/lib/constants';
import { Modal } from './Modal';
import { useToast } from '@/context/ToastContext';
import { INPUT_CLASS, LABEL_CLASS } from '@/lib/styles';

interface Props {
  pool: PoolStats;
  onClose: () => void;
}

function estimateUsdc(shares: bigint, totalLiquidity: bigint, shareSupply: bigint): bigint {
  if (shareSupply === 0n) return 0n;
  return (shares * totalLiquidity) / shareSupply;
}

function withdrawErrorMessage(err: unknown): string {
  const raw = err instanceof ContractError
    ? String(err.details ?? err.message)
    : toUserMessage(err);
  const lower = raw.toLowerCase();
  if (lower.includes('insufficient') || lower.includes('shares')) {
    return 'Insufficient LP shares to complete this withdrawal.';
  }
  if (lower.includes('paused') || lower.includes('pause')) {
    return 'This pool is currently paused. Withdrawals are not accepted.';
  }
  return toUserMessage(err);
}

export function WithdrawModal({ pool, onClose }: Props) {
  const { address }           = useWallet();
  const { show: showToast }     = useToast();

  const [amount,       setAmount]       = useState('');
  const [userShares,   setUserShares]   = useState<bigint | null>(null);
  const [shareSupply,  setShareSupply]  = useState<bigint | null>(null);
  const [totalLiquidity, setTotalLiquidity] = useState<bigint | null>(null);
  const [paused,       setPaused]       = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [busy,         setBusy]         = useState(false);
  const [error,        setError]        = useState('');

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchPoolShares(pool.poolId),
      fetchPoolUserShares(pool.poolId, address),
    ])
      .then(([info, userInfo]) => {
        if (cancelled) return;
        setShareSupply(BigInt(info.shareSupply));
        setTotalLiquidity(BigInt(info.totalLiquidity));
        setPaused(info.paused ?? false);
        setUserShares(BigInt(userInfo.shares));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(toUserMessage(err));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pool.poolId, address]);

  const amountNum     = parseFloat(amount) || 0;
  // Reject scientific notation / non-plain-decimal input explicitly (mirrors
  // BuyPolicyModal's coverage validation, #473/#475) rather than relying on
  // displayToStroops's thrown TypeError alone: that error was being caught
  // silently below and treated as "0 shares", which just disables the submit
  // button with no explanation of why (#520).
  const trimmedAmount = amount.trim();
  const invalidFormat = trimmedAmount !== '' && !/^\d+(\.\d+)?$/.test(trimmedAmount);
  let   withdrawShares = 0n;
  try {
    withdrawShares = amount && !invalidFormat ? displayToStroops(amount) : 0n;
  } catch {
    withdrawShares = 0n;
  }

  const sharesAvailable = userShares !== null && shareSupply !== null && totalLiquidity !== null;
  const estimatedUsdc = sharesAvailable
    ? estimateUsdc(withdrawShares, totalLiquidity, shareSupply)
    : 0n;

  // Below the minimum is only allowed when it withdraws the holder's whole
  // (sub-minimum) balance; otherwise it would leave or create unredeemable dust.
  const isFullBalance = userShares !== null && withdrawShares === userShares;
  const belowMinimum  = withdrawShares > 0n && withdrawShares < MIN_WITHDRAW_STROOPS && !isFullBalance;
  const minimumMessage = `Minimum withdrawal is ${stroopsToDisplay(MIN_WITHDRAW_STROOPS.toString(), 2)} shares.`;

  async function handleWithdraw() {
    if (!address) return;
    if (paused) { setError('This pool is currently paused. Withdrawals are not accepted.'); return; }
    if (invalidFormat) { setError('Enter a plain positive number (no scientific notation).'); return; }
    if (amountNum <= 0) { setError('Enter a valid share amount.'); return; }
    if (belowMinimum) { setError(minimumMessage); return; }
    if (userShares !== null && withdrawShares > userShares) {
      setError('Cannot withdraw more shares than you hold.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await withStateRestore(async () => {
        const unsignedXdr = await buildWithdrawTx(pool.poolId, withdrawShares, address);
        const signedXdr   = await signTransaction(unsignedXdr);
        await submitSignedTransaction(signedXdr);
      });
      showToast(`Withdrawn — ${stroopsToDisplay(estimatedUsdc.toString(), 4)} USDC redeemed`, 'success');
      onClose();
    } catch (err) {
      setError(withdrawErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const poolLabel = CATEGORY_LABELS[pool.category] ?? pool.category;

  return (
    <Modal open title={`Withdraw — ${poolLabel} Pool`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={LABEL_CLASS}>
            LP Shares to Withdraw
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(''); }}
            placeholder="0.00"
            min={0}
            step="0.01"
            maxLength={16}
            aria-invalid={invalidFormat || belowMinimum}
            className={`${INPUT_CLASS} ${invalidFormat || belowMinimum ? 'border-red-500' : ''}`}
          />
          {invalidFormat && (
            <p className="mt-1 text-xs text-red-400">
              Enter a plain positive number (no scientific notation).
            </p>
          )}
          {belowMinimum && (
            <p role="alert" className="mt-1 text-xs text-red-400">
              {minimumMessage}
            </p>
          )}
          {sharesAvailable && (
            <p className="mt-1 text-xs text-gray-400">
              Available: {stroopsToDisplay(userShares.toString(), 4)} shares
            </p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Your LP shares</span>
            <span className="text-white">
              {loading ? '…' : sharesAvailable ? stroopsToDisplay(userShares.toString(), 4) : '—'}
            </span>
          </div>
          <div className="mt-2 flex justify-between text-gray-400">
            <span>Pool liquidity</span>
            <span className="text-white">
              {totalLiquidity != null ? stroopsToDisplay(totalLiquidity.toString()) : '—'}
            </span>
          </div>
          <div className="mt-2 flex justify-between text-gray-400">
            <span>Estimated USDC back</span>
            <span className="font-semibold text-emerald-400">
              {sharesAvailable && withdrawShares > 0n
                ? stroopsToDisplay(estimatedUsdc.toString(), 4)
                : '—'}
            </span>
          </div>
        </div>

        {paused && (
          <p className="text-sm text-amber-400">This pool is paused. Withdrawals are temporarily disabled.</p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <button
        onClick={handleWithdraw}
        disabled={busy || loading || paused || withdrawShares === 0n || belowMinimum}
        className="mt-6 w-full rounded-xl bg-teal-500 py-2.5 font-semibold text-white hover:bg-teal-400 disabled:opacity-60 transition-colors"
      >
        {busy ? 'Confirming on chain…' : 'Confirm withdrawal'}
      </button>
    </Modal>
  );
}

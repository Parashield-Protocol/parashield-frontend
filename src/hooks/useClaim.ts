'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchClaim, fetchUserClaims, submitClaim as recordClaimSubmission } from '@/lib/api';
import type { Claim } from '@/types';
import { toUserMessage } from '@/lib/errors';
import { invokeSubmitClaim, type TxStage } from '@/lib/contract';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/context/ToastContext';
import { CLAIM_POLL_INTERVAL_MS, CLAIM_POLL_MAX_ATTEMPTS } from '@/lib/constants';
import { devError } from '@/lib/devConsole';

type ClaimStep = 'idle' | 'submitting' | 'polling' | 'done' | 'timeout' | 'error';

/**
 * Finer-grained progress for a claim submitted in this session, for the
 * step-by-step tracker. Stays null for a claim loaded from history.
 */
export type ClaimProgress = TxStage | 'recording' | 'processing' | 'complete';

export function useClaim(policyId?: string) {
  const { address } = useWallet();
  const { show: showToast }           = useToast();
  const [step,    setStep]    = useState<ClaimStep>('idle');
  const [claimId, setClaimId] = useState<string | null>(null);
  const [claim,   setClaim]   = useState<Claim | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [progress, setProgress] = useState<ClaimProgress | null>(null);

  // Set once on unmount and never cleared: a later submit (e.g. from a stale
  // closure held by a parent) must not re-enable an unmounted hook (#920).
  const unmountedRef = useRef(false);
  // Bumped by every submit and by reset(). An in-flight submit only touches
  // state while it is still the latest generation, so a newer submit or a
  // reset() silences the older one's callbacks (#920).
  const submitGenRef = useRef(0);

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  // Fetch existing claim for this policy on load
  useEffect(() => {
    const walletAddress = address;
    if (!walletAddress || !policyId) {
      setStep('idle');
      setClaim(null);
      setClaimId(null);
      return;
    }

    let active = true;
    async function checkExistingClaim() {
      try {
        const claims = await fetchUserClaims(walletAddress!);
        if (!active) return;
        const existingClaim = claims.find((c) => c.policyId === policyId);
        if (existingClaim) {
          setClaim(existingClaim);
          setClaimId(existingClaim.txHash ?? existingClaim.id);
          if (existingClaim.status === 'Paid' || existingClaim.status === 'Rejected') {
            setStep('done');
          } else {
            setStep('polling');
          }
        } else {
          setStep('idle');
          setClaim(null);
          setClaimId(null);
        }
      } catch (err) {
        devError('Failed to fetch existing claim:', err);
      }
    }

    void checkExistingClaim();

    return () => {
      active = false;
    };
  }, [address, policyId]);

  // Polling loop for pending/processing claims
  useEffect(() => {
    if (step !== 'polling' || !claimId) return;

    const currentClaimId = claimId;
    let active = true;
    let timer: NodeJS.Timeout;
    let count = 0;

    async function poll() {
      if (!active || unmountedRef.current) return;
      try {
        const result = await fetchClaim(currentClaimId);
        // Re-check after await — reset() (which changes `step`, ending this
        // effect) or unmount may have happened while the fetch was in-flight.
        if (!active || unmountedRef.current) return;
        if (result) {
          setClaim(result);
          if (result.status === 'Paid' || result.status === 'Rejected') {
            setStep('done');
            setProgress((p) => (p ? 'complete' : p));
            return;
          }
        }
      } catch (err) {
        if (!active || unmountedRef.current) return;
        devError('Error polling claim:', err);
      }

      count++;
      if (count >= CLAIM_POLL_MAX_ATTEMPTS) {
        setStep('timeout');
      } else {
        timer = setTimeout(poll, CLAIM_POLL_INTERVAL_MS);
      }
    }

    timer = setTimeout(poll, CLAIM_POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [step, claimId]);

  // Named submitPolicyId rather than policyId (#457): the outer useClaim's
  // `policyId` parameter was previously shadowed by an identically-named
  // parameter here, which happened to be harmless since every current
  // caller passes the same value to both -- but the shadowing made it easy
  // to misread which policyId a given line actually uses, and would have
  // silently done the wrong thing if a future caller ever passed different
  // values to useClaim() and submit().
  const submit = useCallback(async (claimant: string, submitPolicyId: string) => {
    if (unmountedRef.current) return { error: null };
    const gen = ++submitGenRef.current;
    const isStale = () => unmountedRef.current || gen !== submitGenRef.current;

    setStep('submitting');
    setProgress('preparing');
    setError(null);
    try {
      const txHash = await invokeSubmitClaim(claimant, submitPolicyId, (stage) => {
        if (!isStale()) setProgress(stage);
      });
      if (isStale()) return { error: null };
      setProgress('recording');

      // The claim is already final on-chain at this point; the backend still
      // needs to be told about it or the claim never shows up in the UI, which
      // reads from the API (issue #244). A failure here is not a failed
      // claim, so surface it as a warning rather than an error.
      try {
        await recordClaimSubmission(claimant, submitPolicyId);
      } catch (syncErr) {
        showToast(
          `Claim submitted on-chain (${txHash.slice(0, 8)}…) but could not be recorded: ${toUserMessage(syncErr)}`,
          'warning',
        );
      }
      if (isStale()) return { error: null };

      setClaimId(txHash);
      setStep('polling');
      setProgress('processing');
      return { error: null };
    } catch (err) {
      if (isStale()) return { error: null };
      const errorMsg = toUserMessage(err);
      setError(errorMsg);
      setStep('error');
      setProgress(null);
      return { error: errorMsg };
    }
  }, [showToast]);

  const reset = useCallback(() => {
    submitGenRef.current++;
    setStep('idle');
    setClaimId(null);
    setClaim(null);
    setError(null);
    setProgress(null);
  }, []);

  return { step, progress, claimId, claim, error, submit, reset };
}

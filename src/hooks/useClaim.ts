'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchClaim, fetchUserClaims, submitClaim as recordClaimSubmission } from '@/lib/api';
import type { Claim } from '@/types';
import { toUserMessage } from '@/lib/errors';
import { invokeSubmitClaim } from '@/lib/contract';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/context/ToastContext';
import { CLAIM_POLL_INTERVAL_MS, CLAIM_POLL_MAX_ATTEMPTS } from '@/lib/constants';

type ClaimStep = 'idle' | 'submitting' | 'polling' | 'done' | 'timeout' | 'error';

export function useClaim(policyId?: string) {
  const { address } = useWallet();
  const { show: showToast }           = useToast();
  const [step,    setStep]    = useState<ClaimStep>('idle');
  const [claimId, setClaimId] = useState<string | null>(null);
  const [claim,   setClaim]   = useState<Claim | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
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
        console.error('Failed to fetch existing claim:', err);
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
      if (cancelledRef.current) return;
      try {
        const result = await fetchClaim(currentClaimId);
        if (!active || cancelledRef.current) return;
        if (result) {
          if (cancelledRef.current) return;
          setClaim(result);
          if (result.status === 'Paid' || result.status === 'Rejected') {
            setStep('done');
            return;
          }
        }
      } catch (err) {
        if (cancelledRef.current) return;
        console.error('Error polling claim:', err);
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
    cancelledRef.current = false;
    setStep('submitting');
    setError(null);
    try {
      const txHash = await invokeSubmitClaim(claimant, submitPolicyId);
      if (cancelledRef.current) return { error: null };

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

      setClaimId(txHash);
      setStep('polling');
      return { error: null };
    } catch (err) {
      if (cancelledRef.current) return { error: null };
      const errorMsg = toUserMessage(err);
      setError(errorMsg);
      setStep('error');
      return { error: errorMsg };
    }
  }, [showToast]);

  const reset = useCallback(() => {
    cancelledRef.current = true;
    setStep('idle');
    setClaimId(null);
    setClaim(null);
    setError(null);
  }, []);

  return { step, claimId, claim, error, submit, reset };
}

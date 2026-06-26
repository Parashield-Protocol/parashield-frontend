'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchClaim } from '@/lib/api';
import type { Claim } from '@/types';
import { toUserMessage } from '@/lib/errors';
import { invokeSubmitClaim } from '@/lib/contract';

type ClaimStep = 'idle' | 'submitting' | 'polling' | 'done' | 'timeout' | 'error';

export function useClaim() {
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

  const submit = useCallback(async (claimant: string, policyId: string) => {
    cancelledRef.current = false;
    setStep('submitting');
    setError(null);
    try {
      const txHash = await invokeSubmitClaim(claimant, policyId);
      if (cancelledRef.current) return { error: null };
      setClaimId(txHash);
      setStep('polling');

      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        if (cancelledRef.current) return { error: null };
        const result = await fetchClaim(txHash);
        if (cancelledRef.current) return { error: null };
        if (result) {
          setClaim(result);
          if (result.status === 'Paid' || result.status === 'Rejected') {
            setStep('done');
            return { error: null };
          }
        }
      }
      if (cancelledRef.current) return { error: null };
      setStep('timeout');
      return { error: null };
    } catch (err) {
      if (cancelledRef.current) return { error: null };
      const errorMsg = toUserMessage(err);
      setError(errorMsg);
      setStep('error');
      return { error: errorMsg };
    }
  }, []);

  const reset = useCallback(() => {
    cancelledRef.current = true;
    setStep('idle');
    setClaimId(null);
    setClaim(null);
    setError(null);
  }, []);

  return { step, claimId, claim, error, submit, reset };
}

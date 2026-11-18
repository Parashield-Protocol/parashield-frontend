'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPoolStats } from '@/lib/api';
import type { PoolStats } from '@/types';
import { POLLING_INTERVAL_MS } from '@/lib/constants';

export function usePools() {
  const [pools, setPools] = useState<PoolStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  // One AbortController per load, the same pattern as usePolicies/useClaims
  // (#929): starting a load aborts the previous one, so a late response from
  // it is discarded, and unmounting aborts whatever is still in flight.
  const controllerRef = useRef<AbortController | null>(null);
  const isFirstLoad = useRef(true);

  const load = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;
    if (isFirstLoad.current) setLoading(true);
    setError(null);
    try {
      const data = await fetchPoolStats();
      if (signal.aborted) return;
      setPools(data);
    } catch (err) {
      if (signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Failed to load pool stats');
    } finally {
      if (!signal.aborted) {
        isFirstLoad.current = false;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => {
      if (!document.hidden) void load();
    }, POLLING_INTERVAL_MS);
    const onVisible = () => { if (!document.hidden) void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      controllerRef.current?.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  return { pools, loading, error, refetch: load };
}

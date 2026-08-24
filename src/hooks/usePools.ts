'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPoolStats } from '@/lib/api';
import type { PoolStats } from '@/types';

export function usePools() {
  const [pools,   setPools]   = useState<PoolStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const requestId = useRef(0);
  const isFirstLoad = useRef(true);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    if (isFirstLoad.current) setLoading(true);
    setError(null);
    try {
      const data = await fetchPoolStats();
      if (id !== requestId.current) return;
      setPools(data);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load pool stats');
    } finally {
      if (id === requestId.current) {
        isFirstLoad.current = false;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { pools, loading, error, refetch: load };
}

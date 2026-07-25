'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchPoolStats } from '@/lib/api';
import type { PoolStats } from '@/types';

export function usePools() {
  const [pools,   setPools]   = useState<PoolStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPoolStats();
      setPools(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pool stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { pools, loading, error, refetch: load };
}

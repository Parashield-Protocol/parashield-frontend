'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchProducts } from '@/lib/api';
import type { Product } from '@/types';
import { POLLING_INTERVAL_MS } from '@/lib/constants';

export function useProducts() {
  const [products,  setProducts]  = useState<Product[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const requestId = useRef(0);
  const isFirstLoad = useRef(true);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    if (isFirstLoad.current) setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts();
      if (id !== requestId.current) return;
      setProducts(data);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      if (id === requestId.current) {
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
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  return { products, loading, error, refetch: load };
}

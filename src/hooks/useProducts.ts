'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchProducts } from '@/lib/api';
import type { Product } from '@/types';

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

  useEffect(() => { void load(); }, [load]);

  return { products, loading, error, refetch: load };
}

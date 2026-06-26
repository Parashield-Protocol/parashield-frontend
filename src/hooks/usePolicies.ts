"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchUserPolicies, fetchPolicy } from "@/lib/api";
import type { Policy } from "@/types";
import { POLLING_INTERVAL_MS } from "@/lib/constants";

export function usePolicies(walletAddress: string | null) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset immediately when wallet disconnects
  useEffect(() => {
    if (!walletAddress) {
      setPolicies([]);
      setError(null);
    }
  }, [walletAddress]);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!walletAddress) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserPolicies(walletAddress);
      if (signal?.aborted) return;
      setPolicies(data);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to load policies");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (!walletAddress) return;
    const controller = new AbortController();
    void load(controller.signal);
    const interval = setInterval(() => {
      if (!document.hidden) void load(controller.signal);
    }, POLLING_INTERVAL_MS);
    const onVisible = () => { if (!document.hidden) void load(controller.signal); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      controller.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load, walletAddress]);

  const refetch = useCallback(() => load(), [load]);

  return { policies, loading, error, refetch };
}

export function usePolicy(id: string | null) {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const p = await fetchPolicy(id);
      setPolicy(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load policy");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void load().then(() => {
      if (cancelled) {
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [load, id]);

  return { policy, loading, error, refetch: load };
}

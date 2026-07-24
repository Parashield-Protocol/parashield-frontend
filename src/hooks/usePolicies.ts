"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchUserPolicies, fetchPolicy } from "@/lib/api";
import type { Policy } from "@/types";
import { POLLING_INTERVAL_MS } from "@/lib/constants";

export function usePolicies(walletAddress: string | null) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFirstLoad = useRef(true);

  const load = useCallback(async (signal: AbortSignal) => {
    if (!walletAddress) return;
    const isFirst = isFirstLoad.current;
    if (isFirst) {
      setLoading(true);
      isFirstLoad.current = false;
    }
    setError(null);
    try {
      const data = await fetchUserPolicies(walletAddress);
      if (signal.aborted) return;
      setPolicies(data);
    } catch (err) {
      if (signal.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to load policies");
    } finally {
      if (isFirst && !signal.aborted) {
        setLoading(false);
      }
    }
  }, [walletAddress]);

  useEffect(() => {
    if (!walletAddress) {
      setPolicies([]);
      setError(null);
      isFirstLoad.current = true;
      return;
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

  const refetch = useCallback(() => {
    const controller = new AbortController();
    return load(controller.signal);
  }, [load]);

  return { policies, loading, error, refetch };
}

export function usePolicy(id: string | null) {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPolicy(id)
      .then((p) => {
        if (!cancelled) {
          setPolicy(p);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load policy");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { policy, loading, error };
}

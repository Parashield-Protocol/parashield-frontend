"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchUserPolicies, fetchPolicy } from "@/lib/api";
import type { Policy } from "@/types";
import { POLLING_INTERVAL_MS } from "@/lib/constants";

export function usePolicies(walletAddress: string | null) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!walletAddress) {
      setPolicies([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserPolicies(walletAddress);
      setPolicies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load policies");
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    void load();
    if (!walletAddress) return;
    const interval = setInterval(() => {
      void load();
    }, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load, walletAddress]);

  return { policies, loading, error, refetch: load };
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

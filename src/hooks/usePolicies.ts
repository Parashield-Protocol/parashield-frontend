"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchUserPolicies, fetchPolicy } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import type { Policy } from "@/types";
import { POLLING_INTERVAL_MS } from "@/lib/constants";

export function usePolicies(walletAddress: string | null) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const isFirstLoad = useRef(true);
  // Seeded with the initial wallet: on mount there is nothing stale to clear.
  const prevWallet = useRef(walletAddress);
  const refetchController = useRef<AbortController | null>(null);

  const load = useCallback(async (signal: AbortSignal) => {
    if (!walletAddress) return;
    const isFirst = isFirstLoad.current;
    if (isFirst) {
      setLoading(true);
      isFirstLoad.current = false;
    }
    if (isFirst) setError(null);
    try {
      const data = await fetchUserPolicies();
      if (signal.aborted) return;
      setPolicies(data);
      setPollingError(null);
    } catch (err) {
      if (signal.aborted) return;
      const message = err instanceof Error ? err.message : "Failed to load policies";
      if (isFirst) {
        setError(message);
      } else {
        setPollingError(message);
      }
    } finally {
      if (isFirst && !signal.aborted) {
        setLoading(false);
      }
    }
  }, [walletAddress]);

  // Reset per-wallet state on *any* identity change, not just on disconnect.
  // Switching accounts inside the wallet extension surfaces as address → address
  // with no intermediate null; keying off falsiness alone left isFirstLoad false,
  // so no loading state was shown and the previous wallet's policies stayed on
  // screen — attributed to the newly-selected wallet (issue #229).
  //
  // Declared before the fetching effect so isFirstLoad is already reset by the
  // time load() runs in the same commit.
  useEffect(() => {
    if (prevWallet.current === walletAddress) return;
    prevWallet.current = walletAddress;
    setPolicies([]);
    setError(null);
    setPollingError(null);
    isFirstLoad.current = true;
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
    refetchController.current?.abort();
    const controller = new AbortController();
    refetchController.current = controller;
    return load(controller.signal);
  }, [load]);

  return { policies, loading, error, pollingError, refetch };
}

const POLICY_CACHE_TTL_MS = 30_000;
const policyCache = new Map<string, { data: Policy; ts: number }>();

export function usePolicy(id: string | null) {
  const [policy, setPolicy] = useState<Policy | null>(() => {
    if (!id) return null;
    const cached = policyCache.get(id);
    if (cached && Date.now() - cached.ts < POLICY_CACHE_TTL_MS) return cached.data;
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const cached = policyCache.get(id);
    if (cached && Date.now() - cached.ts < POLICY_CACHE_TTL_MS) {
      setPolicy(cached.data);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPolicy(id)
      .then((p) => {
        if (!cancelled) {
          policyCache.set(id, { data: p, ts: Date.now() });
          setPolicy(p);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          // 404 means the policy doesn't exist — show "not found" instead of error
          if (isApiError(err) && err.status === 404) {
            setPolicy(null);
          } else {
            setError(err instanceof Error ? err.message : "Failed to load policy");
          }
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

  // Manual refresh (e.g. a "Refresh" button) — deliberately independent of
  // the effect's `cancelled` guard above, since that guard exists to drop
  // stale responses when `id` changes, not to gate a user-triggered refetch.
  const [refetching, setRefetching] = useState(false);

  const refetch = useCallback(async () => {
    if (!id) return;
    setRefetching(true);
    setError(null);
    try {
      const p = await fetchPolicy(id);
      policyCache.set(id, { data: p, ts: Date.now() });
      setPolicy(p);
    } catch (err) {
      // 404 means the policy doesn't exist — show "not found" instead of error
      if (isApiError(err) && err.status === 404) {
        setPolicy(null);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load policy");
      }
    } finally {
      setRefetching(false);
    }
  }, [id]);

  return { policy, loading, refetching, error, refetch };
}

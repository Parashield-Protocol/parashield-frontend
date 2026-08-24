"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchUserClaims } from "@/lib/api";
import type { Claim } from "@/types";
import { CLAIMS_REFRESH_INTERVAL_MS } from "@/lib/constants";

export function useClaims(walletAddress: string | null) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFirstLoad = useRef(true);
  const prevWallet = useRef(walletAddress);
  const refetchController = useRef<AbortController | null>(null);

  const load = useCallback(async (signal: AbortSignal) => {
    if (!walletAddress) return;
    const isFirst = isFirstLoad.current;
    if (isFirst) {
      setLoading(true);
      isFirstLoad.current = false;
    }
    setError(null);
    try {
      const data = await fetchUserClaims(walletAddress);
      if (signal.aborted) return;
      setClaims(data);
    } catch (err) {
      if (signal.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to load claims");
    } finally {
      if (isFirst && !signal.aborted) {
        setLoading(false);
      }
    }
  }, [walletAddress]);

  useEffect(() => {
    if (prevWallet.current === walletAddress) return;
    prevWallet.current = walletAddress;
    setClaims([]);
    setError(null);
    isFirstLoad.current = true;
  }, [walletAddress]);

  useEffect(() => {
    if (!walletAddress) return;
    const controller = new AbortController();
    void load(controller.signal);
    const interval = setInterval(() => {
      if (!document.hidden) void load(controller.signal);
    }, CLAIMS_REFRESH_INTERVAL_MS);
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

  return { claims, loading, error, refetch };
}

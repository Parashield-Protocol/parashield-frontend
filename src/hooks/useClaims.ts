"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchUserClaims } from "@/lib/api";
import type { Claim } from "@/types";
import { CLAIMS_REFRESH_INTERVAL_MS } from "@/lib/constants";

export function useClaims(walletAddress: string | null) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A background poll failing after the initial load already succeeded is
  // a different situation from the initial load itself failing: the user
  // still has valid (if now possibly stale) claims data on screen, so this
  // is surfaced separately from `error` -- consumers can show a subtle
  // "connection lost" indicator alongside the existing table instead of
  // discarding it for a full blocking error state (#466).
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  // Ticks once a second so consumers can derive a live countdown from
  // lastRefreshedAt without the auto-refresh interval itself needing to change.
  const [, forceTick] = useState(0);
  const isFirstLoad = useRef(true);
  const prevWallet = useRef(walletAddress);
  const refetchController = useRef<AbortController | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const load = useCallback(async (signal: AbortSignal) => {
    if (!walletAddress) return;
    const isFirst = isFirstLoad.current;
    if (isFirst) {
      setLoading(true);
      isFirstLoad.current = false;
    }
    if (isFirst) setError(null);
    try {
      const data = await fetchUserClaims(walletAddress);
      if (signal.aborted) return;
      setClaims(data);
      setLastRefreshedAt(Date.now());
      setPollingError(null);
    } catch (err) {
      if (signal.aborted) return;
      const message = err instanceof Error ? err.message : "Failed to load claims";
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

  useEffect(() => {
    if (prevWallet.current === walletAddress) return;
    prevWallet.current = walletAddress;
    setClaims([]);
    setError(null);
    setPollingError(null);
    setLastRefreshedAt(null);
    isFirstLoad.current = true;
  }, [walletAddress]);

  useEffect(() => {
    if (!walletAddress) return;
    const controller = new AbortController();
    void load(controller.signal);
    const interval = setInterval(() => {
      if (pausedRef.current) return;
      if (!document.hidden) void load(controller.signal);
    }, CLAIMS_REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (pausedRef.current) return;
      if (!document.hidden) void load(controller.signal);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      controller.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load, walletAddress]);

  // Drives the countdown display; a no-op once paused since there's nothing
  // counting down to.
  useEffect(() => {
    if (paused) return;
    const tick = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(tick);
  }, [paused]);

  const refetch = useCallback(() => {
    refetchController.current?.abort();
    const controller = new AbortController();
    refetchController.current = controller;
    return load(controller.signal);
  }, [load]);

  const togglePause = useCallback(() => {
    setPaused((p) => !p);
  }, []);

  const secondsUntilRefresh = (() => {
    if (paused || lastRefreshedAt === null) return null;
    const elapsedMs = Date.now() - lastRefreshedAt;
    const remainingMs = CLAIMS_REFRESH_INTERVAL_MS - elapsedMs;
    return Math.max(0, Math.ceil(remainingMs / 1000));
  })();

  const secondsSinceRefresh =
    lastRefreshedAt === null ? null : Math.max(0, Math.floor((Date.now() - lastRefreshedAt) / 1000));

  return {
    claims,
    loading,
    error,
    pollingError,
    refetch,
    paused,
    togglePause,
    secondsUntilRefresh,
    secondsSinceRefresh,
  };
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchOracleReading, fetchAllOracleReadings } from '@/lib/api';
import type { OracleReading } from '@/types';
import { ORACLE_REFRESH_INTERVAL_MS } from '@/lib/constants';

// A tab becoming visible only triggers a refetch if at least this long has
// passed since the last fetch, so rapid tab switching can't flood the API
// (#519). Interval polling remains the primary refresh mechanism.
export const VISIBILITY_REFETCH_MIN_MS = ORACLE_REFRESH_INTERVAL_MS / 2;

function isStale(lastFetchAt: number): boolean {
  return Date.now() - lastFetchAt >= VISIBILITY_REFETCH_MIN_MS;
}

export function useOracleReading(key: string | null) {
  const [reading,  setReading]  = useState<OracleReading | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const isFirstLoad = useRef(true);
  const currentKeyRef = useRef(key);
  const prevKeyRef = useRef(key);
  const lastFetchAtRef = useRef(0);

  const load = useCallback(async () => {
    if (!key) return;
    currentKeyRef.current = key;
    lastFetchAtRef.current = Date.now();
    const isFirst = isFirstLoad.current;
    if (isFirst) {
      setLoading(true);
      isFirstLoad.current = false;
    }
    setError(null);
    try {
      const data = await fetchOracleReading(key);
      if (currentKeyRef.current === key) {
        setReading(data);
      }
    } catch (err) {
      if (currentKeyRef.current === key) {
        setError(err instanceof Error ? err.message : 'Failed to fetch oracle reading');
      }
    } finally {
      if (isFirst && currentKeyRef.current === key) {
        setLoading(false);
      }
    }
  }, [key]);

  // Always points at the load() for the current key, so the visibility
  // listener below can stay registered across key changes.
  const loadRef = useRef(load);
  loadRef.current = load;

  // Registered once for the hook's lifetime rather than per key: tearing it
  // down and re-adding it on every key change left a window where visibility
  // changes went unhandled (#588). load() is a no-op while key is null.
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden && isStale(lastFetchAtRef.current)) void loadRef.current();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    currentKeyRef.current = key;

    // Any key change resets the per-key state, not just a change to null. An
    // oracle key that switches straight from one value to another (e.g. the user
    // picks a different account/product without disconnecting first) previously
    // left isFirstLoad false, so no loading state appeared and the previous key's
    // reading stayed rendered as if it belonged to the new key (issue #229).
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key;
      setReading(null);
      setError(null);
      isFirstLoad.current = true;
    }

    if (!key) return;
    void load();
    const interval = setInterval(() => { if (!document.hidden) void load(); }, ORACLE_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load, key]);

  return { reading, loading, error, refetch: load };
}

export function useAllOracleReadings() {
  const [readings, setReadings] = useState<OracleReading[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const isFirstLoad = useRef(true);
  const refetchController = useRef<AbortController | null>(null);
  const lastFetchAtRef = useRef(0);

  // Guards against a slower in-flight response overwriting a newer one's
  // state (#450) -- mirrors usePolicies'/useClaims' AbortController pattern,
  // the codebase's established fix for this class of stale-response race.
  const load = useCallback(async (signal: AbortSignal) => {
    lastFetchAtRef.current = Date.now();
    const isFirst = isFirstLoad.current;
    if (isFirst) {
      setLoading(true);
      isFirstLoad.current = false;
    }
    setError(null);
    try {
      const data = await fetchAllOracleReadings();
      if (signal.aborted) return;
      setReadings(data);
    } catch (err) {
      if (signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Failed to fetch oracle readings');
    } finally {
      if (isFirst && !signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const interval = setInterval(() => {
      if (!document.hidden) void load(controller.signal);
    }, ORACLE_REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (!document.hidden && isStale(lastFetchAtRef.current)) void load(controller.signal);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      controller.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const refetch = useCallback(() => {
    refetchController.current?.abort();
    const controller = new AbortController();
    refetchController.current = controller;
    return load(controller.signal);
  }, [load]);

  return { readings, loading, error, refetch };
}

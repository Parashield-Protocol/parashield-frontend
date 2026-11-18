'use client';

import { useEffect, useRef } from 'react';
import type { Policy } from '@/types';
import { expiryNotifiedStorageKey } from '@/lib/storageKeys';

export const EXPIRY_WARNING_MS = 24 * 60 * 60 * 1000; // 24 hours

type ShowToast = (message: string, variant?: 'warning', duration?: number) => void;

function readNotified(storageKey: string): string[] {
  try {
    const raw = sessionStorage.getItem(storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeNotified(storageKey: string, ids: Set<string>): void {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify([...ids]));
  } catch {
    // sessionStorage may be unavailable (private mode, quota) -- the in-memory
    // set still prevents duplicates for the lifetime of this page.
  }
}

/**
 * Shows one "expires within 24 hours" toast per expiring policy per session.
 *
 * Dedup lives in an in-memory ref (#532). It previously depended solely on
 * sessionStorage: when a write failed the policy was never recorded, so every
 * re-run of the effect (policy polling, re-renders) fired the toast again.
 * sessionStorage is now only best-effort persistence across reloads.
 */
export function useExpiryWarnings(
  policies: Policy[],
  ready: boolean,
  address: string | null,
  showToast: ShowToast,
): void {
  const notifiedRef = useRef<{ address: string | null; ids: Set<string> }>({ address: null, ids: new Set() });
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  useEffect(() => {
    if (!ready || !address) return;

    // Fingerprinted, so the raw address never appears in a key name (#548).
    const storageKey = expiryNotifiedStorageKey(address);
    if (notifiedRef.current.address !== address) {
      notifiedRef.current = { address, ids: new Set(readNotified(storageKey)) };
    }
    const notified = notifiedRef.current.ids;

    const now = Date.now();
    let added = false;
    for (const policy of policies) {
      const endMs = policy.endTime * 1000;
      if (policy.status !== 'Active' || endMs <= now || endMs - now >= EXPIRY_WARNING_MS) continue;
      if (notified.has(policy.id)) continue;

      notified.add(policy.id);
      added = true;
      const name = policy.product?.name ?? `Policy #${policy.id.slice(0, 8)}`;
      showToastRef.current(`${name} expires within 24 hours`, 'warning', 6000);
    }

    if (added) writeNotified(storageKey, notified);
  }, [policies, ready, address]);
}

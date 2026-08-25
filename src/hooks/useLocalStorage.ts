'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const initialRef = useRef(initialValue);

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const next = value instanceof Function ? value(prev) : value;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [key]);

  const remove = useCallback(() => {
    setStoredValue(initialRef.current);
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }, [key]);

  // The browser only fires `storage` for writes made in *other* tabs/windows
  // (same-tab writes never trigger it, so this never fights with setValue's
  // own state update above) -- this is what lets external localStorage
  // changes (another tab, or a dev-tools edit) actually reach this hook's
  // state instead of leaving it stale until the next unrelated re-render (#472).
  useEffect(() => {
    if (typeof window === 'undefined') return;

    function onStorage(event: StorageEvent) {
      if (event.key !== key) return;
      if (event.newValue === null) {
        setStoredValue(initialRef.current);
        return;
      }
      try {
        setStoredValue(JSON.parse(event.newValue) as T);
      } catch {
        // Malformed external write -- ignore rather than corrupt state.
      }
    }

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  return [storedValue, setValue, remove] as const;
}

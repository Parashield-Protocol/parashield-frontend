'use client';

import { useSyncExternalStore } from 'react';
import { isOnline, subscribe } from '@/lib/networkStatus';

/**
 * Whether the app currently has a working network connection (see
 * lib/networkStatus.ts). Renders as online on the server and during
 * hydration, so offline UI only appears once the client knows otherwise.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, isOnline, () => true);
}

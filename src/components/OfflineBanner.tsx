'use client';

import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/** How long the "back online" confirmation stays up after recovery. */
export const BACK_ONLINE_DISPLAY_MS = 3_000;

export function OfflineBanner() {
  const online = useOnlineStatus();
  const wasOffline = useRef(false);
  const [showRecovered, setShowRecovered] = useState(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setShowRecovered(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setShowRecovered(true);
    const timer = setTimeout(() => setShowRecovered(false), BACK_ONLINE_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [online]);

  // The live region stays mounted so screen readers announce both the drop
  // and the recovery.
  return (
    <div role="status" aria-live="polite">
      {!online && (
        <div className="flex items-center justify-center gap-2 bg-red-500/10 px-4 py-2 text-center text-xs font-semibold text-red-500 dark:text-red-400">
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500 dark:bg-red-400" />
          You&apos;re offline. Actions that need the network are paused until your connection is back.
        </div>
      )}
      {online && showRecovered && (
        <div className="flex items-center justify-center gap-2 bg-emerald-500/10 px-4 py-2 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
          Back online.
        </div>
      )}
    </div>
  );
}

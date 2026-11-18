import type { ReactNode } from 'react';

interface LoadingRegionProps {
  loading: boolean;
  /** Announced to screen readers while loading. */
  label?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Wraps content that shows skeleton placeholders while loading. The container
 * is marked `aria-busy` during the load, and a polite live region announces
 * the loading state. Keep this mounted across the loading → loaded transition
 * so the live region exists before its text changes; mounting it already
 * filled is not reliably announced.
 *
 * The live region sits outside the busy container on purpose: assistive tech
 * may hold back announcements from inside an `aria-busy` subtree.
 */
export function LoadingRegion({ loading, label = 'Loading', className, children }: LoadingRegionProps) {
  return (
    <>
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {loading ? label : ''}
      </span>
      <div aria-busy={loading} className={className}>
        {children}
      </div>
    </>
  );
}

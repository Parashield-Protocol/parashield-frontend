'use client';

import { usePathname } from 'next/navigation';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * Wrapper that passes the current pathname to ErrorBoundary (#748),
 * enabling route-based error boundary reset when navigating.
 */
export function ErrorBoundaryWrapper({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <ErrorBoundary fallback={fallback} pathname={pathname}>
      {children}
    </ErrorBoundary>
  );
}

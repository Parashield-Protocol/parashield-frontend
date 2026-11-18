interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-white/5 ${className ?? ''}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6"
    >
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="mt-2 h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
      <Skeleton className="mt-2 h-10 rounded-xl" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      <Skeleton className="h-10 rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-lg" />
      ))}
    </div>
  );
}

export function SkeletonText({ count = 3 }: SkeletonProps) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === count - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

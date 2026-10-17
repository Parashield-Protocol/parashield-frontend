interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-[3px]',
};

export function LoadingSpinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-spin rounded-full border-white/20 border-t-teal-400 ${SIZE_CLASSES[size]} ${className ?? ''}`}
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}

/**
 * Decorative spinner for inside a button. Hidden from assistive tech so it
 * doesn't change the button's accessible name; mark the button `aria-busy`
 * and keep its text describing the state ("Submitting…") instead.
 */
export function ButtonSpinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white ${className ?? ''}`}
    />
  );
}

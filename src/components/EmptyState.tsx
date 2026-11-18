import Link from 'next/link';

interface EmptyStateProps {
  icon?:        string;
  title:        string;
  description?: string;
  action?:      React.ReactNode;
  className?:   string;
}

interface DefaultActionProps {
  label:     string;
  href?:     string;
  onAction?: () => void;
}

/**
 * Convenience CTA for EmptyState. When both href and onAction are supplied,
 * onAction fires and navigation is prevented — use href-only for plain links.
 */
export function DefaultAction({ label, href, onAction }: DefaultActionProps) {
  if (href) {
    return (
      <Link
        href={href}
        onClick={(e) => {
          if (onAction) {
            e.preventDefault();
            onAction();
          }
        }}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        {label}
      </Link>
    );
  }

  return (
    <button
      onClick={onAction}
      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
    >
      {label}
    </button>
  );
}

export function EmptyState({ icon = '📭', title, description, action, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 text-center ${className ?? ''}`}>
      <span className="text-5xl">{icon}</span>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      {description && (
        <p className="mt-2 max-w-xs text-sm text-gray-400 leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

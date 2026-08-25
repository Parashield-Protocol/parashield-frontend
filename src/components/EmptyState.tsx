interface EmptyStateProps {
  icon?:        string;
  title:        string;
  description?: string;
  action?:      React.ReactNode;
  className?:   string;
}

export function EmptyState({ icon = '📭', title, description, action, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 text-center ${className ?? ''}`}>
      <span className="text-5xl" aria-hidden="true">{icon}</span>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      {description && (
        <p className="mt-2 max-w-xs text-sm text-gray-400 leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

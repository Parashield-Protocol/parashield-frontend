import Link from 'next/link';

interface EmptyStateProps {
  icon?:        string;
  iconSize?:    string;
  title:        string;
  description?: string;
  /** Fully custom action element. Takes precedence over the props below. */
  action?:      React.ReactNode;
  /** Label for a built-in CTA, rendered when `onAction` or `actionHref` is set (#672). */
  actionLabel?: string;
  /** Click handler for the built-in CTA; renders a <button>. */
  onAction?:    () => void;
  /** Navigation target for the built-in CTA; renders a link. Wins over `onAction`. */
  actionHref?:  string;
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
const CTA_CLASS =
  'inline-block rounded-xl bg-teal-500 px-6 py-2.5 font-semibold text-white hover:bg-teal-400 transition-colors';

function DefaultAction({ label, onAction, href }: { label: string; onAction?: () => void; href?: string }) {
  if (href) {
    return (
      <Link href={href} onClick={onAction} className={CTA_CLASS}>
        {label}
      </Link>
    );
  }

  return (
    <button
      onClick={onAction}
      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
    >
  return (
    <button type="button" onClick={onAction} className={CTA_CLASS}>
      {label}
    </button>
  );
}

export function EmptyState({ icon = '📭', title, description, action, className }: EmptyStateProps) {
export function EmptyState({
  icon = '📭',
  iconSize = 'text-5xl',
  title,
  description,
  action,
  actionLabel,
  onAction,
  actionHref,
  className,
}: EmptyStateProps) {
  const cta =
    action ??
    (actionLabel && (onAction || actionHref) ? (
      <DefaultAction label={actionLabel} onAction={onAction} href={actionHref} />
    ) : null);

  return (
    <div className={`flex flex-col items-center justify-center py-20 text-center ${className ?? ''}`}>
      <span className={iconSize} aria-hidden="true">{icon}</span>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      {description && (
        <p className="mt-2 max-w-xs text-sm text-gray-400 leading-relaxed">{description}</p>
      )}
      {cta && <div className="mt-6">{cta}</div>}
    </div>
  );
}

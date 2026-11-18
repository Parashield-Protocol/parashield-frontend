'use client';

import { useEffect, useState } from 'react';
import { Modal } from './Modal';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /**
   * May be async. While its promise is pending both buttons are disabled; if
   * it rejects, the error is shown inside the dialog and the dialog stays
   * open so the user can retry or cancel (#927).
   */
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Branded confirmation dialog replacing `window.confirm` for destructive
 * actions. Uses the app's Modal component for consistent styling, focus
 * trap, and ARIA attributes.
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A fresh open starts clean, not with the previous attempt's error.
  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  async function handleConfirm() {
    setError(null);
    setPending(true);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open={open} onClose={pending ? () => {} : onCancel} title={title}>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">{message}</p>
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-400">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={pending}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          onClick={handleConfirm}
          disabled={pending}
          aria-busy={pending}
          data-testid="confirm-action"
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            destructive
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-teal-500 text-white hover:bg-teal-600'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

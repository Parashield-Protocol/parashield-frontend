'use client';

import { Modal } from './Modal';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
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
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          data-testid="confirm-action"
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
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

'use client';

import { X } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import type { Toast as ToastType } from '@/types';

const VARIANT_STYLES: Record<string, string> = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  error:   'border-red-500/30     bg-red-500/10     text-red-300',
  warning: 'border-amber-500/30   bg-amber-500/10   text-amber-300',
  info:    'border-white/10       bg-white/5        text-gray-200',
};

const VARIANT_ICONS: Record<string, string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

function ToastItem({ toast }: { toast: ToastType }) {
  const { dismiss } = useToast();
  const style  = VARIANT_STYLES[toast.variant] ?? VARIANT_STYLES.info;
  const icon   = VARIANT_ICONS[toast.variant]  ?? VARIANT_ICONS.info;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-sm ${style}`}
    >
      <span className="mt-0.5 text-sm font-bold">{icon}</span>
      <p className="flex-1 text-sm leading-snug">{toast.message}</p>
      <button
        onClick={() => dismiss(toast.id)}
        className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();
  // The live region must stay mounted even with no toasts: screen readers only
  // announce content added to a region that already exists, so rendering it
  // together with the first toast meant nothing was announced (#589). Only
  // additions are announced, so stacking a new toast doesn't re-read the others.
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50"
      role="status"
      aria-live="polite"
      aria-relevant="additions"
    >
      <div className="pointer-events-auto absolute bottom-6 right-6 flex w-[340px] flex-col gap-3 max-h-[calc(100vh-48px)] overflow-y-auto">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </div>
    </div>
  );
}

'use client';

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Toast, ToastVariant } from '@/types';
import { TOAST_DEFAULT_DURATION_MS } from '@/lib/constants';

/** Extra time added when a screen reader is likely active (#605). */
const A11Y_EXTRA_DURATION_MS = 6000;

function isSpeechSynthesisActive(): boolean {
  if (typeof window === 'undefined') return false;
  const synth = window.speechSynthesis;
  if (!synth) return false;
  return synth.speaking && !synth.paused;
}

interface ToastContextValue {
  toasts:  Toast[];
  show:    (message: string, variant?: ToastVariant, duration?: number) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev: Toast[]) => prev.filter((t: Toast) => t.id !== id));
  }, []);

  const show = useCallback((
    message: string,
    variant: ToastVariant = 'info',
    duration = TOAST_DEFAULT_DURATION_MS,
  ) => {
    // Extend timeout when a screen reader is actively reading so it can
    // finish before the toast disappears (#605).
    const effectiveDuration = isSpeechSynthesisActive()
      ? duration + A11Y_EXTRA_DURATION_MS
      : duration;

    setToasts((prev: Toast[]) => {
      if (prev.some((t) => t.message === message)) return prev;
      const id = crypto.randomUUID();
      if (effectiveDuration > 0) {
        timers.current.set(id, setTimeout(() => dismiss(id), effectiveDuration));
      }
      return [...prev, { id, message, variant, duration: effectiveDuration }];
    });
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toasts, show, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

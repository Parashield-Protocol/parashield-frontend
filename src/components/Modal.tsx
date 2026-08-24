'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useModalOverflow } from '@/hooks/useModalOverflow';

interface ModalProps {
  open:     boolean;
  onClose:  () => void;
  title?:   string;
  children: ReactNode;
  maxWidth?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const { lock, unlock } = useModalOverflow();

  // Track mount state and animation visibility
  const [shouldRender, setShouldRender] = useState(false);
  const [visible, setVisible] = useState(false);

  // Mount when open changes to true
  useEffect(() => {
    if (open) {
      setShouldRender(true);
      // Trigger fade-in after mount
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else if (shouldRender) {
      // Start fade-out
      setVisible(false);
    }
  }, [open, shouldRender]);

  // Unmount after close animation finishes
  const handleTransitionEnd = () => {
    if (!open) {
      setShouldRender(false);
      setVisible(false);
    }
  };

  // Keyboard handling (Escape, Tab trap)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    lock();
    return () => unlock();
  }, [open, lock, unlock]);

  // Focus management
  useEffect(() => {
    if (!open) return;

    triggerRef.current = document.activeElement as HTMLElement | null;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusable?.[0] ?? dialogRef.current)?.focus();

    return () => {
      triggerRef.current?.focus();
    };
  }, [open]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ease-out ${
        visible
          ? 'bg-black/50 dark:bg-black/70 backdrop-blur-sm opacity-100'
          : 'bg-black/0 dark:bg-black/0 backdrop-blur-0 opacity-0'
      }`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTransitionEnd={handleTransitionEnd}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`relative w-full ${maxWidth} rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-2xl transition-all duration-300 ease-out ${
          visible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-2'
        }`}
      >
        {title && (
          <div className="mb-5 flex items-center justify-between">
            <h2 id={titleId} className="text-lg font-bold text-gray-950 dark:text-white">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 transition-colors hover:text-gray-950 dark:hover:text-white"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-500 dark:text-gray-400 transition-colors hover:text-gray-950 dark:hover:text-white"
            aria-label="Close modal"
          >
            ✕
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

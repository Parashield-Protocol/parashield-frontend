'use client';

import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import { COPY_FEEDBACK_DURATION_MS } from '@/lib/constants';

interface CopyButtonProps {
  text:      string;
  label?:    string;
  className?: string;
}

export function CopyButton({ text, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { show: showToast } = useToast();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleCopy() {
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'absolute';
        textArea.style.left = '-999999px';
        document.body.prepend(textArea);
        textArea.select();
        try {
          if (!document.execCommand('copy')) {
            throw new Error('execCommand copy failed');
          }
        } catch (error) {
          throw error;
        } finally {
          textArea.remove();
        }
      }
      setCopied(true);
      timerRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
    } catch {
      showToast('Copy failed – please copy the text manually', 'error');
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 text-xs text-gray-400 transition-all hover:border-white/20 hover:text-white active:scale-95 ${className ?? ''}`}
    >
      {copied ? '✓ Copied' : label ?? 'Copy'}
      <span aria-live="polite" className="sr-only">
        {copied ? 'Copied' : ''}
      </span>
    </button>
  );
}

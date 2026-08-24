'use client';

import { useCallback, useRef } from 'react';

let activeModals = 0;
let originalOverflow = '';

export function useModalOverflow() {
  const isOpenRef = useRef(false);

  const lock = useCallback(() => {
    if (isOpenRef.current) return;
    isOpenRef.current = true;

    if (activeModals === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    activeModals++;
  }, []);

  const unlock = useCallback(() => {
    if (!isOpenRef.current) return;
    isOpenRef.current = false;

    activeModals = Math.max(0, activeModals - 1);
    if (activeModals === 0) {
      document.body.style.overflow = originalOverflow;
    }
  }, []);

  return { lock, unlock };
}

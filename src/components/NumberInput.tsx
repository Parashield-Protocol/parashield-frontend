'use client';

import { useEffect, useState, type InputHTMLAttributes } from 'react';
import { numberScrollGuards } from '@/lib/numberInput';

// `type="number"` is a stepper control and iOS Safari changes its value when
// the page scrolls near it (#811). Coarse-pointer (touch) devices get a
// custom text-based number field — numeric keypad, no stepper — while fine
// pointers keep the native input, both with scroll/touch guards.
export function NumberInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [coarsePointer, setCoarsePointer] = useState(false);

  useEffect(() => {
    setCoarsePointer(window.matchMedia?.('(pointer: coarse)').matches === true);
  }, []);

  return (
    <input
      {...props}
      {...numberScrollGuards}
      {...(coarsePointer ? { type: 'text', inputMode: 'decimal' } : { type: 'number' })}
    />
  );
}

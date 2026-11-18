'use client';

import { useEffect } from 'react';
import { validateConfig } from '@/lib/constants';

/**
 * Runs `validateConfig()` once when the app starts in the browser (#931).
 *
 * It used to run at `layout.tsx` module load, which `next build` evaluates
 * for every statically generated route — with contract IDs unset (CI,
 * preview builds) that printed the same three errors once per route. The
 * root layout persists across client navigation, so this effect fires once
 * per full page load.
 */
export function ConfigValidator() {
  useEffect(() => {
    validateConfig();
  }, []);

  return null;
}

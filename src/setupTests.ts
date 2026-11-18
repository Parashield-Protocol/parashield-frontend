import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
// The vitest entry point extends vitest's own `expect`; the bare
// '@testing-library/jest-dom' entry needs a global `expect`, which no longer
// exists now that vitest globals are off (#910).
import '@testing-library/jest-dom/vitest';

// Testing Library only auto-unmounts between tests when it finds a global
// `afterEach`; with globals off it must be registered explicitly, or rendered
// trees leak from one test into the next.
afterEach(() => {
  cleanup();
});

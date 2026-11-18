import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    // No implicit globals (#910): every test file imports describe/it/expect/vi
    // from 'vitest' itself, so its dependencies are explicit and a missing
    // import fails loudly instead of being masked.
    globals: false,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/setupTests.ts'],
  },
});

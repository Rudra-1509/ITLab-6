import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['apps/api/tests/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: {
    alias: {
      '@dms/database': path.resolve(__dirname, './packages/database/src/index.ts'),
      '@': path.resolve(__dirname, './apps/api/src'),
    },
  },
});

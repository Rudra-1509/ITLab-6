import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));

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
      '@dms/database': path.resolve(currentDir, './packages/database/src/index.ts'),
      '@': path.resolve(currentDir, './apps/api/src'),
    },
  },
});

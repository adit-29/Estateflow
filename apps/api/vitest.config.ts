import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // Database suites truncate shared tables.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@estateflow/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});

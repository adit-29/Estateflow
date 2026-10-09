import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node' },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@estateflow/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});

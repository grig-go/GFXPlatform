import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@emergent-platform/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@emergent-platform/types': path.resolve(__dirname, '../../packages/types/src'),
      '@emergent-platform/supabase-client': path.resolve(__dirname, '../../packages/supabase-client/src'),
      '@emergent-platform/design-tokens': path.resolve(__dirname, '../../packages/design-tokens/src'),
    },
  },
});

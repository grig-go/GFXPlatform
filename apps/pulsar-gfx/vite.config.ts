import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@emergent-platform/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@emergent-platform/types': path.resolve(__dirname, '../../packages/types/src'),
      '@emergent-platform/supabase-client': path.resolve(__dirname, '../../packages/supabase-client/src'),
      '@emergent-platform/design-tokens': path.resolve(__dirname, '../../packages/design-tokens/src'),
    },
  },
  envDir: '../../', // Load .env from root
  server: {
    port: 5174, // Different port from Nova GFX (5173)
  },
});

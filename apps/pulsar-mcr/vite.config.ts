import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env from both current dir and monorepo root
  const env = loadEnv(mode, path.resolve(__dirname, '../../'), '');
  const localEnv = loadEnv(mode, process.cwd(), '');

  // Merge environments (local takes precedence)
  const mergedEnv = { ...env, ...localEnv };

  return {
    plugins: [react()],
    envDir: '../../', // Load .env from root
    server: {
      host: '0.0.0.0',
      port: parseInt(mergedEnv.VITE_PULSAR_PORT || mergedEnv.VITE_PORT) || 5174,
      watch: {
        ignored: ['**/logs/**'],
      },
    },
    build: {
      outDir: 'dist',
    },
  };
});
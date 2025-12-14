import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    envDir: '../../', // Load .env from root
    build: {
      target: 'esnext',
      outDir: 'dist',
    },
    server: {
      port: parseInt(env.VITE_PULSAR_VS_PORT || '3004'),
      strictPort: false,
      open: true,
    },
  };
});

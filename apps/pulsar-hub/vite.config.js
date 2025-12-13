import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, path.resolve(__dirname, '../../'), '');
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
            port: parseInt(env.VITE_PULSAR_HUB_PORT || '3005'),
            strictPort: false,
            open: true,
        },
    };
});

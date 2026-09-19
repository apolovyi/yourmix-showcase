import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3050,
    host: '0.0.0.0',
    proxy: process.env.E2E_BACKEND
      ? { '/api': { target: process.env.E2E_BACKEND, changeOrigin: true } }
      : undefined,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('@sentry')) return 'vendor-sentry';
          if (id.includes('@tanstack')) return 'vendor-tanstack';
        },
      },
    },
  },
});

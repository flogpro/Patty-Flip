import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { shared: path.resolve(__dirname, 'server/shared') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.LOCAL_API_PORT || 3001}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'webroot',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
    },
  },
});

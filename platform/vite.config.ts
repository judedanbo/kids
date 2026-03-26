import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});

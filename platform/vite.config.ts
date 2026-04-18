import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Kids Games Zone',
        short_name: 'Kids Games',
        description: 'Fun educational games for kids ages 3-12',
        theme_color: '#4a90d9',
        background_color: '#fff8f0',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Precache the app shell + PWA icons only. Bulk content assets
        // (mp3, webp) are handled by runtimeCaching below — precaching
        // thousands of them blows past practical SW install limits.
        globPatterns: ['**/*.{js,css,html,svg,ico,png}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /\.(?:woff2|mp3)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-fonts',
              expiration: { maxEntries: 1200, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /\.webp$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 400, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
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
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          'vendor-audio': ['howler'],
        },
      },
    },
  },
});

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
  },
  resolve: {
    alias: {
      '@kids-games-zone/shared': path.resolve(__dirname, '../../shared/src'),
      'react-i18next': path.resolve(__dirname, 'src/__mocks__/react-i18next.ts'),
    },
  },
});

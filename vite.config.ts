import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest: manifest as any }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    modulePreload: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        help: resolve(__dirname, 'src/help/index.html'),
        preview: resolve(__dirname, 'src/preview/index.html'),
      },
    },
  },
});

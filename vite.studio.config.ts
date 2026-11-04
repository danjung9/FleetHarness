import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// A separate bundle: the original entry, styles and dist directory stay intact.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { host: '127.0.0.1', port: 5174, strictPort: true, open: false },
  build: { outDir: 'dist-studio', rollupOptions: { input: resolve(import.meta.dirname, 'studio/index.html') } }
});

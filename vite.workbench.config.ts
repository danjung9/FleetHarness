import { defineConfig, type PreviewServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

function entry(server: ViteDevServer | PreviewServer) {
  server.middlewares.use((request, response, next) => {
    if (request.url !== '/' && request.url !== '/index.html') return next();
    response.writeHead(302, { Location: '/workbench/index.html' }); response.end();
  });
}

export default defineConfig({
  plugins: [react(), { name: 'workbench-entry', configureServer: entry, configurePreviewServer: entry }], base: './',
  server: { host: '127.0.0.1', port: 5176, strictPort: true, open: false },
  build: { outDir: 'dist-workbench', rollupOptions: { input: resolve(import.meta.dirname, 'workbench/index.html') } }
});

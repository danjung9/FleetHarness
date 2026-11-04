import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { workflow } from 'workflow/vite';
import { hostedContentSecurityPolicy } from './src/hosted-csp.js';

export default defineConfig(({ mode, command }) => ({
  plugins: [react(), nitro(), workflow(), {
    name: 'hosted-content-security-policy',
    transformIndexHtml(html) {
      const env = loadEnv(mode, process.cwd(), 'VITE_');
      const policy = hostedContentSecurityPolicy(env.VITE_SUPABASE_URL, command === 'serve');
      return html.replace(/(<meta\s+http-equiv="Content-Security-Policy"\s+content=")[^"]*("\s*\/?>)/i, `$1${policy}$2`);
    }
  }],
  base: '/',
  define: { 'import.meta.env.VITE_HOSTED': JSON.stringify('true') },
  nitro: { serverDir: './', serverAssets: [{ baseName: 'worker', dir: './dist-worker-asset' }] },
}));

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { workerContentSecurityPolicy } from './shared/worker-policy';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  const policy = workerContentSecurityPolicy(env.VITE_APPYARD_WORKER_URL, env.VITE_APPYARD_PREVIEW_ORIGIN, mode === 'development');
  return { plugins: [react(), { name: 'appyard-worker-policy', transformIndexHtml(html: string) {
    return html.replace(/(<meta http-equiv="Content-Security-Policy" content=")[^"]*("\s*\/>)/, (_, start: string, end: string) => start + policy + end);
  } }], base: './' };
});

/** The builder can contact its worker and embed its separate preview domain only. */
export function workerContentSecurityPolicy(workerURL: string | undefined, previewOrigin: string | undefined, development: boolean) {
  const base = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";
  if (!workerURL) return base + "; connect-src 'self' ws://127.0.0.1:5173; frame-src http://127.0.0.1:*";
  const worker = new URL(workerURL);
  const local = (host: string) => host === '127.0.0.1' || host === 'localhost';
  if ((worker.protocol !== 'https:' && !(development && worker.protocol === 'http:' && local(worker.hostname))) || worker.username || worker.password || worker.pathname !== '/' || worker.search || worker.hash) throw new Error('VITE_APPYARD_WORKER_URL must be an HTTPS origin (loopback HTTP is allowed in development).');
  if (!previewOrigin) throw new Error('Set VITE_APPYARD_PREVIEW_ORIGIN to the separate wildcard preview origin.');
  const preview = new URL(previewOrigin);
  if (preview.origin !== previewOrigin || preview.origin === worker.origin || !preview.hostname.startsWith('*.') ||
      (preview.protocol !== 'https:' && !(development && preview.protocol === 'http:' && preview.hostname === '*.localhost'))) throw new Error('VITE_APPYARD_PREVIEW_ORIGIN must be a separate HTTPS wildcard origin, such as https://*.preview.example.com.');
  return base + `; connect-src 'self' ${worker.origin}${development ? ' ws://127.0.0.1:*' : ''}; frame-src ${preview.origin}`;
}

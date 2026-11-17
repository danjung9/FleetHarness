import { startWorker } from './worker-server.js';
const worker = await startWorker({ root: process.env.APPYARD_DATA_DIR ?? './output/worker',token: process.env.APPYARD_WORKER_TOKEN ?? '',encryptionKey: process.env.APPYARD_ENCRYPTION_KEY ?? '',
  origins: (process.env.APPYARD_FRONTEND_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean),
  previewDomain: process.env.APPYARD_PREVIEW_DOMAIN ?? 'localhost:3001', previewScheme: process.env.APPYARD_PREVIEW_SCHEME === 'http' ? 'http' : 'https',
  port: Number(process.env.PORT ?? 3000),previewPort: Number(process.env.APPYARD_PREVIEW_PORT ?? 3001) });
console.info('AppYard build worker ready.');
let closing = false;
for (const signal of ['SIGTERM','SIGINT']) process.once(signal,() => { if (closing) return; closing = true; void worker.close().then(() => process.exit(0),() => process.exit(1)); });

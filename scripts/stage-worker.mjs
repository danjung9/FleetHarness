import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist-worker-asset', { recursive: true });
await copyFile('dist-worker.tar.gz', 'dist-worker-asset/dist-worker.tar.gz');

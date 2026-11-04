import { createServer, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { safeFile } from './storage.js';

// Each run gets a separate loopback origin. Preview scripts cannot access the
// file:// application origin, its preload bridge, or another run's localStorage.
export class PreviewServers {
  private servers = new Map<string, { server: Server; url: string }>();
  async url(workspace: string) {
    const cached = this.servers.get(workspace);
    if (cached) return cached.url;
    const file = await safeFile(workspace, 'index.html');
    const token = randomBytes(24).toString('hex');
    const server = createServer(async (request, response) => {
      if (request.url !== '/' + token || request.method !== 'GET') { response.writeHead(404).end(); return; }
      try {
        const content = await fs.readFile(await safeFile(workspace, 'index.html'));
        if (content.length > 2_000_000) { response.writeHead(413).end('Preview exceeds 2 MB.'); return; }
        response.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; sandbox allow-scripts allow-same-origin allow-downloads"
        }).end(content);
      } catch { response.writeHead(404).end('The preview file is no longer available.'); }
    });
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Preview server could not start.');
    const url = 'http://127.0.0.1:' + address.port + '/' + token;
    this.servers.set(workspace, { server, url });
    return url;
  }
  close() { for (const { server } of this.servers.values()) server.close(); this.servers.clear(); }
}

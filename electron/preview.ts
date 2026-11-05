import { createServer, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { safeFile } from './storage.js';
import path from 'node:path';

// Each run gets a separate loopback origin. Preview scripts cannot access the
// file:// application origin, its preload bridge, or another run's localStorage.
export class PreviewServers {
  private servers = new Map<string, { server: Server; url: string }>();
  // A reload in the same run keeps its origin, so the app's browser storage survives. A new run has a new workspace, so a new origin.
  private ports = new Map<string, number>();
  async url(workspace: string, files?: readonly string[]) {
    const key = workspace + '\0' + JSON.stringify(files ?? []);
    const cached = this.servers.get(key);
    if (cached) return cached.url;
    const file = await safeFile(workspace, 'index.html');
    const token = randomBytes(24).toString('hex');
    const allowed = new Set(files ?? ['index.html']);
    const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
    const server = createServer(async (request, response) => {
      let relative = 'index.html';
      if (files) {
        try {
          const pathname = decodeURIComponent(new URL(request.url ?? '', 'http://localhost').pathname);
          if (!pathname.startsWith('/' + token + '/')) { response.writeHead(404).end(); return; }
          relative = pathname.slice(token.length + 2);
        } catch { response.writeHead(400).end(); return; }
      } else if (request.url !== '/' + token) { response.writeHead(404).end(); return; }
      if (request.method !== 'GET' || !allowed.has(relative)) { response.writeHead(404).end(); return; }
      try {
        const content = await fs.readFile(await safeFile(workspace, relative));
        if (content.length > 2_000_000) { response.writeHead(413).end('Preview exceeds 2 MB.'); return; }
        response.writeHead(200, {
          'Content-Type': types[path.extname(relative)] ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        }).end(content);
      } catch { response.writeHead(404).end('The preview file is no longer available.'); }
    });
    const listen = (port: number) => new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => { server.off('error', reject); resolve(); }); });
    const earlier = this.ports.get(key);
    if (earlier) await listen(earlier).catch(() => listen(0));
    else await listen(0);
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Preview server could not start.');
    this.ports.set(key, address.port);
    const url = 'http://127.0.0.1:' + address.port + '/' + token + (files ? '/index.html' : '');
    this.servers.set(key, { server, url });
    return url;
  }
  stop(workspace: string) {
    for (const [key, { server }] of this.servers) if (key.startsWith(workspace + '\0')) {
      server.close(); server.closeAllConnections(); this.servers.delete(key);
    }
  }
  close() { for (const { server } of this.servers.values()) { server.close(); server.closeAllConnections(); } this.servers.clear(); }
}

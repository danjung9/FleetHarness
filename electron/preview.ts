import { createServer, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { safeFile } from './storage.js';
import path from 'node:path';

// Each run gets a separate loopback origin. Preview scripts cannot access the
// file:// application origin, its preload bridge, or another run's localStorage.
export class PreviewServers {
  private servers = new Map<string, { server: Server; url: string }>();
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
          'Content-Security-Policy': files
            ? "default-src 'none'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; sandbox allow-scripts allow-same-origin allow-downloads allow-forms"
            : "default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; sandbox allow-scripts allow-same-origin allow-downloads allow-forms"
        }).end(content);
      } catch { response.writeHead(404).end('The preview file is no longer available.'); }
    });
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Preview server could not start.');
    const url = 'http://127.0.0.1:' + address.port + '/' + token + (files ? '/index.html' : '');
    this.servers.set(key, { server, url });
    return url;
  }
  close() { for (const { server } of this.servers.values()) server.close(); this.servers.clear(); }
}

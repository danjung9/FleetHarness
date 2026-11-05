import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WebContents } from 'electron';

/** A renderer may load its own shell and the current host-issued preview lease only. */
export class PreviewBoundary {
  private origin?: string;
  private embeddingOrigin?: string;
  constructor(private shell: { fileRoot: string; developmentURL?: string }) {}
  setPreview(url: string | null | undefined, options: { allowShellEmbedding?: boolean } = {}) {
    this.origin = undefined;
    this.embeddingOrigin = undefined;
    if (!url) return;
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' || parsed.hostname !== '127.0.0.1' || !parsed.port || parsed.username || parsed.password) throw new Error('A preview requires a host-issued loopback runtime.');
    this.origin = parsed.origin;
    if (options.allowShellEmbedding && this.shell.developmentURL) this.embeddingOrigin = new URL(this.shell.developmentURL).origin;
  }
  allows(url: string, main: boolean) {
    let parsed: URL;
    try { parsed = new URL(url); } catch { return false; }
    // These schemes cannot initiate a network request. The iframe remains sandboxed.
    if (['data:', 'blob:', 'about:'].includes(parsed.protocol)) return true;
    if (this.origin && parsed.origin === this.origin && parsed.protocol === 'http:') return true;
    if (!main) return false;
    if (parsed.protocol === 'file:') {
      const file = fileURLToPath(parsed), relative = path.relative(this.shell.fileRoot, file);
      return !relative.startsWith('..') && !path.isAbsolute(relative);
    }
    if (this.shell.developmentURL) {
      const allowed = new URL(this.shell.developmentURL);
      return parsed.host === allowed.host && ['http:', 'ws:'].includes(parsed.protocol);
    }
    return false;
  }
  install(contents: WebContents) {
    // Imported demos permit the packaged file: shell. During development, allow
    // this exact shell origin too, only on this window's selected demo frames.
    contents.session.webRequest.onHeadersReceived((details, callback) => {
      if (!this.embeddingOrigin || details.webContentsId !== contents.id || details.resourceType !== 'subFrame'
        || new URL(details.url).origin !== this.origin || !details.responseHeaders) { callback({}); return; }
      const origin = this.embeddingOrigin;
      const responseHeaders = { ...details.responseHeaders };
      for (const key of Object.keys(responseHeaders)) {
        if (key.toLowerCase() !== 'content-security-policy') continue;
        responseHeaders[key] = responseHeaders[key].map(policy => policy.replace(/(^|;)(\s*frame-ancestors)([^;]*)/gi, (directive, prefix, name, sources: string) => {
          const allowed = sources.trim().split(/\s+/);
          if (allowed.includes("'none'") || allowed.includes(origin)) return directive;
          return `${prefix}${name}${sources.trimEnd()} ${origin}`;
        }));
      }
      callback({ responseHeaders });
    });
    // Covers redirects, iframe self-navigation, workers and non-fetch browser requests.
    // Missing/destroyed frame identity is deliberately treated as untrusted.
    contents.session.webRequest.onBeforeRequest((details, callback) => {
      if (details.webContentsId !== undefined && details.webContentsId !== contents.id) { callback({ cancel: true }); return; }
      const main = details.resourceType === 'mainFrame' || details.frame === contents.mainFrame;
      callback({ cancel: !this.allows(details.url, main) });
    });
    contents.on('will-frame-navigate', event => {
      if (event.isMainFrame || !this.allows(event.url, false)) event.preventDefault();
    });
  }
}

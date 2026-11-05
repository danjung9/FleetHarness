// Explicit orchestration fixture. This does not prove that Chrome launches or renders.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { AgentBrowserSession } from '../../dist-electron/electron/agent-browser.js';
import { runtimeFilesHash } from '../../dist-electron/electron/visual-review.js';
function png(width, height, color = 245) {
  const chunk = (name, bytes) => {
    const data = Buffer.concat([Buffer.from(name), bytes]), length = Buffer.alloc(4), crc = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length);
    let value = 0xffffffff;
    for (const byte of data) {
      value ^= byte;
      for (let bit = 0; bit < 8; bit++) value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
    }
    crc.writeUInt32BE((value ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, data, crc]);
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  const row = Buffer.alloc(width * 3 + 1, color); row[0] = 0;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.concat(Array.from({ length: height }, () => row)))), chunk('IEND', Buffer.alloc(0))]);
}
const images = { desktop: png(1280, 800), narrow: png(390, 844) };

export function syntheticBrowser(t) {
  const original = AgentBrowserSession.prototype.tools;
  t.mock.method(AgentBrowserSession.prototype, 'tools', function () {
    const browser = this;
    return original.call(this).map(tool => ({ ...tool, async execute(_id, input) {
      const viewport = input.viewport ?? 'desktop', bytes = images[viewport];
      const manifest = JSON.parse(await fs.readFile(path.join(browser.options.root, 'solution-contract.json'), 'utf8')).runtime;
      const screenshot = '.browser-observations/' + randomUUID() + '/' + createHash('sha256').update(bytes).digest('hex').slice(0, 12) + '-' + randomUUID() + '.png';
      await fs.mkdir(path.dirname(path.join(browser.options.root, screenshot)), { recursive: true });
      await fs.writeFile(path.join(browser.options.root, screenshot), bytes);
      const captureId = await browser.options.onCapture({ viewport, screenshot, filesHash: await runtimeFilesHash(browser.options.root, manifest),
        screenshotHash: createHash('sha256').update(bytes).digest('hex') });
      const details = { captureId, viewport, dimensions: viewport === 'desktop' ? { width: 1280, height: 800 } : { width: 390, height: 844 },
        pageText: 'Synthetic orchestration image, not browser evidence.', controls: [] };
      return { content: [{ type: 'text', text: JSON.stringify(details) }, { type: 'image', mimeType: 'image/png', data: bytes.toString('base64') }], details, isError: false };
    } }));
  });
}

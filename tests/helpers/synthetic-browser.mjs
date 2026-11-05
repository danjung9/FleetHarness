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
    let viewport = 'desktop', generationId, value = '', result = 'No synthetic result yet.';
    const dom = () => ({ route: '/', pageText: result, headings: ['Synthetic orchestration fixture'],
      controls: [{ selector: '#message', tag: 'input', role: '', name: 'Message', value, inViewport: true },
        { selector: '#parse', tag: 'button', role: '', name: 'Parse message', inViewport: true }],
      screens: [], screenIds: [...new Set((browser.options.journeys ?? []).flatMap(journey => journey.steps
        .filter(step => step.action === 'expectScreen').map(step => step.screenId)))],
      content: [{ selector: '#result', text: result }] });
    return original.call(this).map(tool => ({ ...tool, async execute(_id, input) {
      viewport = input.viewport ?? viewport;
      if (input.action === 'open') { generationId = randomUUID(); value = ''; result = 'No synthetic result yet.'; }
      const before = dom();
      const attempt = generationId && ['type', 'click'].includes(input.action)
        ? browser.flow.begin(generationId, viewport, input, before) : undefined;
      if (input.action === 'type') value = input.text;
      if (input.action === 'click') result = 'Synthetic task result: ' + value;
      const bytes = images[viewport];
      const manifest = JSON.parse(await fs.readFile(path.join(browser.options.root, 'solution-contract.json'), 'utf8')).runtime;
      const screenshot = '.browser-observations/' + randomUUID() + '/' + createHash('sha256').update(bytes).digest('hex').slice(0, 12) + '-' + randomUUID() + '.png';
      await fs.mkdir(path.dirname(path.join(browser.options.root, screenshot)), { recursive: true });
      await fs.writeFile(path.join(browser.options.root, screenshot), bytes);
      const definition = input.action === 'journey' ? browser.options.journeys?.find(item => item.id === input.journeyId) : undefined;
      const journey = definition ? { id: definition.id, status: 'passed', completedSteps: definition.steps.length, totalSteps: definition.steps.length, detail: 'Synthetic orchestration journey' } : undefined;
      const filesHash = await runtimeFilesHash(browser.options.root, manifest);
      const captureId = await browser.options.onCapture({ viewport, screenshot, ...(journey ? { journey } : {}), filesHash,
        screenshotHash: createHash('sha256').update(bytes).digest('hex') });
      // The orchestration fixture records explicitly synthetic transitions. Native
      // browser/flow suites independently prove actual DOM and screenshot behavior.
      if (generationId && input.action !== 'journey') browser.flow.record({ ...dom(), id: randomUUID(), generationId,
        openedViewport: viewport, viewport, action: input.action, filesHash, screenshot,
        screenshotHash: createHash('sha256').update(bytes).digest('hex'), capturedAt: new Date().toISOString(), errors: [] }, attempt);
      const details = { ...dom(), captureId, viewport, journeys: browser.options.journeys ?? [], ...(journey ? { journey } : {}), dimensions: viewport === 'desktop' ? { width: 1280, height: 800 } : { width: 390, height: 844 },
        synthetic: true };
      return { content: [{ type: 'text', text: JSON.stringify(details) }, { type: 'image', mimeType: 'image/png', data: bytes.toString('base64') }], details, isError: false };
    } }));
  });
}

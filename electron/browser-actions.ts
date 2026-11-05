import type { Download, Page } from 'playwright';
import { isDeepStrictEqual } from 'node:util';
import type { BrowserStep, UxSpec } from '../shared/quality.js';
import type { JsonValue } from '../shared/solution.js';
import { parseUxSpec } from '../harness/quality-contract.js';
import { parseContractJson } from '../harness/solution-contract.js';
import type { BrowserHttpEvidence } from './browser-http-evidence.js';

const maxDownloadBytes = 8_000_000;
const normalized = (text: string) => text.replace(/\s+/g, ' ').trim();

export interface BrowserRuntimeHooks {
  restart?: () => Promise<void>;
  invokeService?: (input: JsonValue) => Promise<JsonValue>;
}

function cssTarget(page: Page, selector: string) {
  if (typeof selector !== 'string' || !selector.trim() || selector.includes('>>')) {
    throw new Error('Use a single CSS selector, without Playwright selector-engine chains.');
  }
  return page.locator('css=' + selector);
}

async function expectScreen(page: Page, screenId: string, timeout: number, supplied?: UxSpec, routeBase = '') {
  if (!supplied || supplied.schemaVersion !== 2) throw new Error('expectScreen requires a frozen version 2 UX contract.');
  const ux = parseUxSpec(supplied);
  if (ux.schemaVersion !== 2) throw new Error('expectScreen requires a frozen version 2 UX contract.');
  const screen = ux.screens.find(candidate => candidate.id === screenId);
  if (!screen) throw new Error('expectScreen references an unknown frozen screen: ' + screenId + '.');
  // Only the host runtime supplies this mount, for example a static preview's
  // random URL prefix. Application-authored routes remain exact and portable.
  if (routeBase && (!routeBase.startsWith('/') || routeBase.startsWith('//') || routeBase.endsWith('/') || /[\\\s?#]/.test(routeBase)
    || new URL(routeBase, 'http://127.0.0.1').pathname !== routeBase)) throw new Error('Invalid host runtime route base.');
  const expectedRoute = routeBase + screen.route;
  const roots = ux.screens.map(({ id, selector }) => ({ id, selector }));
  for (const root of roots) cssTarget(page, root.selector);
  let problem = 'The browser did not complete a screen observation before the deadline.';
  let expired = false, timer: ReturnType<typeof setTimeout> | undefined, polling: ReturnType<typeof setTimeout> | undefined;
  let wake: (() => void) | undefined;
  const failure = () => new Error(`expectScreen ${screenId}: ${problem}`);
  // This is the authoritative step deadline, including a stalled DOM read.
  // Callers retain global cancellation but must not race a second step timer
  // that discards the last observed mismatch under host or renderer load.
  const stopped = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { expired = true; reject(failure()); }, timeout);
  });
  const observe = async () => {
    while (!expired) {
      try {
        // One renderer turn observes the route and every root together. Separate
        // locator round trips can mix two screens during navigation and consume
        // an entire short step budget before recording any concrete evidence.
        const snapshot = await page.evaluate(roots => {
          const visible = (element: Element): boolean => {
            const style = getComputedStyle(element);
            // Match Chromium/Playwright visibility: display:contents can expose
            // child boxes or text; opacity zero alone does not hide an element.
            if (style.display === 'contents') {
              return Array.from(element.childNodes).some(child => {
                if (child.nodeType === Node.ELEMENT_NODE) return visible(child as Element);
                if (child.nodeType !== Node.TEXT_NODE) return false;
                const range = document.createRange(); range.selectNode(child);
                const box = range.getBoundingClientRect();
                return box.width > 0 && box.height > 0;
              });
            }
            if (!element.checkVisibility() || style.visibility !== 'visible') return false;
            const box = element.getBoundingClientRect();
            return box.width > 0 && box.height > 0;
          };
          const route = location.pathname + location.search + location.hash;
          const screens = roots.map(root => {
            const elements = Array.from(document.querySelectorAll(root.selector));
            return { ...root, count: elements.length, visible: elements.length === 1 && visible(elements[0]) };
          });
          return { route, screens };
        }, roots);
        if (expired) return;
        let mismatch = snapshot.route !== expectedRoute ? `Expected route ${JSON.stringify(expectedRoute)}, received ${JSON.stringify(snapshot.route)}.` : '';
        if (!mismatch) for (const root of snapshot.screens) {
          if (root.count > 1) { mismatch = `Screen ${root.id} must identify one root; ${root.selector} matched ${root.count}.`; break; }
          if (root.id === screenId && !root.visible) { mismatch = `Screen ${root.id} must have exactly one visible root (${root.selector}).`; break; }
          if (root.id !== screenId && root.visible) { mismatch = `Inactive screen ${root.id} is still visible (${root.selector}); hide it or navigate to a separate page.`; break; }
        }
        if (!mismatch) return;
        problem = mismatch;
      } catch (error) {
        // A document replacement briefly destroys the old execution context.
        // Preserve the last concrete observation while waiting for the new one.
        if (!(error instanceof Error) || !/Execution context was destroyed|Cannot find context with specified id/.test(error.message)) throw error;
      }
      if (!expired) await new Promise<void>(resolve => { wake = resolve; polling = setTimeout(resolve, 50); });
    }
  };
  try { await Promise.race([observe(), stopped]); }
  finally { expired = true; clearTimeout(timer); clearTimeout(polling); wake?.(); }
}

/** The same host-authored steps drive development review and final verification.
 * Callers own origin restrictions, unexpected-download cancellation and deadlines. */
export async function performBrowserStep(page: Page, step: BrowserStep, timeout: number, httpEvidence?: BrowserHttpEvidence, ux?: UxSpec, routeBase?: string, runtime?: BrowserRuntimeHooks) {
  if (step.action === 'expectScreen') { await expectScreen(page, step.screenId, timeout, ux, routeBase); return; }
  if (step.action === 'expectHttpError') {
    if (!httpEvidence) throw new Error('Expected HTTP rejection requires host-recorded browser response evidence.');
    await httpEvidence.expectError(step, timeout);
    return;
  }
  if (step.action === 'reload') { await page.reload({ waitUntil: 'domcontentloaded', timeout }); return; }
  if (step.action === 'restartRuntime') {
    if (!runtime?.restart) throw new Error('restartRuntime requires a host-managed service runtime with restart support.');
    await runtime.restart();
    await page.reload({ waitUntil: 'domcontentloaded', timeout });
    return;
  }
  if (step.action === 'expectServiceState') {
    if (!runtime?.invokeService) throw new Error('expectServiceState requires a host-managed service invocation; browser JavaScript cannot provide this evidence.');
    const input = parseContractJson(step.input, 'expectServiceState.input');
    const expected = parseContractJson(step.expected, 'expectServiceState.expected');
    const actual = parseContractJson(await runtime.invokeService(input), 'expectServiceState response');
    if (!isDeepStrictEqual(actual, expected)) throw new Error(`expectServiceState: expected ${JSON.stringify(expected).slice(0, 500)}, received ${JSON.stringify(actual).slice(0, 500)}.`);
    return;
  }
  // Prefixing with css prevents selectors from being treated as executable browser code.
  const target = cssTarget(page, step.selector);
  switch (step.action) {
    case 'fill': await target.fill(step.value, { timeout }); break;
    case 'click': await target.click({ timeout }); break;
    case 'select': await target.selectOption(step.value, { timeout }); break;
    case 'press': await target.press(step.key, { timeout }); break;
    case 'check': await target.check({ timeout }); break;
    case 'expectVisible': await target.waitFor({ state: 'visible', timeout }); break;
    case 'expectHidden': await target.waitFor({ state: 'hidden', timeout }); break;
    case 'expectText':
    case 'expectValue': {
      await target.waitFor({ state: 'visible', timeout });
      const expected = step.action === 'expectText' ? normalized(step.text) : step.value;
      const until = Date.now() + timeout;
      let actual = '';
      do {
        actual = step.action === 'expectText' ? normalized(await target.innerText({ timeout })) : await target.inputValue({ timeout });
        if (actual === expected) return;
        if (Date.now() >= until) break;
        await new Promise(resolve => setTimeout(resolve, Math.min(50, Math.max(1, until - Date.now()))));
      } while (Date.now() < until);
      throw new Error(`${step.action} ${step.selector}: expected ${JSON.stringify(expected.slice(0, 500))}, received ${JSON.stringify(actual.slice(0, 500))}.`);
    }
    case 'expectDownload': {
      let download: Download | undefined, stream: Awaited<ReturnType<Download['createReadStream']>> | undefined;
      let expired = false, timer: ReturnType<typeof setTimeout> | undefined;
      const operation = (async () => {
        const incoming = page.waitForEvent('download', { timeout }).then(value => {
          download = value;
          if (expired) { void value.cancel().catch(() => {}); void value.delete().catch(() => {}); }
          return value;
        });
        [download] = await Promise.all([incoming, target.click({ timeout })]);
        if (expired) return;
        if (step.fileName !== undefined && download.suggestedFilename() !== step.fileName) {
          throw new Error(`Expected download ${JSON.stringify(step.fileName)}, received ${JSON.stringify(download.suggestedFilename())}.`);
        }
        stream = await download.createReadStream();
        if (!stream) throw new Error('The application did not produce a readable download.');
        if (expired) { stream.destroy(); return; }
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of stream) {
          const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          size += bytes.length;
          if (size > maxDownloadBytes) throw new Error('Download exceeded the 8 MB verification limit.');
          chunks.push(bytes);
        }
        const failure = await download.failure();
        if (failure) throw new Error('Download failed: ' + failure);
        if (step.text !== undefined && !Buffer.concat(chunks).toString('utf8').includes(step.text)) throw new Error('Downloaded content does not contain the expected literal text.');
      })();
      try {
        await Promise.race([operation, new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => { expired = true; reject(new Error(`Expected download exceeded its ${timeout / 1000}-second limit.`)); }, timeout);
        })]);
      } finally {
        expired = true;
        clearTimeout(timer);
        stream?.destroy();
        // Do not wait on a stalled download to finish before the caller can recover.
        if (download) { void download.cancel().catch(() => {}); void download.delete().catch(() => {}); }
      }
      break;
    }
    default: throw new Error('Unsupported browser action.');
  }
}

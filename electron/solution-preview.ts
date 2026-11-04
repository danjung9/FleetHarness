import { promises as fs } from 'node:fs';
import { PreviewServers } from './preview.js';
import { prepareSolutionRuntime } from './solution-runtime.js';
import { parseSolutionContract } from '../harness/solution-contract.js';
import { safeFile, sourceHash } from './storage.js';

/** Services run from a disposable declared package, never the desktop renderer. */
export class ApplicationPreviews {
  private browser = new PreviewServers();
  private services = new Map<string, { hash: string; runtime: Awaited<ReturnType<typeof prepareSolutionRuntime>> }>();
  private pending = new Map<string, Promise<string | null>>();
  private closed = false;
  constructor(private executable: string) {}
  async url(root: string): Promise<string | null> {
    if (this.closed) return null;
    const pending = this.pending.get(root);
    if (pending) return pending;
    const operation = this.open(root).finally(() => this.pending.delete(root));
    this.pending.set(root, operation);
    return operation;
  }
  private async open(root: string) {
    let body: string;
    try { body = await fs.readFile(await safeFile(root, 'solution-contract.json'), 'utf8'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return this.browser.url(root); throw error; }
    const packet = JSON.parse(await fs.readFile(await safeFile(root, '.fleet/packet.json'), 'utf8'));
    const solution = parseSolutionContract(JSON.parse(body), packet.acceptance);
    if (solution.runtime.profile === 'cli') return null;
    if (solution.runtime.profile === 'browser') return this.browser.url(root, solution.runtime.files);
    const hash = await sourceHash(root, { excludeEvidence: true });
    const existing = this.services.get(root);
    if (existing?.hash === hash && existing.runtime.url) {
      try {
        await existing.runtime.assertIntegrity();
        const response = await fetch(new URL(solution.runtime.healthPath!, existing.runtime.url), { signal: AbortSignal.timeout(1500), redirect: 'error' });
        await response.body?.cancel();
        if (response.ok) return existing.runtime.url;
      } catch { /* Expired or failed preview processes are replaced below. */ }
    }
    await existing?.runtime.close();
    this.services.delete(root);
    const runtime = await prepareSolutionRuntime(root, solution.runtime, this.executable, undefined, { totalTimeoutMs: 3_600_000 });
    if (this.closed) { await runtime.close(); return null; }
    this.services.set(root, { hash, runtime });
    return runtime.url ?? null;
  }
  close() {
    this.closed = true;
    this.browser.close();
    for (const { runtime } of this.services.values()) void runtime.close();
    this.services.clear();
  }
}

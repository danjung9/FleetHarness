import { promises as fs } from 'node:fs';
import { VerificationShutdownError } from './verification.js';
import { PreviewServers } from './preview.js';
import { prepareSolutionRuntime } from './solution-runtime.js';
import { parseSolutionContract } from '../harness/solution-contract.js';
import { safeFile, sourceHash } from './storage.js';

/** Services run from a disposable declared package, never the desktop renderer. */
export class ApplicationPreviews {
  private browser = new PreviewServers();
  private services = new Map<string, { hash: string; runtime: Awaited<ReturnType<typeof prepareSolutionRuntime>> }>();
  private pending = new Map<string, Promise<string | null>>();
  private controllers = new Map<string, AbortController>();
  private closed = false;
  private origins = new Map<string, string>();
  // Retain ownership after Stop: a released port can be reused by another workspace.
  private originOwners = new Map<string, string>();
  // A reload in the same run keeps its port, so the app's browser storage survives.
  private servicePorts = new Map<string, number>();
  allows(address: string) {
    try { return [...this.origins.values()].includes(new URL(address).origin); } catch { return false; }
  }
  constructor(private executable: string, private options: { clearStorage?: (origin: string) => Promise<void> } = {}) {}
  async url(root: string): Promise<string | null> {
    if (this.closed) return null;
    const pending = this.pending.get(root);
    if (pending) return pending;
    const controller = new AbortController(); this.controllers.set(root, controller);
    const operation = this.open(root, controller.signal).then(async url => {
      if (url) {
        const origin = new URL(url).origin;
        if (this.originOwners.get(origin) !== root) {
          await this.options.clearStorage?.(origin);
          this.originOwners.set(origin, root);
        }
        if (this.closed || controller.signal.aborted) return null;
        this.origins.set(root, origin);
      }
      return url;
    }).catch(error => {
      if (!(error instanceof VerificationShutdownError) && (this.closed || controller.signal.aborted)) return null;
      throw error;
    }).finally(() => { this.pending.delete(root); this.controllers.delete(root); });
    this.pending.set(root, operation);
    return operation;
  }
  private async open(root: string, signal: AbortSignal) {
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
    const runtime = await prepareSolutionRuntime(root, solution.runtime, this.executable, signal, { totalTimeoutMs: 3_600_000, preferredPort: this.servicePorts.get(root) });
    if (this.closed || signal.aborted) { await runtime.close(); return null; }
    this.services.set(root, { hash, runtime });
    if (runtime.url) this.servicePorts.set(root, Number(new URL(runtime.url).port));
    return runtime.url ?? null;
  }
  /** Abandon a start that is still in progress. The caller then runs stop or a new url. */
  cancel(root: string) { this.controllers.get(root)?.abort(); }
  async stop(root: string) {
    this.controllers.get(root)?.abort();
    await this.pending.get(root)?.catch(() => {});
    const service = this.services.get(root);
    if (service) { await service.runtime.close(); this.services.delete(root); }
    this.browser.stop(root); this.origins.delete(root);
  }
  async close() {
    this.closed = true;
    this.origins.clear();
    this.browser.close();
    for (const controller of this.controllers.values()) controller.abort();
    await Promise.allSettled([...this.pending.values()]);
    await Promise.all([...this.services.values()].map(({ runtime }) => runtime.close()));
    this.services.clear();
  }
}

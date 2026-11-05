import { assertCredentialFreeManifest, assertCredentialFreeDelivery } from './delivery-secrets.js';
import { assertNoCredentials } from './secrets.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { artifactManifest, manifestHash, sourceHash } from './storage.js';
import { atomicHostWrite } from '../shared/host-files.js';
import { containerExport } from './container-export.js';
import { createHash } from 'node:crypto';
import { listArtifacts, safeFile } from './storage.js';
import { exportIntegrationOperations, type IntegrationOperation } from '../shared/integration.js';
import type { RuntimeManifest } from '../shared/solution.js';
import { assertRuntimeSourceFiles } from '../shared/runtime-artifacts.js';

export interface SourceExport {
  workspace: string;
  parent: string;
  title: string;
  verifiedHash: string;
  verifiedRuntime?: string;
  deliveryMarkdown: string;
  evidence: { report: string; review: string };
  /** Public frozen metadata only. Evaluation keys and private learning records are never exported. */
  reference?: { runtime: RuntimeManifest; operations: IntegrationOperation[];
    experiment: { experimentId: string; candidateId: string; behaviorHash: string; evaluationSetHash: string; executionHash: string } };
}

/** Copy an approved revision, including its browser evidence, into a new verified bundle. */
export async function exportVerifiedBundle(input: SourceExport, signal?: AbortSignal,
  copyFile?: (source: string, destination: string) => Promise<unknown>): Promise<string> {
  signal?.throwIfAborted();
  const workspace = await fs.realpath(input.workspace), parent = await fs.realpath(input.parent);
  if (parent === workspace || parent.startsWith(workspace + path.sep)) throw new Error('Choose a folder outside the agent workspace.');
  const checkSource = async () => {
    signal?.throwIfAborted();
    if (await sourceHash(workspace) !== input.verifiedHash) throw new Error('Artifacts changed after verification or during export. Start a new run before exporting.');
    signal?.throwIfAborted();
  };
  const manifest = await artifactManifest(workspace);
  if (manifestHash(manifest) !== input.verifiedHash) throw new Error('Artifacts changed after verification or during export. Start a new run before exporting.');
  if (input.reference) assertRuntimeSourceFiles(input.reference.runtime.files);
  const solutionBody = manifest.find(file => file.path === 'solution-contract.json')?.contents.toString('utf8');
  if (solutionBody !== undefined) assertRuntimeSourceFiles(JSON.parse(solutionBody)?.runtime?.files);
  if (!input.reference && !manifest.some(file => file.path === 'solution-contract.json')) await artifactManifest(workspace, { requireEntryPoint: true });
  if (!input.evidence?.report || !input.evidence.review) throw new Error('Authoritative delivery evidence is required.');
  assertCredentialFreeManifest(manifest);
  assertNoCredentials(input.deliveryMarkdown); assertNoCredentials(input.title);
  assertNoCredentials(input.evidence.report); assertNoCredentials(input.evidence.review);
  const container = containerExport(manifest, input.verifiedRuntime, Boolean(input.reference));
  await checkSource();
  // Older frozen plans can predate the parser's reservations. Host reports and
  // delivery notes must never replace a file used by the approved application.
  const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) || 'challenge';
  const destination = await fs.mkdtemp(path.join(parent, 'AppYard-' + slug + '-'));
  try {
    for (const file of manifest) {
      signal?.throwIfAborted();
      const target = path.join(destination, file.path);
      await fs.mkdir(path.dirname(target), { recursive: true });
      if (copyFile) await copyFile(path.join(workspace, file.path), target);
      else await atomicHostWrite(destination, file.path, file.contents);
    }
    await atomicHostWrite(destination, 'test-report.json', input.evidence.report);
    await atomicHostWrite(destination, 'review.json', input.evidence.review);
    if (container) {
      await atomicHostWrite(destination, 'Dockerfile', container.dockerfile);
      await atomicHostWrite(destination, 'compose.yaml', container.compose);
    }
    await atomicHostWrite(destination, 'DELIVERY.md', input.deliveryMarkdown + (container ? '\n\n' + container.instructions + '\n' : ''));
    await checkSource();
    if (await sourceHash(destination) !== input.verifiedHash) throw new Error('The copied bundle does not match the verified source. Export again before delivering.');
    if (input.reference) {
      const { experiment, runtime, operations } = input.reference;
      if (runtime.files.includes('memory-context.md')) throw new Error('A delivered runtime cannot include private learning context.');
      try { await fs.lstat(path.join(destination, 'evaluation-plan.json')); throw new Error('Experiment answer keys cannot be exported from a candidate workspace.'); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      // Selection verifies the complete candidate, including its pinned prompt
      // context. Learning context is not part of the deliverable software.
      await fs.rm(path.join(destination, 'memory-context.md'), { force: true });
      if (![experiment.behaviorHash, experiment.evaluationSetHash, experiment.executionHash].every(value => /^[a-f0-9]{64}$/.test(value))) throw new Error('Invalid experiment reference hashes.');
      const manifestPath = path.join(destination, 'reproducibility', 'manifest.json');
      try { await fs.lstat(path.dirname(manifestPath)); throw new Error('The generated source uses the reserved reproducibility directory.'); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      const files: Array<{ path: string; bytes: number; sha256: string }> = [], bundle = createHash('sha256');
      // This digest includes delivery notes, reports and all public source. The
      // manifest names its own exclusion so the digest does not refer to itself.
      for (const file of await listArtifacts(destination)) {
        signal?.throwIfAborted();
        const bytes = await fs.readFile(await safeFile(destination, file.path));
        const normalized = file.path.replaceAll(path.sep, '/');
        files.push({ path: normalized, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
        bundle.update(normalized + '\0').update(bytes).update('\0');
      }
      await fs.mkdir(path.dirname(manifestPath));
      await fs.writeFile(manifestPath, JSON.stringify({ schemaVersion: 1, verifiedSourceHash: input.verifiedHash,
        bundleHash: bundle.digest('hex'), bundleHashAlgorithm: 'sha256 of sorted path + NUL + bytes + NUL',
        excludedFromBundleHash: ['reproducibility/manifest.json'], experiment, runtime,
        excludedFromDelivery: ['memory-context.md'],
        operations: exportIntegrationOperations(operations), evaluation: 'Generation answer keys and held-out validation data remain private to the host.', files }, null, 2) + '\n', { flag: 'wx' });
      await checkSource();
    }
    signal?.throwIfAborted();
    await assertCredentialFreeDelivery(destination);
    return destination;
  } catch (error) {
    await fs.rm(destination, { recursive: true, force: true });
    throw error;
  }
}

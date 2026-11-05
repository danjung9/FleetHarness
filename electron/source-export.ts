import { promises as fs } from 'node:fs';
import path from 'node:path';
import { artifactManifest, manifestHash, sourceHash } from './storage.js';
import { atomicHostWrite } from '../shared/host-files.js';

export interface SourceExport {
  workspace: string;
  parent: string;
  title: string;
  verifiedHash: string;
  deliveryMarkdown: string;
  evidence: { report: string; review: string };
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
  if (!manifest.some(file => file.path === 'solution-contract.json')) await artifactManifest(workspace, { requireEntryPoint: true });
  if (manifestHash(manifest) !== input.verifiedHash) throw new Error('Artifacts changed after verification or during export. Start a new run before exporting.');
  if (!input.evidence?.report || !input.evidence.review) throw new Error('Authoritative delivery evidence is required.');
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
    await atomicHostWrite(destination, 'DELIVERY.md', input.deliveryMarkdown);
    await checkSource();
    if (await sourceHash(destination) !== input.verifiedHash) throw new Error('The copied bundle does not match the verified source. Export again before delivering.');
    signal?.throwIfAborted();
    return destination;
  } catch (error) {
    await fs.rm(destination, { recursive: true, force: true });
    throw error;
  }
}

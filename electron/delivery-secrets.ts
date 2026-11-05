import { promises as fs } from 'node:fs';
import path from 'node:path';
import { listArtifacts, safeFile, type ArtifactManifest } from './storage.js';
import { assertNoCredentials } from './secrets.js';

/** Check the same validated bytes that approval and delivery will use. */
export function assertCredentialFreeManifest(files: ArtifactManifest) {
  for (const file of files) { assertNoCredentials(file.path); assertNoCredentials(file.contents); }
}

/** Scan every deliverable byte, including binary evidence and host receipts. */
export async function assertCredentialFreeDelivery(workspace: string, includeDependencies = false) {
  // Source inventories omit node_modules. Executables must check installed dependencies too.
  const shippedFiles = async (directory: string, prefix = ''): Promise<{ path: string; size: number }[]> => {
    const files: { path: string; size: number }[] = [];
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const relative = path.join(prefix, entry.name), absolute = path.join(directory, entry.name);
      if (entry.name === 'auth.json') throw new Error('Delivery blocked: authentication files cannot be included.');
      if (entry.isDirectory()) files.push(...await shippedFiles(absolute, relative));
      else if (entry.isFile()) files.push({ path: relative, size: (await fs.stat(absolute)).size });
      else throw new Error('Artifact symlinks and special files are not allowed in a download.');
    }
    return files;
  };
  for (const file of await (includeDependencies ? shippedFiles(workspace) : listArtifacts(workspace))) {
    assertNoCredentials(file.path);
    if (file.size > 10 * 1024 * 1024) throw new Error('An artifact exceeds the 10 MB delivery limit.');
    assertNoCredentials(await fs.readFile(await safeFile(workspace, file.path)));
  }
}

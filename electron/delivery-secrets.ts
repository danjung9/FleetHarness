import { promises as fs } from 'node:fs';
import { listArtifacts, safeFile, type ArtifactManifest } from './storage.js';
import { assertNoCredentials } from './secrets.js';

/** Check the same validated bytes that approval and delivery will use. */
export function assertCredentialFreeManifest(files: ArtifactManifest) {
  for (const file of files) { assertNoCredentials(file.path); assertNoCredentials(file.contents); }
}

/** Scan every deliverable byte, including binary evidence and host receipts. */
export async function assertCredentialFreeDelivery(workspace: string) {
  for (const file of await listArtifacts(workspace)) {
    assertNoCredentials(file.path);
    if (file.size > 10 * 1024 * 1024) throw new Error('An artifact exceeds the 10 MB delivery limit.');
    assertNoCredentials(await fs.readFile(await safeFile(workspace, file.path)));
  }
}

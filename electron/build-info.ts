import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { AppBuildInfo } from '../shared/types.js';

/** Read provenance shipped beside app.asar, never mutable user settings. */
export function readBuildInfo(version: string, resourcesPath: string, packaged: boolean): AppBuildInfo {
  if (!packaged) return { schemaVersion: 1, version, revision: 'development', buildId: 'local-development' };
  let info: AppBuildInfo;
  try {
    info = JSON.parse(readFileSync(path.join(resourcesPath, 'build-info.json'), 'utf8')) as AppBuildInfo;
  } catch (error) {
    // Keep existing macOS and legacy packaging usable; Windows release validation
    // separately requires complete provenance before an installer can be published.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { schemaVersion: 1, version, revision: 'unavailable', buildId: 'unrecorded' };
    throw error;
  }
  if (info.schemaVersion !== 1 || info.version !== version || !/^[a-f0-9]{40}$/.test(info.revision)
      || typeof info.buildId !== 'string' || !info.buildId) {
    throw new Error('Installed build metadata is missing or inconsistent. Reinstall AppYard from a verified installer.');
  }
  return info;
}

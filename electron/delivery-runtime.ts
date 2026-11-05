import type { RuntimeManifest } from '../shared/solution.js';
import type { ArtifactManifest } from './storage.js';

/** Comparison cores export invoke(); their bundled adapter owns the server. */
export function deliveryRuntime(runtime: RuntimeManifest, manifest: ArtifactManifest, comparison = false): RuntimeManifest {
  if (!comparison || runtime.profile !== 'service') return runtime;
  const command = runtime.command!;
  const adapter = 'runtime-broker/' + (command.runtime === 'node' ? 'node.mjs' : 'python.py');
  if (![adapter, 'integration-config.json'].every(file => runtime.files.includes(file) && manifest.some(item => item.path === file))) {
    throw new Error('The verified comparison runtime is missing its delivery adapter.');
  }
  const config = JSON.parse(manifest.find(file => file.path === 'integration-config.json')!.contents.toString('utf8'));
  if (!Array.isArray(config.operations) || config.operations.some((operation: { auth?: { envName?: string } }) =>
    !operation || (operation.auth && !/^[A-Z][A-Z0-9_]{0,99}$/.test(operation.auth.envName ?? '')))) {
    throw new Error('The verified comparison runtime has invalid delivery settings.');
  }
  return { ...runtime, command: { ...command, entrypoint: adapter,
    args: ['--serve', './' + command.entrypoint, './integration-config.json'] },
    requiredEnv: [...new Set<string>([...runtime.requiredEnv, ...config.operations.flatMap((operation: { auth?: { envName: string } }) => operation.auth ? [operation.auth.envName] : [])])] };
}

import path from 'node:path';
import { parseSolutionContract } from '../harness/solution-contract.js';
import type { ArtifactManifest } from './storage.js';

/** Generate deployment instructions from the verified contract, without running or fetching anything. */
export function containerExport(manifest: ArtifactManifest) {
  const read = (name: string) => manifest.find(file => file.path.split(path.sep).join('/') === name)?.contents.toString('utf8');
  const contract = read('solution-contract.json');
  if (!contract) return undefined;
  const packet = read('.fleet/packet.json');
  if (!packet) throw new Error('The verified solution is missing its acceptance inventory.');
  const { runtime } = parseSolutionContract(JSON.parse(contract), JSON.parse(packet).acceptance);
  // A browser with a server uses the service profile; browser alone is static.
  if (runtime.profile !== 'service') return undefined;
  const command = runtime.command!, port = runtime.port ?? 8080;
  const files = new Set(manifest.map(file => file.path.split(path.sep).join('/')));
  for (const file of runtime.files) {
    if (!files.has(file)) throw new Error('Container runtime file is absent from the verified source: ' + file);
  }
  const dockerfile = [
    `FROM ${command.runtime === 'node' ? 'node:22.19.0-bookworm-slim' : 'python:3.12.9-slim-bookworm'}`,
    'WORKDIR /app',
    // JSON instruction forms keep filenames and arguments out of a shell.
    ...runtime.files.map(file => 'COPY ' + JSON.stringify(['./' + file, './' + file])),
    ...(runtime.dependencies?.manager === 'npm'
      ? ['RUN ' + JSON.stringify(['npm', 'ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'])]
      : runtime.dependencies?.manager === 'pip'
        ? ['RUN ' + JSON.stringify(['python3', '-m', 'pip', '--isolated', '--disable-pip-version-check', 'install', '--require-hashes', '--only-binary=:all:', '-r', './' + runtime.dependencies.lockfile])]
        : []),
    'ENV HOST=0.0.0.0', `ENV PORT=${port}`, `EXPOSE ${port}`,
    'CMD ' + JSON.stringify([command.runtime === 'node' ? 'node' : 'python3', './' + command.entrypoint, ...command.args]), ''
  ].join('\n');
  // JSON flow sequences are valid YAML. Only validated environment NAMES are
  // passed through at launch; the export never reads or serializes their values.
  const compose = ['services:', '  app:', '    build: .',
    '    ports: ' + JSON.stringify([`127.0.0.1:${port}:${port}`]),
    '    environment: ' + JSON.stringify(['HOST=0.0.0.0', `PORT=${port}`, ...runtime.requiredEnv]), ''
  ].join('\n');
  return { dockerfile, compose, instructions: [
    'With the base image and locked dependencies available, set the required environment variables and run docker compose up --build in this folder.',
    `Open http://127.0.0.1:${port}/ to use the service; run docker compose down to stop it.`
  ].join('\n') };
}

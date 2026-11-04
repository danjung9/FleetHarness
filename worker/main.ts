import { fileURLToPath } from 'node:url';
import { runWorker } from './runner.js';

const controller = new AbortController();
const stop = () => controller.abort();
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
try {
  const progress = await runWorker(process.argv[2] ?? '/vercel/sandbox/control/input.json', {
    resourcesRoot: fileURLToPath(new URL('../', import.meta.url)), signal: controller.signal
  });
  process.exitCode = progress.status === 'failed' ? 1 : 0;
} catch {
  // Errors and model/tool output belong in the redacted control files, never stdout.
  process.stderr.write('Hosted worker could not persist run state.\n');
  process.exitCode = 1;
} finally {
  process.off('SIGTERM', stop);
  process.off('SIGINT', stop);
}

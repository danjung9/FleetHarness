import { fileURLToPath } from 'node:url';
import { verifyHosted } from './verifier.js';

try {
  const result = await verifyHosted(process.argv[2] ?? '/vercel/sandbox/control/verify-input.json', fileURLToPath(new URL('../', import.meta.url)));
  process.stdout.write(JSON.stringify(result) + '\n');
} catch (error) {
  process.stdout.write(JSON.stringify({ version: 1, status: 'failed', error: error instanceof Error ? error.message : String(error) }) + '\n');
  process.exitCode = 1;
}

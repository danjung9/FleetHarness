import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { CodexRpc } from '../dist-electron/electron/codex-rpc.js';

// Inherit the RPC pipes so `close` proves that descendants have also stopped.
// The worker ignores graceful termination, just as an in-flight subprocess can.
const workerSource = `
  process.on('SIGTERM', () => {});
  process.send('ready');
  setInterval(() => {}, 1000);
`;

for (const shutdown of ['dispose', 'parent exit', 'unresponsive parent']) {
  test(`RPC ${shutdown} terminates surviving process-group children`, {
    skip: process.platform === 'win32', timeout: 8000,
  }, async () => {
    const parentSource = `
      const { spawn } = require('node:child_process');
      ${shutdown === 'unresponsive parent' ? "process.on('SIGTERM', () => {});" : ''}
      require('node:readline').createInterface({ input: process.stdin }).on('line', line => {
        const request = JSON.parse(line);
        if (request.method === 'exit') process.exit(2);
        if (request.method === 'hang') return;
        const worker = spawn(process.execPath, ['-e', ${JSON.stringify(workerSource)}], {
          stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
        });
        worker.once('message', () => {
          worker.disconnect();
          process.stdout.write(JSON.stringify({ id: request.id, result: 'ready' }) + '\\n');
        });
      });
    `;
    const child = spawn(process.execPath, ['-e', parentSource], {
      detached: true, stdio: ['pipe', 'pipe', 'pipe'],
    });
    const closed = once(child, 'close');
    const rpc = new CodexRpc(child, 5000);
    let deadline;
    try {
      assert.equal(await rpc.request('start'), 'ready');
      if (shutdown === 'parent exit') {
        await assert.rejects(rpc.request('exit'), /stopped unexpectedly/);
      } else {
        const pending = assert.rejects(rpc.request('hang'), /session closed/);
        rpc.dispose();
        rpc.dispose(); // Cancellation paths may dispose the same connection twice.
        await pending;
      }
      const stopped = await Promise.race([
        closed.then(() => true),
        new Promise(resolve => { deadline = setTimeout(() => resolve(false), 2500); }),
      ]);
      assert.equal(stopped, true, 'RPC descendants must release inherited pipes after shutdown.');
    } finally {
      clearTimeout(deadline);
      // A failing regression must not itself leave the reproducing worker alive.
      try { process.kill(-child.pid, 'SIGKILL'); } catch {}
      await closed;
      rpc.dispose();
    }
  });
}

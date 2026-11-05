import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { RunProcessSweep } from '../dist-electron/electron/process-sweep.js';
import { executeHelperProcess } from '../dist-electron/electron/helper-execution.js';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';
import { Store } from '../dist-electron/electron/storage.js';

function alive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { assert.equal(error.code, 'ESRCH'); return false; }
}

test('a detached child retaining helper pipes cannot leave cancellation waiting forever', {timeout:10000}, async t => {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'helper-pipes-')));
  let pid;
  t.after(async () => { if (pid) { try { process.kill(pid, 'SIGKILL'); } catch {} } await fs.rm(root, {recursive:true, force:true}); });
  const script = path.join(root, 'helper.mjs');
  await fs.writeFile(script, `
    import {spawn} from 'node:child_process';
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {detached:true, stdio:'inherit'});
    console.log(JSON.stringify({pid:child.pid})); child.unref();
  `);
  const scope = new RunProcessSweep({scan:async () => pid && alive(pid) ? [{pid, started:'synthetic registered child'}] : []});
  const result = await scope.run(() => executeHelperProcess({workspace:root, executable:process.execPath,
    command:[process.execPath, script], timeoutMs:300}));
  pid = JSON.parse(result.stdout).pid;
  assert.equal(result.timedOut, true); assert.equal(result.exitCode, null);
  assert.ok(alive(pid), 'The detached child retains pipes after its parent exits');
  await scope.stop();
  assert.equal(alive(pid), false);
});

// Server cases use real detached children and signals with a synthetic PID
// registry. Browser cases additionally exercise Chrome and the real ps scanner.
// Run the latter outside restricted test hosts; they are deliberately not mocked.
for (const browser of [false, true]) for (const ending of ['Stop', 'completion']) {
  test(`${browser ? 'native browser' : 'detached server'} helper descendants inherit the run marker and end before ${ending} settles`, { timeout: 20000 }, async t => {
    const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'helper-cleanup-')));
    const pids = [];
    let processes;
    t.after(async () => {
      await processes?.stop().catch(() => {});
      for (const pid of pids) { try { process.kill(pid, 'SIGKILL'); } catch {} }
      await fs.rm(root, { recursive: true, force: true });
    });
    const store = new Store(root); await store.init();
    const project = store.state.projects[0];
    project.workspace = path.join(root, 'workspace'); await fs.mkdir(project.workspace);
    const stateFile = path.join(project.workspace, 'started.json');
    const moduleUrl = pathToFileURL(path.resolve('node_modules/playwright/index.mjs')).href;
    const daemon = path.join(project.workspace, 'daemon.mjs');
    await fs.writeFile(daemon, `
      import {createServer} from 'node:http'; import fs from 'node:fs/promises';
      const server = createServer((req, res) => res.end('<h1>Synthetic browser diagnosis</h1>'));
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      let browserPid, title;
      ${browser ? `const {chromium} = await import(${JSON.stringify(moduleUrl)});
        const launched = await chromium.launchServer({channel:'chrome', headless:true});
        browserPid = launched.process().pid;
        const connection = await chromium.connect(launched.wsEndpoint());
        const page = await connection.newPage();
        await page.goto('http://127.0.0.1:' + server.address().port);
        title = await page.locator('h1').textContent();` : ''}
      await fs.writeFile(${JSON.stringify(stateFile)}, JSON.stringify({pid:process.pid, browserPid,
        marker:process.env.APPYARD_RUN_PROCESS, port:server.address().port, home:process.env.HOME, temporary:process.env.TMPDIR, title}));
    `);
    const script = path.join(project.workspace, 'helper.mjs');
    await fs.writeFile(script, `
      import {spawn} from 'node:child_process';
      const child = spawn(process.execPath, [${JSON.stringify(daemon)}], {detached:true,stdio:'ignore'});
      console.log(JSON.stringify({pid:child.pid, marker:process.env.APPYARD_RUN_PROCESS})); child.unref();
    `);
    processes = new RunProcessSweep(browser ? {} : {
      scan: async () => pids.filter(alive).map(pid => ({pid, started:'synthetic registered child'})),
      signal: (pid, signal) => { assert.equal(project.status, 'running'); process.kill(pid, signal); }
    });
    project.status = 'running'; project.runId = 'synthetic-helper-run';
    project.processScope = {runId:project.runId, marker:processes.marker, cleanup:'pending'};
    const backend = new FleetBackend(store, process.execPath, () => {}, process.cwd());
    let resolve;
    const run = {processes, controller:new AbortController(), outcome:'review',
      done:new Promise(done => { resolve = done; }), resolve:() => resolve()};
    backend.active.set(project.id, run);
    const result = await processes.run(() => executeHelperProcess({workspace:project.workspace,
      executable:process.execPath, command:[process.execPath, script]}));
    assert.equal(result.exitCode, 0, result.stderr);
    const launched = JSON.parse(result.stdout); pids.push(launched.pid);
    assert.equal(launched.marker, processes.marker);
    let state;
    for (let i = 0; i < 200; i++) {
      try { state = JSON.parse(await fs.readFile(stateFile, 'utf8')); break; }
      catch { await delay(25); }
    }
    assert.ok(state, 'Detached browser/server must become ready after its helper exits');
    if (state.browserPid) pids.push(state.browserPid);
    assert.equal(state.pid, launched.pid); assert.equal(state.marker, processes.marker);
    await fs.access(state.home); await fs.access(state.temporary);
    assert.ok(pids.every(alive), 'Descendants must outlive the completed helper until run cleanup');
    assert.equal(await (await fetch('http://127.0.0.1:' + state.port)).text(), '<h1>Synthetic browser diagnosis</h1>');
    if (browser) { assert.ok(state.browserPid); assert.equal(state.title, 'Synthetic browser diagnosis'); }
    if (ending === 'Stop') {
      run.controller.signal.addEventListener('abort', () => { void backend.finish(project, run); }, {once:true});
      await backend.stop(project.id);
    } else await backend.finish(project, run);
    assert.equal(project.processScope.cleanup, 'confirmed');
    assert.equal(project.status, ending === 'Stop' ? 'stopped' : 'review');
    assert.equal(backend.active.has(project.id), false);
    assert.ok(pids.every(pid => !alive(pid)), 'No server or browser process may survive the terminal status');
    await assert.rejects(fs.access(state.home), {code:'ENOENT'});
    await assert.rejects(fs.access(state.temporary), {code:'ENOENT'});
    await assert.rejects(fetch('http://127.0.0.1:' + state.port));
  });
}

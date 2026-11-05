import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Store, newProject } from '../dist-electron/electron/storage.js';
import { CodexGoalService, codexGoalCommand } from '../dist-electron/electron/codex-goal.js';

const exec = promisify(execFile);
const input = {
  title: 'Messages $(touch NEVER_RUN)', description: 'Build a local parser that extracts tasks from attached messages.',
  inputs: 'CSV message rows', outputs: 'Validated tasks and source references', resources: 'Preserve attribution.',
  criteria: ['Parse valid tasks.', 'Reject invalid records with actionable errors.'], links: ['https://example.com/reference'],
  dataInputs: [{ name: 'source.csv', kind: 'file', content: 'task\r\n"inspect pump"\r\n' }, { name: 'notes.txt', kind: 'text', content: '  Keep source whitespace.\n' }]
};
async function fixture(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-goal-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new Store(root); await store.init();
  const project = newProject(input); store.state.projects = [project]; await store.save();
  const prepared = [], opened = [];
  const service = new CodexGoalService(store, { platform: 'darwin', executable: () => '/bin/sh',
    prepareThread: async args => { prepared.push(args); return 'thread-fixture'; },
    openTerminal: async file => { opened.push(file); }, ...options });
  return { root, store, project, service, prepared, opened };
}

test('handoff preserves the complete brief, attached bytes, and previous pipeline result', async t => {
  const { store, project, service, prepared, opened } = await fixture(t);
  Object.assign(project, { status: 'review', workspace: '/previous/build', runId: 'previous-run', report: { passed: true } });
  const previous = structuredClone({ status: project.status, workspace: project.workspace, runId: project.runId, report: project.report, stages: project.stages });
  const launch = await service.launch(project.id);
  assert.equal(launch.status, 'opened'); assert.equal(launch.threadId, 'thread-fixture');
  assert.equal(prepared.length, 1); assert.equal(opened.length, 1);
  assert.equal(prepared[0].workspace, launch.workspace);
  assert.ok(prepared[0].home); assert.match(prepared[0].objective, /complete, runnable application/);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(launch.workspace, 'brief.json'), 'utf8')), { ...input, dataInputs: input.dataInputs });
  assert.equal(await fs.readFile(path.join(launch.workspace, 'inputs/001-source.csv'), 'utf8'), input.dataInputs[0].content);
  assert.equal(await fs.readFile(path.join(launch.workspace, 'inputs/002-notes.txt'), 'utf8'), input.dataInputs[1].content);
  const requirements = await fs.readFile(path.join(launch.workspace, 'requirements.md'), 'utf8');
  for (const text of [input.description, input.inputs, input.outputs, input.resources, ...input.criteria, ...input.links]) assert.ok(requirements.includes(text));
  assert.match(await fs.readFile(path.join(launch.workspace, 'GOAL.md'), 'utf8'), /verification.md/);
  assert.equal(await service.workspace(project.id), launch.workspace);
  assert.equal((await fs.stat(opened[0])).mode & 0o777, 0o700);
  for (const [key, value] of Object.entries(previous)) assert.deepEqual(project[key], value, key);
  assert.equal(JSON.parse(await fs.readFile(path.join(store.root, 'state.json'), 'utf8')).projects[0].codexGoal.status, 'opened');
  assert.equal(await fs.stat(path.join(launch.workspace, '.fleet')).catch(error => error.code), 'ENOENT');
});

test('double clicks share one handoff; later launches retain earlier workspaces', async t => {
  const { project, service, opened } = await fixture(t);
  const first = service.launch(project.id), duplicate = service.launch(project.id);
  assert.equal(service.isLaunching(project.id), true); assert.equal(first, duplicate);
  const launch = await first; assert.equal(service.isLaunching(project.id), false);
  const next = await service.launch(project.id);
  assert.equal(opened.length, 2); assert.notEqual(launch.workspace, next.workspace);
  assert.ok((await fs.stat(path.join(launch.workspace, 'brief.json'))).isFile());
});

test('handoff uses one saved reasoning selection for preparation and Terminal resume', async t => {
  const prepared = [];
  const { store, project, service, opened } = await fixture(t, { prepareThread: async args => {
    prepared.push(args);
    store.state.settings.reasoningEffort = 'low';
    return 'reasoning-thread';
  } });
  store.state.settings.reasoningEffort = 'high';
  await service.launch(project.id);
  assert.equal(prepared[0].reasoningEffort, 'high');
  assert.match(await fs.readFile(opened[0], 'utf8'), /'model_reasoning_effort="high"'/);
});

test('failed Terminal handoff keeps a recoverable snapshot and can retry', async t => {
  let fail = true;
  const { project, service, store } = await fixture(t, { openTerminal: async () => { if (fail) throw new Error('Terminal unavailable'); } });
  await assert.rejects(service.launch(project.id), /Terminal unavailable/);
  assert.equal(project.codexGoal.status, 'failed');
  assert.equal(service.isLaunching(project.id), false);
  const failedWorkspace = await service.workspace(project.id);
  assert.ok((await fs.stat(path.join(failedWorkspace, 'Open Codex.command'))).isFile());
  const reloaded = new Store(store.root); await reloaded.init();
  assert.equal(reloaded.project(project.id).codexGoal.status, 'failed');
  fail = false; assert.equal((await service.launch(project.id)).status, 'opened');
  assert.ok((await fs.stat(failedWorkspace)).isDirectory());
});

test('thread setup failures never open Terminal and preserve the saved input', async t => {
  const { service, project, opened } = await fixture(t, { prepareThread: async () => { throw new Error('Codex could not prepare goal'); } });
  await assert.rejects(service.launch(project.id), /prepare goal/);
  assert.equal(opened.length, 0); assert.equal(project.codexGoal.status, 'failed');
  assert.ok((await fs.stat(path.join(project.codexGoal.workspace, 'brief.json'))).isFile());
});

test('unsupported platforms, archived projects and unsafe IDs fail before launching', async t => {
  const { service, project, opened } = await fixture(t, { platform: 'linux' });
  await assert.rejects(service.launch(project.id), /macOS/); assert.equal(project.codexGoal, undefined);
  const mac = new CodexGoalService(new Store('/unused'), { platform: 'darwin' });
  await assert.rejects(mac.launch('../escape'), /Invalid project ID/);
  const second = await fixture(t); second.project.archivedAt = new Date().toISOString();
  await assert.rejects(second.service.launch(second.project.id), /archived project/);
  assert.equal(opened.length, 0); assert.equal(second.opened.length, 0);
});

test('workspace opening rejects a launch directory replaced with a symlink', async t => {
  const { service, project, root } = await fixture(t);
  const launch = await service.launch(project.id);
  await fs.rename(launch.workspace, launch.workspace + '-original');
  await fs.symlink(root, launch.workspace);
  await assert.rejects(service.workspace(project.id), /ordinary folder/);
});

test('the Terminal script preserves shell-sensitive paths as literal arguments', async t => {
  const { root } = await fixture(t);
  const workspace = path.join(root, "space ' quote $(touch INJECTED) `touch SECOND` $HOME");
  await fs.mkdir(workspace);
  const executable = path.join(root, "fake ' codex.cjs");
  await fs.writeFile(executable, `#!${process.execPath}\nrequire('node:fs').writeFileSync('argv.json', JSON.stringify({args:process.argv.slice(2),home:process.env.CODEX_HOME,cwd:process.cwd()}));\n`, { mode: 0o700 });
  const home = path.join(root, "home ' $HOME $(touch THIRD)");
  const command = path.join(root, 'Open Codex.command');
  for (const effort of [undefined, 'high']) {
    await fs.writeFile(command, codexGoalCommand(executable, workspace, 'fixture-thread', home, effort));
    await exec('/bin/sh', [command]);
    const result = JSON.parse(await fs.readFile(path.join(workspace, 'argv.json'), 'utf8'));
    assert.deepEqual(result.args, ['--no-daemon', '--enable', 'goals', '--sandbox', 'danger-full-access', '--ask-for-approval', 'never', '--cd', workspace,
      ...(effort ? ['-c', 'model_reasoning_effort="high"'] : []), 'resume', 'fixture-thread']);
    assert.equal(result.home, home); assert.equal(result.cwd, await fs.realpath(workspace));
  }
  assert.deepEqual(await fs.readdir(workspace), ['argv.json']);
});

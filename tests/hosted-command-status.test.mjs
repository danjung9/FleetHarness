import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { Command } from '@vercel/sandbox';

const directory = await mkdtemp(resolve('.hosted-command-test-'));
await build({ entryPoints: ['server/command-status.ts'], outdir: directory, outExtension: { '.js': '.mjs' }, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent' });
const { completedCommand } = await import(pathToFileURL(`${directory}/command-status.mjs`).href);
after(() => rm(directory, { recursive: true, force: true }));
const commandWith = getCommand => new Command({ client: { getCommand }, sessionId: 'session_fixture', cmd: { id: 'cmd_fixture' } });

test('detached SDK metadata with no exit code resolves completion through wait', async () => {
  const command = commandWith(async request => {
    assert.equal(request.wait, true);
    assert.equal(request.cmdId, 'cmd_fixture');
    return { json: { command: { id: 'cmd_fixture', exitCode: 0 } } };
  });
  assert.equal(command.exitCode, null);
  const finished = await completedCommand(command);
  assert.equal(finished.exitCode, 0);
});

test('a still-running command returns within the poll budget', async () => {
  const command = commandWith(async request => {
    await delay(10_000, undefined, { signal: request.signal });
    assert.fail('The SDK wait must abort when its poll budget expires.');
  });
  assert.equal(await completedCommand(command, 20), null);
});

test('command failures retain their exit code and transport errors are not hidden', async () => {
  const failed = commandWith(async () => ({ json: { command: { id: 'cmd_fixture', exitCode: 2 } } }));
  assert.equal((await completedCommand(failed)).exitCode, 2);
  const broken = commandWith(async () => { throw new Error('Transport failure'); });
  await assert.rejects(completedCommand(broken), /Transport failure/);
});

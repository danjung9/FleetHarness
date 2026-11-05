import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runToolkitDemo } from '../harness/evaluate.js';

const exec=promisify(execFile),cli=fileURLToPath(new URL('../harness/cli.js',import.meta.url));
const run=(args:string[]) => exec(process.execPath,[cli,...args],{maxBuffer:2_000_000});
test('offline toolkit demo checks actual outputs with zero failing checks', () => {
  const report=runToolkitDemo();assert.equal(report.total,11);assert.equal(report.failed,0);assert.equal(report.scope,'synthetic-toolkit-only');
});
test('CLI runs fixtures, materializes a challenge and writes a non-overwriting evidence artifact', async t => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'fleet-cli-'));t.after(() => fs.rm(root,{recursive:true,force:true}));
  const fixture=await run(['fixture','fleet_extract_messages']);
  const input=path.join(root,'input.json');await fs.writeFile(input,fixture.stdout);
  const parsed=await run(['tool','fleet_extract_messages','--input',input]);
  assert.equal(JSON.parse(parsed.stdout).items.length,3);
  const plan=await run(['plan','36','--out',path.join(root,'workspace')]);
  assert.equal(JSON.parse(plan.stdout).challengeId,'36');
  await run(['demo','--out',root]);
  assert.equal(JSON.parse(await fs.readFile(path.join(root,'toolkit-report.json'),'utf8')).failed,0);
  await assert.rejects(run(['demo','--out',root]),/EEXIST/);
  await assert.rejects(run(['plan','999']),/Unknown/);
  await assert.rejects(run(['tool','fleet_extract_messages']),/requires --input/);
});

test('CLI scaffolds repeatable specialist foundations without model calls and refuses existing destinations', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-scaffold-cli-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const catalog = JSON.parse((await run(['foundations'])).stdout);
  assert.deepEqual(catalog.map((item: {id: string}) => item.id), ['node-service', 'python-service']);
  const first = path.join(root, 'first'), second = path.join(root, 'second');
  const one = JSON.parse((await run(['scaffold', '11', '--out', first])).stdout);
  const two = JSON.parse((await run(['scaffold', '11', '--out', second])).stdout);
  assert.equal(one.selection.computePack, 'scheduling');
  assert.equal(one.templateHash, two.templateHash);
  assert.ok(one.copiedFiles > 0 && one.copiedBytes > 0);
  assert.equal(await fs.readFile(path.join(first, 'foundation-lock.json'), 'utf8'), await fs.readFile(path.join(second, 'foundation-lock.json'), 'utf8'));
  const manifest = JSON.parse(await fs.readFile(path.join(first, 'runtime-manifest.json'), 'utf8'));
  assert.equal(manifest.command.entrypoint, 'server.mjs');
  for (const file of manifest.files) await fs.access(path.join(first, file));
  await assert.rejects(run(['scaffold', '11', '--out', first]), /EEXIST/);
  const python = JSON.parse((await run(['scaffold', '11', '--out', path.join(root, 'python'), '--template', 'python-service'])).stdout);
  assert.equal(python.selection.templateId, 'python-service');
  assert.equal(python.selection.computePack, 'custom');
  await assert.rejects(run(['scaffold', '11', '--out', path.join(root, 'invalid'), '--template', 'remote-latest']), /Unknown/);
  await assert.rejects(fs.access(path.join(root, 'invalid')), /ENOENT/);
});

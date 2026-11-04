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

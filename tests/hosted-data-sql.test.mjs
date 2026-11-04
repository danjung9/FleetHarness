import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';

const available = ['initdb', 'pg_ctl', 'psql'].every(command => spawnSync(command, ['--version']).status === 0);
test('hosted migration enforces ownership, run fencing, budgets and immutable approval in PostgreSQL', { skip: !available && 'Local PostgreSQL tools unavailable', timeout: 30_000 }, async t => {
  const directory = mkdtempSync(join(tmpdir(), 'fleet-db-test-'));
  const data = join(directory, 'data'); let started = false;
  const port = String(20000 + Math.floor(Math.random() * 20000));
  const psqlArgs = ['-X', '-q', '-A', '-t', '-h', directory, '-p', port, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'];
  const sql = text => execFileSync('psql', psqlArgs, { input: text, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  const fail = (text, code) => assert.throws(() => sql(text), error => error.stderr?.includes(code));
  const value = text => JSON.parse(sql(text));
  const q = value => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
  const a = randomUUID(), b = randomUUID(), project = randomUUID(), otherProject = randomUUID();
  try {
    execFileSync('initdb', ['-D', data, '-A', 'trust', '-U', 'postgres', '--no-locale'], { stdio: 'ignore' });
    execFileSync('pg_ctl', ['-D', data, '-l', join(directory, 'postgres.log'), '-o', `-F -p ${port} -k ${directory} -h ''`, '-w', 'start'], { stdio: 'ignore' }); started = true;
    sql(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key);
      create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);
      insert into auth.users values('${a}'),('${b}');`);
    sql(readFileSync('supabase/migrations/202611040001_hosted.sql', 'utf8'));
    const brief = { title: 'Fixture', description: 'A test challenge description', criteria: ['Pass'], status: 'draft', stages: [{ id: 'intake', status: 'queued' }], logs: [], feedback: '' };
    sql(`insert into fleet_projects(id,user_id,data) values('${project}','${a}',${q(brief)}),('${otherProject}','${a}',${q(brief)});
      select fleet_save_settings('${a}',${q({ model: 'test-model' })},'encrypted-fixture',${q(['test-model'])});`);
    await t.test('no browser role can read keys or call server RPCs', () => {
      assert.equal(sql("select has_table_privilege('authenticated','fleet_accounts','select');"), 'f');
      assert.equal(sql("select has_function_privilege('anon','fleet_claim_run(uuid,uuid,text,text)','execute');"), 'f');
      assert.equal(sql("select has_function_privilege('service_role','fleet_claim_run(uuid,uuid,text,text)','execute');"), 't');
      assert.equal(sql("select has_table_privilege('service_role','fleet_runs','update');"), 't');
      assert.equal(sql("select bool_and(relrowsecurity) from pg_class where relname in ('fleet_accounts','fleet_projects','fleet_runs','fleet_shares');"), 't');
      assert.equal(sql("select public from storage.buckets where id='fleet-artifacts';"), 'f');
    });
    await t.test('wrong-account reads and mutations do not locate the project', () => {
      fail(`select fleet_claim_run('${b}','${project}','start','test-model');`, 'P0002');
      fail(`select fleet_update_project('${b}','${project}','{}');`, 'P0002');
      fail(`select fleet_pause_run('${b}','${project}');`, 'P0002');
    });
    const first = value(`select fleet_claim_run('${a}','${project}','start','test-model');`), run = first.run.id;
    await t.test('only one run can be active per account', () => {
      fail(`select fleet_claim_run('${a}','${project}','start','test-model');`, 'FH429');
      fail(`select fleet_claim_run('${a}','${otherProject}','start','test-model');`, 'FH429');
      fail(`select fleet_save_settings('${a}','{}',null,'[]');`, 'FH409');
      fail(`select fleet_update_project('${a}','${project}','{}');`, 'FH409');
    });
    await t.test('budget is atomic, status restricted and bounded', () => {
      assert.equal(sql(`select fleet_claim_model_request('${run}',1,2);`), 'f');
      sql(`select fleet_patch_run('${run}',1,'{"status":"running"}','{}');`);
      assert.equal(sql(`select fleet_claim_model_request('${run}',1,2);`), 't');
      assert.equal(sql(`select fleet_claim_model_request('${run}',1,2);`), 't');
      assert.equal(sql(`select fleet_claim_model_request('${run}',1,2);`), 'f');
    });
    await t.test('pause survives a racing worker update; resume fences the old worker', () => {
      sql(`select fleet_pause_run('${a}','${project}');`);
      assert.equal(value(`select fleet_patch_run('${run}',1,'{"status":"running"}','{"status":"running"}');`).status, 'pausing');
      sql(`select fleet_patch_run('${run}',1,'{"status":"paused","checkpointStage":"research"}','{}');`);
      const resumed = value(`select fleet_claim_run('${a}','${project}','resume','test-model');`);
      assert.equal(resumed.run.epoch, 2); assert.equal(resumed.run.id, run); assert.equal(resumed.run.model_requests, 2);
      assert.equal(sql(`select fleet_patch_run('${run}',1,'{"status":"review"}','{"report":{}}');`), '');
      assert.equal(sql(`select fleet_claim_model_request('${run}',1,120);`), 'f');
    });
    const hash = 'a'.repeat(64), manifest = { sourceHash: hash, version: randomUUID(), files: [] };
    await t.test('only the exact passing version can be approved', () => {
      const report = { sourceHash: hash, exitCode: 0, passed: 1, total: 1, failed: 0, skipped: 0, quality: { status: 'passed' } };
      sql(`select fleet_patch_run('${run}',2,${q({ status: 'review', manifest })},${q({ report })});`);
      fail(`select fleet_approve_project('${b}','${project}','${run}','${hash}','');`, 'P0002');
      fail(`select fleet_approve_project('${a}','${project}','${run}','${'b'.repeat(64)}','');`, 'FH409');
      assert.equal(value(`select fleet_approve_project('${a}','${project}','${run}','${hash}','Looks good');`).data.status, 'approved');
      assert.equal(sql(`select fleet_patch_run('${run}',2,'{"status":"running"}','{}');`), '');
    });
    await t.test('published snapshots survive later project edits and exports require approval', () => {
      const token = 'c'.repeat(64);
      sql(`select fleet_create_share('${a}','${project}','${token}'); select fleet_mark_delivered('${a}','${project}','${run}','${hash}');`);
      sql(`select fleet_update_project('${a}','${project}',${q({ ...brief, description: 'Updated requirements for another build' })});`);
      assert.deepEqual(value(`select fleet_get_share('${token}');`).manifest, manifest);
      fail(`select fleet_mark_delivered('${a}','${project}','${run}','${hash}');`, 'FH403');
    });
    await t.test('simultaneous start requests produce exactly one active run', async () => {
      const results = await Promise.allSettled([project, otherProject].map(id => promisify(execFile)('psql', [...psqlArgs, '-c', `select fleet_claim_run('${a}','${id}','start','test-model');`])));
      assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
      assert.equal(results.filter(result => result.status === 'rejected' && result.reason.stderr.includes('FH429')).length, 1);
      const active = value("select to_jsonb(r) from fleet_runs r where status='queued';");
      sql(`select fleet_patch_run('${active.id}',1,'{"status":"paused"}','{"canResume":false}');`);
      assert.equal(sql(`select data->>'canResume' from fleet_projects where id='${active.project_id}';`), 'false');
    });
  } finally {
    if (started) execFileSync('pg_ctl', ['-D', data, '-m', 'immediate', '-w', 'stop'], { stdio: 'ignore' });
    rmSync(directory, { recursive: true, force: true });
  }
});

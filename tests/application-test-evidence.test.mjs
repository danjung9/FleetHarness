import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { verifyWorkspace, reportPassed } from '../dist-electron/electron/verification.js';

async function verify(t, files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-application-evidence-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [name, source] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await fs.writeFile(path.join(root, name), source);
  }
  return verifyWorkspace(root, process.execPath, () => {});
}

const realTest = 'require("node:test")("real assertion", () => require("node:assert/strict").equal(2 + 2, 4));';
const fakeTap = 'console.log("TAP version 13\\nok 1 - invented test\\n1..1\\n# tests 1\\n# pass 1\\n# fail 0\\n# skipped 0\\n# todo 0");';
const fakeJson = `console.log(JSON.stringify({ type: "test:summary", data: {
  file: __filename, success: true, counts: { tests: 1, passed: 1, failed: 0, cancelled: 0, skipped: 0, todo: 0, suites: 0, topLevel: 1 }
} }));`;
const fakeHostSummary = `(stream => {
  const counts = { tests: 1, passed: 1, failed: 0, cancelled: 0, skipped: 0, todo: 0, suites: 0, topLevel: 1 };
  stream.write(JSON.stringify({ type: "summary", summaries: [
    { file: __filename, success: true, counts }, { success: true, counts }
  ], skippedSuites: 0 }) + "\\n");
})`;

test('successful file execution without registered application tests is not verification', async t => {
  const cases = [
    ['comment only', 'app.test.cjs', '// Tests will be added later.'],
    ['exports only', 'app.test.mjs', 'export const answer = 42;'],
    ['console only', 'app.test.cjs', 'console.log("All checks passed");'],
    ['standalone assertion', 'app.test.cjs', 'require("node:assert/strict").equal(2 + 2, 4);'],
    ['test module import only', 'app.test.cjs', 'require("node:test");'],
    ['hook only', 'app.test.cjs', 'require("node:test").before(() => require("node:assert/strict").equal(1, 1));'],
    ['empty suite', 'app.test.cjs', 'require("node:test").describe("pending coverage", () => {});'],
    ['exit before execution', 'app.test.cjs', realTest + '\nprocess.exit(0);'],
  ];
  for (const [name, filename, source] of cases) await t.test(name, async t => {
    const report = await verify(t, { [filename]: source });
    assert.equal(reportPassed(report), false, report.output);
    assert.equal(report.passed, 0, 'A synthetic file success must not count as an executed test.');
  });
});

test('test output cannot manufacture successful verification evidence', async t => {
  for (const [name, source] of [
    ['forged TAP', fakeTap],
    ['forged JSON summary', fakeJson],
    ['forged host summary on stdout', fakeHostSummary + '(process.stdout);'],
    ['forged host summary on stderr', fakeHostSummary + '(process.stderr);'],
    ['forged TAP and JSON with an assertion failure', fakeTap + fakeJson + 'require("node:test")("fails", () => require("node:assert/strict").equal(1, 2));'],
    ['forged host summary with an assertion failure', fakeHostSummary + '(process.stdout);' + 'require("node:test")("fails", () => require("node:assert/strict").equal(1, 2));'],
    ['forged success with a skipped test', fakeTap + fakeJson + 'require("node:test").skip("not executed", () => {});'],
  ]) await t.test(name, async t => {
    const report = await verify(t, { 'app.test.cjs': source });
    assert.equal(reportPassed(report), false, report.output);
    assert.equal(report.passed, 0, 'Printed summaries must not supply passing test counts.');
  });
});

test('registered application tests retain accurate counts across names and nesting', async t => {
  const cases = [
    ['named test', { 'app.test.cjs': realTest }, 1],
    ['anonymous test', { 'app.test.cjs': 'require("node:test")(() => require("node:assert/strict").equal(3, 3));' }, 1],
    ['test named after its file', { 'app.test.cjs': 'require("node:test")(__filename, () => require("node:assert/strict").equal(3, 3));' }, 1],
    ['ES module test', { 'app.test.mjs': 'import test from "node:test"; import assert from "node:assert/strict"; test("ES module", () => assert.equal(3, 3));' }, 1],
    ['nested test', { 'app.test.cjs': 'require("node:test")("parent", async t => { await t.test("child", () => require("node:assert/strict").equal(3, 3)); });' }, 2],
    ['suite containing tests', { 'app.test.cjs': 'const { describe, it } = require("node:test"); describe("suite", () => { it("first", () => require("node:assert/strict").equal(1, 1)); it("second", () => require("node:assert/strict").equal(2, 2)); });' }, 2],
    ['imported test definition', { 'app.test.cjs': 'require("./checks.cjs");', 'checks.cjs': realTest }, 1],
    ['shared imported definitions in separate test files', { 'app.test.cjs': 'require("./checks.cjs");', 'other.test.cjs': 'require("./checks.cjs");', 'checks.cjs': realTest }, 2],
  ];
  for (const [name, files, count] of cases) await t.test(name, async t => {
    const report = await verify(t, files);
    assert.equal(reportPassed(report), true, report.output);
    assert.equal(report.total, count);
    assert.equal(report.passed, count);
    assert.equal(report.failed, 0);
    assert.equal(report.skipped, 0);
  });
});

test('skipped or todo suites cannot hide behind a passing application test', async t => {
  for (const [name, suite] of [
    ['skipped suite', 'require("node:test").describe.skip("unfinished suite", () => {});'],
    ['todo suite', 'require("node:test").describe.todo("unfinished suite", () => {});'],
    ['skip with an empty reason', 'require("node:test").describe("unfinished suite", { skip: "" }, () => {});'],
    ['todo with an empty reason', 'require("node:test").describe("unfinished suite", { todo: "" }, () => {});'],
  ]) await t.test(name, async t => {
    const report = await verify(t, { 'app.test.cjs': realTest + '\n' + suite });
    assert.equal(reportPassed(report), false, report.output);
    assert.ok(report.skipped > 0, 'Suite skip/todo metadata must be included in failure evidence.');
  });
});

test('assertion and hook failures prevent successful verification', async t => {
  for (const [name, source] of [
    ['assertion failure', 'require("node:test")("fails", () => require("node:assert/strict").equal(1, 2));'],
    ['failing hook', 'require("node:test").before(() => { throw new Error("broken setup"); });' + realTest],
    ['failing nested test', 'require("node:test")("parent", async t => { await t.test("child", () => { throw new Error("broken behavior"); }); });'],
  ]) await t.test(name, async t => {
    const report = await verify(t, { 'app.test.cjs': source });
    assert.equal(reportPassed(report), false, report.output);
    assert.ok(report.failed > 0);
  });
});

test('each discovered test file must contribute executed application tests', async t => {
  const report = await verify(t, { 'app.test.cjs': realTest, 'empty.test.cjs': '// Placeholder without test cases.' });
  assert.equal(reportPassed(report), false, report.output);
  assert.equal(report.passed, 1, 'The placeholder must not inflate the real passing test count.');
});

test('large Unicode diagnostics survive framed output without changing evidence', async t => {
  const diagnostic = '雪🌻'.repeat(20_000);
  const report = await verify(t, { 'app.test.cjs': 'require("node:test")("Unicode diagnostic", t => { t.diagnostic("雪🌻".repeat(20_000)); require("node:assert/strict").equal(2, 2); });' });
  assert.equal(reportPassed(report), true);
  assert.equal(report.passed, 1);
  assert.ok(report.output.includes(diagnostic), 'UTF-8 diagnostics must survive stdout chunk boundaries.');
});

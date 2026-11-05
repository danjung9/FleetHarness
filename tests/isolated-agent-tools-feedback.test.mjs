import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createIsolatedAgentTools } from '../dist-electron/electron/isolated-agent-tools.js';

const sandbox = { skip: !['darwin', 'linux'].includes(process.platform), timeout: 30_000 };
const MAX_FEEDBACK_BYTES = 50_000;

async function fixture(t) {
  const workspace = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-shell-feedback-')));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const tools = new Map(createIsolatedAgentTools({ workspace, executable: process.execPath }).map(tool => [tool.name, tool]));
  return {
    workspace,
    call: (name, args) => tools.get(name).execute('feedback-test', args),
    write: (filename, content) => fs.writeFile(path.join(workspace, filename), content),
  };
}

async function failure(operation) {
  let message;
  await assert.rejects(operation, error => {
    assert.ok(error instanceof Error);
    message = error.message;
    return true;
  });
  return message;
}

function hasText(message, expected) {
  assert.ok(message.includes(expected), `Missing ${JSON.stringify(expected)} in feedback beginning ${JSON.stringify(message.slice(0, 180))}`);
}

function hasStatus(message, code) {
  assert.ok(message.startsWith(`Isolated shell exited with code ${code}.`), `Missing exit status in ${JSON.stringify(message.slice(0, 180))}`);
}

function boundedUnicode(message) {
  assert.ok(Buffer.byteLength(message, 'utf8') <= MAX_FEEDBACK_BYTES, `Feedback used ${Buffer.byteLength(message, 'utf8')} UTF-8 bytes`);
  assert.ok(!message.includes('\uFFFD'), 'Valid output must not acquire replacement characters');
  assert.ok(message === Buffer.from(message, 'utf8').toString('utf8'), 'Feedback must not contain a lone surrogate');
}

function emitter(stdout, stderr, exitCode) {
  return `const fs = require('node:fs');
fs.writeFileSync(1, ${JSON.stringify(stdout)});
fs.writeFileSync(2, ${JSON.stringify(stderr)});
process.exitCode = ${exitCode};
`;
}

test('a real failing application test keeps its assertion alongside a launcher warning and can be repaired', sandbox, async t => {
  const f = await fixture(t);
  await f.write('invoice.mjs', 'export const invoiceTotal = (subtotal, tax) => subtotal;\n');
  await f.write('invoice.test.mjs', `import test from 'node:test';
import assert from 'node:assert/strict';
import { invoiceTotal } from './invoice.mjs';
test('invoice total includes tax', () => assert.equal(invoiceTotal(100, 8), 108));
`);
  const command = "printf '%s\\n' 'Launcher warning: optional cache unavailable.' >&2\nnode --test --test-reporter=tap invoice.test.mjs";
  const message = await failure(f.call('bash', { command }));
  hasStatus(message, 1);
  hasText(message, 'stdout:\n');
  hasText(message, 'stderr:\n');
  hasText(message, 'invoice total includes tax');
  hasText(message, 'expected: 108');
  hasText(message, 'actual: 100');
  hasText(message, 'Launcher warning: optional cache unavailable.');
  assert.ok(!message.includes('[Earlier output truncated]'));

  const repair = f.call('edit', { path: 'invoice.mjs', edits: [{ oldText: '=> subtotal;', newText: '=> subtotal + tax;' }] });
  const rerun = f.call('bash', { command });
  await repair;
  const result = await rerun;
  assert.deepEqual(result.details, { isolated: true, exitCode: 0 });
  hasText(result.content[0].text, '# pass 1');
  hasText(result.content[0].text, '# fail 0');
  hasText(result.content[0].text, 'Launcher warning: optional cache unavailable.');
});

for (const [name, stdout, stderr, code] of [
  ['stdout only', 'Parser failed for record café: expected 12, received 9.\n', '', 7],
  ['stderr only', '', 'Cannot open input: résumé.json\n', 13],
  ['no output', '', '', 23],
]) {
  test(`failed shell feedback reports the exit status with ${name}`, sandbox, async t => {
    const f = await fixture(t);
    await f.write('command.cjs', emitter(stdout, stderr, code));
    const message = await failure(f.call('bash', { command: 'node command.cjs' }));
    hasStatus(message, code);
    if (stdout) { hasText(message, 'stdout:\n'); hasText(message, stdout); }
    if (stderr) { hasText(message, 'stderr:\n'); hasText(message, stderr); }
    assert.ok(!message.includes('[Earlier output truncated]'));
    boundedUnicode(message);
  });
}

test('successful shell feedback preserves both streams and exit zero without failure formatting', sandbox, async t => {
  const f = await fixture(t);
  const stdout = 'Invoice total: 108 €\n';
  const stderr = 'Optional cache warning: café 😀\n';
  await f.write('success.cjs', emitter(stdout, stderr, 0));
  const result = await f.call('bash', { command: 'node success.cjs' });
  assert.deepEqual(result, { content: [{ type: 'text', text: stdout + stderr }], details: { isolated: true, exitCode: 0 } });
  const empty = await f.call('bash', { command: 'true' });
  assert.deepEqual(empty, { content: [{ type: 'text', text: '(no output)' }], details: { isolated: true, exitCode: 0 } });
});

test('large failures preserve useful tails from both streams inside one UTF-8 feedback budget', sandbox, async t => {
  const f = await fixture(t);
  const stdout = 'DISCARDED_OUTPUT_START\n' + 'o'.repeat(90_000) + '\nOUTPUT_TAIL: expected 108, received 100.\n';
  const stderr = 'DISCARDED_ERROR_START\n' + 'e'.repeat(90_000) + '\nERROR_TAIL: optional cache unavailable.\n';
  await f.write('large.cjs', emitter(stdout, stderr, 9));
  const message = await failure(f.call('bash', { command: 'node large.cjs' }));
  boundedUnicode(message);
  hasStatus(message, 9);
  for (const text of ['stdout:\n', 'stderr:\n', '[Earlier output truncated]', 'OUTPUT_TAIL: expected 108, received 100.', 'ERROR_TAIL: optional cache unavailable.']) hasText(message, text);
  assert.ok(!message.includes('DISCARDED_OUTPUT_START'));
  assert.ok(!message.includes('DISCARDED_ERROR_START'));
  // A stream must retain more than its final sentinel even when both compete for space.
  hasText(message, 'o'.repeat(1_000));
  hasText(message, 'e'.repeat(1_000));
});

// Stdout is decoded after collecting its bytes. Use it to isolate formatter
// boundaries from the executor's separate incremental stderr decoding behavior.
for (const character of ['é', '€', '😀']) {
  test(`large stdout failure truncation preserves ${Buffer.byteLength(character)}-byte Unicode characters`, sandbox, async t => {
    const f = await fixture(t);
    const bytes = Buffer.byteLength(character);
    const suffix = `\nUNICODE_TAIL_${bytes}: ${character}${bytes === 3 ? '' : '!'}\n`;
    const stdout = 'DISCARDED_UNICODE_START\n' + character.repeat(50_000) + suffix;
    await f.write('unicode.cjs', emitter(stdout, '', 6));
    const message = await failure(f.call('bash', { command: 'node unicode.cjs' }));
    boundedUnicode(message);
    hasStatus(message, 6);
    hasText(message, '[Earlier output truncated]');
    hasText(message, suffix);
    hasText(message, character.repeat(100));
    assert.ok(!message.includes('DISCARDED_UNICODE_START'));
  });
}

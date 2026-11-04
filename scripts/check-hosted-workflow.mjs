import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import vm from 'node:vm';
import { parse } from 'acorn';

const root = new URL('../', import.meta.url);
const flow = new URL('.vercel/output/functions/.well-known/workflow/v1/flow.func/', root);
const workflowId = 'workflow//./workflows/build//buildWorkflow';
const stepNames = ['prepare', 'progress', 'verify', 'verificationProgress', 'failure'];
const stepId = name => `step//./workflows/steps//${name}`;
const manifest = JSON.parse(await readFile(new URL('node_modules/.nitro/workflow/manifest.json', root), 'utf8'));
assert.equal(manifest.workflows['workflows/build.ts']?.buildWorkflow?.workflowId, workflowId);
for (const name of stepNames) assert.equal(manifest.steps['workflows/steps.ts']?.[name]?.stepId, stepId(name));

// Import the deployed flow handler in a fresh process to catch missed registrations
// and incompatible external dependencies without contacting any hosted service.
const nativeFetch = globalThis.fetch;
globalThis.fetch = () => { throw new Error('The build smoke must not make external network requests.'); };
await import(new URL('index.mjs', flow));
const registered = globalThis[Symbol.for('@workflow/core//registeredSteps')];
for (const name of stepNames) assert.equal(typeof registered?.get(stepId(name)), 'function', `Missing deployed step: ${name}`);

// Exercise the bundled Sandbox transport against loopback. Its Undici dispatcher
// must work with Node's fetch; incompatible externalization otherwise fails only
// when the first real build tries to create a sandbox.
const mock = createServer((_request, response) => {
  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: { code: 'not_found', message: 'Smoke sandbox is intentionally absent.' } }));
});
mock.listen(0, '127.0.0.1');
await once(mock, 'listening');
try {
  const get = registered.get('step//./node_modules/@vercel/sandbox/dist/sandbox//Sandbox.get');
  const Sandbox = globalThis[Symbol.for('workflow-class-registry')]?.get('class//./node_modules/@vercel/sandbox/dist/sandbox//Sandbox');
  assert.equal(typeof get, 'function', 'Missing bundled Sandbox.get.');
  await assert.rejects(get.call(Sandbox, {
    name: 'cold-start-smoke', token: 'smoke-token', projectId: 'prj_smoke', teamId: 'team_smoke',
    signal: AbortSignal.timeout(5_000),
    fetch: (_url, options) => nativeFetch(`http://127.0.0.1:${mock.address().port}/sandbox`, options),
  }), error => error.message.includes('404') && !error.cause, 'Sandbox transport must reach the local HTTP fixture.');
} finally {
  mock.closeAllConnections();
  await new Promise(resolve => mock.close(resolve));
}

// Evaluate the emitted workflow and dispatch only an inert first-step stub.
const source = await readFile(new URL('index.mjs', flow), 'utf8');
const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
const entries = [];
function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'workflowEntrypoint') {
    const argument = node.arguments[0];
    if (argument?.type === 'TemplateLiteral' && argument.expressions.length === 0) entries.push(argument.quasis[0].value.cooked);
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(visit);
    else if (typeof value === 'object') visit(value);
  }
}
visit(ast);
assert.equal(entries.length, 1, 'Expected one emitted workflow entrypoint.');
const calls = [];
const context = vm.createContext({
  TextEncoder,
  TextDecoder,
  [Symbol.for('WORKFLOW_USE_STEP')]: id => async () => { calls.push(id); return false; },
});
vm.runInContext(entries[0], context, { timeout: 2_000 });
const workflow = context.__private_workflows?.get(workflowId);
assert.equal(typeof workflow, 'function', 'Missing emitted build workflow.');
await workflow('cold-start-smoke', 1);
assert.deepEqual(calls, [stepId('prepare')]);

const config = JSON.parse(await readFile(new URL('.vc-config.json', flow), 'utf8'));
assert.ok(config.experimentalTriggers?.some(trigger => trigger.type === 'queue/v2beta' && trigger.topic === '__wkf_workflow_*'), 'Missing Workflow queue trigger.');
console.log('Hosted workflow cold start passed: workflow, five steps, queue trigger, and Sandbox HTTP transport.');

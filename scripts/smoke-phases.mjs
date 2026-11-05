import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startFixtureProvider } from './mock-provider.mjs';

// Exercise the real Pi SDK against a local provider, including tool selection and repair.
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-phase-sdk-'));
const fixture = await startFixtureProvider();
const previousAgentDir = process.env.PI_CODING_AGENT_DIR;
let backend;
try {
  const piDir = path.join(root, 'pi');
  await fs.mkdir(piDir);
  process.env.PI_CODING_AGENT_DIR = piDir;
  await fs.writeFile(path.join(piDir, 'models.json'), JSON.stringify({ providers: {
    'fleet-fixture': { baseUrl: fixture.baseUrl, api: 'openai-completions', apiKey: 'local-fixture-only', models: [
      { id: 'fixture-model', name: 'Local phase fixture', reasoning: false, input: ['text', 'image'], contextWindow: 64000, maxTokens: 8000, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }
    ] }
  } }));
  const { Store } = await import('../dist-electron/electron/storage.js');
  const { PiBackend } = await import('../dist-electron/electron/pi-backend.js');
  const store = new Store(root); await store.init();
  store.state.settings = { provider: 'fleet-fixture', model: 'fixture-model', rememberKey: false };
  const project = store.state.projects[0]; project.challengeId = '12';
  backend = new PiBackend(store, process.execPath, () => {}, path.resolve('.'));
  await backend.init();
  await backend.start(project.id); await backend.active.get(project.id)?.done;
  assert.equal(project.status, 'review', project.error);
  assert.equal(project.report.failed, 0);
  assert.equal(project.report.passed, 1);
  const observed = new Set();
  for (const request of fixture.requests) {
    const prompt = request.messages.filter(message => message.role === 'user').map(message => typeof message.content === 'string' ? message.content : JSON.stringify(message.content)).join('\n');
    const stage = /Current phase: (\w+)\./.exec(prompt)?.[1];
    assert.ok(stage, 'Every provider request identifies its phase');
    observed.add(stage);
    const phase = project.phasePlan.find(phase => phase.id === stage);
    const tools = request.tools.map(tool => tool.function.name).sort();
    assert.deepEqual(tools, [...project.globalTools, ...phase.tools].sort(), stage);
    assert.equal(tools.includes('fleet_solve_schedule'), false, 'Message builds must not expose scheduling tools');
  }
  assert.deepEqual([...observed], ['intake', 'research', 'plan', 'build', 'verify']);
  assert.ok(project.logs.some(log => log.text.includes('Starting one Pi repair attempt')));
  console.log(JSON.stringify({ passed: true, phases: [...observed], globalTools: project.globalTools, exactToolSelection: true, repair: true, passingApplicationTests: project.report.passed }));
} finally {
  await backend?.stopAll();
  await fixture.close();
  if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
  else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
  await fs.rm(root, { recursive: true, force: true });
}

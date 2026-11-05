import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import type { RecipeId } from './types.js';
import type { RuntimeManifest } from '../shared/solution.js';
import { fixtures } from './fixtures.js';

export type ComputePack = 'messages' | 'scheduling' | 'offline' | 'evidence' | 'readiness' | 'custom';
export type FoundationId = 'node-service' | 'python-service' | 'custom';
export interface FoundationPlan {
  schemaVersion: 1;
  templateId: FoundationId;
  version: '1.0.0';
  computePack: ComputePack;
  reason: string;
}
export interface FoundationSnapshot {
  planText: string;
  lockText: string;
  files: number;
  bytes: number;
  templateHash: string;
}

const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const commonFiles = ['public/index.html', 'public/app.js', 'public/styles.css', 'FOUNDATION.md'];
export const foundationCatalog = [
  { id: 'node-service', version: '1.0.0', title: 'Node service with browser interface',
    files: ['server.mjs', 'compute.mjs', 'package.json', ...commonFiles],
    runtime: 'node', dependencies: 'None; Node 22.19 or later',
    description: 'Local HTTP API, browser client, validation/error handling and a replaceable backend computation module.',
    source: 'Bundled AppYard original template; no upstream starter code is vendored.',
    references: ['https://nodejs.org/api/http.html', 'https://vite.dev/guide/', 'https://github.com/fastify/create-fastify'] },
  { id: 'python-service', version: '1.0.0', title: 'Python computation service with browser interface',
    files: ['server.py', 'compute.py', ...commonFiles],
    runtime: 'python', dependencies: 'None; installed Python 3.10 or later',
    description: 'Local standard-library HTTP adapter for Python calculations. Implement the domain math in compute.py.',
    source: 'Bundled AppYard original template; no upstream starter code is vendored.',
    references: ['https://docs.python.org/3/library/http.server.html', 'https://github.com/fastapi/full-stack-fastapi-template'] }
] as const;

const packs = {
  messages: { module: 'messages', fn: 'extractMessages', fixture: 'fleet_extract_messages' },
  scheduling: { module: 'scheduling', fn: 'solveSchedule', fixture: 'fleet_solve_schedule' },
  offline: { module: 'offline', fn: 'reconcileRecords', fixture: 'fleet_reconcile_records' },
  evidence: { module: 'evidence', fn: 'searchEvidence', fixture: 'fleet_search_evidence' },
  readiness: { module: 'readiness', fn: 'analyzeDependencies', fixture: 'fleet_analyze_dependencies' }
} as const;

/** Domain specialization selects the foundation; Pi/Codex are interchangeable builders. */
export function recommendFoundation(recipe: RecipeId): FoundationPlan {
  const packByRecipe: Record<RecipeId, ComputePack> = { messages: 'messages', scheduling: 'scheduling', offline: 'offline',
    knowledge: 'evidence', readiness: 'readiness', cyber: 'evidence', workflow: 'offline', governance: 'custom', physics: 'custom', fielding: 'custom' };
  if (!Object.hasOwn(packByRecipe, recipe)) throw new Error('Unknown foundation recipe: ' + recipe);
  return { schemaVersion: 1, templateId: recipe === 'physics' ? 'python-service' : 'node-service', version: '1.0.0', computePack: packByRecipe[recipe],
    reason: recipe === 'physics' ? 'The engineering specialist can extend a Python backend with owner-supplied equations and reference cases.'
      : `The ${recipe} specialist starts with a local service and ${packByRecipe[recipe] === 'custom' ? 'an explicit domain implementation boundary' : 'the existing ' + packByRecipe[recipe] + ' calculation primitive'}.` };
}

export function validateFoundationPlan(value: unknown, runtime?: RuntimeManifest): FoundationPlan {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('foundation-plan.json must be an object.');
  const p = value as Record<string, unknown>;
  if (Object.keys(p).some(key => !['schemaVersion', 'templateId', 'version', 'computePack', 'reason'].includes(key)) ||
      p.schemaVersion !== 1 || typeof p.templateId !== 'string' || !['node-service', 'python-service', 'custom'].includes(p.templateId) || p.version !== '1.0.0' ||
      typeof p.computePack !== 'string' || ![...Object.keys(packs), 'custom'].includes(p.computePack) || typeof p.reason !== 'string' || !p.reason.trim() || p.reason.length > 2000) {
    throw new Error('Invalid foundation plan: use schemaVersion 1, a catalog templateId, version 1.0.0, a supported computePack and a reason.');
  }
  if (p.templateId !== 'node-service' && p.computePack !== 'custom') throw new Error('Only the Node service supports bundled computation packs; Python/custom requires computePack custom.');
  const plan = p as unknown as FoundationPlan;
  if (runtime && plan.templateId !== 'custom') {
    const expected = foundationRuntime(plan);
    if (runtime.profile !== expected.profile || runtime.command?.runtime !== expected.command!.runtime ||
        runtime.command.entrypoint !== expected.command!.entrypoint || runtime.command.args.length ||
        runtime.healthPath !== expected.healthPath || runtime.invokePath !== expected.invokePath ||
        expected.files.some(file => !runtime.files.includes(file))) {
      throw new Error('The solution runtime does not match the selected foundation. Use its complete runtime manifest and service endpoints.');
    }
  }
  return structuredClone(plan);
}

export function foundationRuntime(selection: FoundationPlan): RuntimeManifest {
  const plan = validateFoundationPlan(selection);
  if (plan.templateId === 'custom') throw new Error('A custom foundation needs an independently declared runtime.');
  const template = foundationCatalog.find(item => item.id === plan.templateId)!;
  const files: string[] = [...template.files, 'foundation-lock.json'];
  if (plan.computePack !== 'custom') files.push('lib/validation.js', `lib/${packs[plan.computePack].module}.js`, 'example-input.json');
  return { profile: 'service', command: { runtime: template.runtime, entrypoint: template.runtime === 'node' ? 'server.mjs' : 'server.py', args: [] },
    files, requiredEnv: [], healthPath: '/health', invokePath: '/api/invoke' };
}

/** Only ordinary files under an ordinary directory; used for both installed assets and destinations. */
async function ordinaryRoot(root: string) {
  const stat = await fs.lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Foundation root must be an ordinary directory.');
  return fs.realpath(root);
}
async function checkedPath(root: string, name: string, missing = false) {
  if (!/^[A-Za-z0-9_.\/-]+$/.test(name) || name.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('Invalid foundation file path.');
  let current = root;
  for (const [index, part] of name.split('/').entries()) {
    current = path.join(current, part);
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink() || (index < name.split('/').length - 1 ? !stat.isDirectory() : !stat.isFile())) throw new Error('Foundation paths must be ordinary files and directories without symlinks: ' + name);
    } catch (error) { if (!missing || (error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  return current;
}

async function templateFiles(resourcesRoot: string, selection: FoundationPlan) {
  const result = new Map<string, string>();
  if (selection.templateId === 'custom') return result;
  const root = await ordinaryRoot(path.join(resourcesRoot, 'templates'));
  const registry = JSON.parse(await fs.readFile(await checkedPath(root, 'registry.json'), 'utf8'));
  const template = foundationCatalog.find(item => item.id === selection.templateId)!;
  const pinned = registry.templates?.find((item: any) => item.id === template.id && item.version === selection.version);
  if (registry.schemaVersion !== 1 || !pinned || Object.keys(pinned.files ?? {}).sort().join() !== [...template.files].sort().join()) throw new Error('Bundled foundation registry does not match the pinned template version/files.');
  for (const name of template.files) {
    const body = await fs.readFile(await checkedPath(root, `${template.id}/${name}`), 'utf8');
    if (hash(body) !== pinned.files[name]) throw new Error('Bundled foundation checksum mismatch: ' + name);
    result.set(name, body);
  }
  if (selection.computePack !== 'custom') {
    const pack = packs[selection.computePack];
    for (const name of ['validation', pack.module]) {
      const source = fileURLToPath(new URL(`./tools/${name}.js`, import.meta.url));
      const body = await fs.readFile(source, 'utf8');
      if (registry.computation?.version !== selection.version || registry.computation.files?.[`${name}.js`] !== hash(body)) throw new Error('Bundled computation checksum mismatch: ' + name + '. Review and version the computation pack before use.');
      result.set(`lib/${name}.js`, body);
    }
    result.set('compute.mjs', `// One backend implementation is shared by the HTTP endpoint and application tests.\n// Extend this adapter for the planned domain; this primitive is not a complete solution.\nimport { ${pack.fn} } from './lib/${pack.module}.js';\nexport async function compute(input, context = {}) {\n  return ${pack.fn}(input${selection.computePack === 'scheduling' ? ', context.signal' : ''});\n}\n`);
    result.set('example-input.json', json(fixtures[pack.fixture]));
  }
  return result;
}

export async function prepareFoundationPacket(recipe: RecipeId, resourcesRoot: string): Promise<Map<string, string>> {
  const recommendation = recommendFoundation(recipe);
  // Fail before launching agents if the release omitted or changed its bundled starter assets.
  for (const template of foundationCatalog) await templateFiles(resourcesRoot, { schemaVersion: 1, templateId: template.id, version: '1.0.0', computePack: 'custom', reason: 'Validate bundled release.' });
  await templateFiles(resourcesRoot, recommendation);
  return new Map([
    ['foundation-catalog.json', json({ schemaVersion: 1, recommendation, templates: foundationCatalog.map(template => ({ ...template,
      runtimeManifest: foundationRuntime({ schemaVersion: 1, templateId: template.id, version: '1.0.0', computePack: 'custom', reason: 'Base service before selecting a computation pack.' }) })),
      computationPacks: Object.fromEntries(Object.entries(packs).map(([id, pack]) => [id, { ...pack,
        additionalRuntimeFiles: ['lib/validation.js', `lib/${pack.module}.js`, 'example-input.json'] }])), recommendedRuntime: foundationRuntime(recommendation),
      custom: 'Use templateId custom, version 1.0.0 and computePack custom only when no bundled service fits. Explain the concrete incompatibility.' })],
    ['foundation-guide.md', foundationGuide]
  ]);
}

export async function materializeFoundation(input: { workspace: string; resourcesRoot: string; selection: FoundationPlan }): Promise<FoundationSnapshot> {
  const selection = validateFoundationPlan(input.selection), root = await ordinaryRoot(input.workspace);
  const planPath = await checkedPath(root, 'foundation-plan.json');
  const planText = await fs.readFile(planPath, 'utf8');
  if (json(validateFoundationPlan(JSON.parse(planText))) !== json(selection)) throw new Error('Foundation selection differs from foundation-plan.json.');
  const files = await templateFiles(input.resourcesRoot, selection);
  const hashes = Object.fromEntries([...files].sort(([a], [b]) => a.localeCompare(b)).map(([name, body]) => [name, hash(body)]));
  const templateHash = hash(json(hashes));
  const bytes = [...files.values()].reduce((sum, body) => sum + Buffer.byteLength(body), 0);
  const lockText = json({ schemaVersion: 1, selection, templateHash, files: hashes, copiedFiles: files.size, copiedBytes: bytes,
    scope: 'Original starter bytes before agent edits; not application verification or measured token savings.' });
  const snapshot = { planText, lockText, files: files.size, bytes, templateHash };
  files.set('foundation-lock.json', lockText);
  const pending: [string, string][] = [];
  // Check every collision before writing anything. Idempotent only for identical initial materialization.
  for (const [name, body] of files) {
    const target = await checkedPath(root, name, true);
    try {
      if (await fs.readFile(target, 'utf8') !== body) throw new Error('Foundation would overwrite an existing file: ' + name + '. Use a fresh workspace.');
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; pending.push([name, body]); }
  }
  const written: string[] = [];
  try {
    for (const [name, body] of pending) {
      const target = await checkedPath(root, name, true);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, body, { flag: 'wx', mode: 0o600 });
      written.push(target);
    }
  } catch (error) { await Promise.all(written.map(file => fs.rm(file, { force: true }))); throw error; }
  return snapshot;
}

export async function assertFoundationIntegrity(workspace: string, snapshot: FoundationSnapshot) {
  const root = await ordinaryRoot(workspace);
  for (const [name, expected] of [['foundation-plan.json', snapshot.planText], ['foundation-lock.json', snapshot.lockText]]) {
    if (await fs.readFile(await checkedPath(root, name), 'utf8') !== expected) throw new Error('Foundation provenance changed during the run: ' + name);
  }
}

export const foundationGuide = `# Reuse the foundation before writing application code

Read foundation-catalog.json. The host recommends a template and computation pack for the domain specialist, independently of the Pi/Codex coding provider. Research may recommend another listed choice. During planning, write foundation-plan.json with exactly schemaVersion (1), templateId (node-service, python-service or custom), version (1.0.0), computePack (messages, scheduling, offline, evidence, readiness or custom), and reason (a concrete fit/tradeoff). Python and custom templates require computePack custom.

Copy the selected runtime manifest from this catalog into solution-contract.json. When changing the recommendation, retain every selected template file plus foundation-lock.json; Node packs also require lib/validation.js, lib/<pack module>.js and example-input.json. Declare additional source/assets/dependency lockfiles as needed. Use service runtime with server.mjs/node or server.py/python, no command args, healthPath /health and invokePath /api/invoke. Node requires 22.19+, Python requires installed 3.10+. These local prototypes do not supply production authentication, deployment, databases, OCR, model inference or offline persistence. A Python runtime is not bundled with the desktop app.

The host validates the choice and copies pinned starter files AFTER planning and BEFORE implementation. Do not generate these files during planning. After copying, read FOUNDATION.md and foundation-lock.json, inspect compute.mjs or compute.py, and extend them. The HTTP adapter, UI fetch client, styles and error handling already exist. Agent tokens should go into domain behavior, meaningful interfaces, data integrations and tests. Never reproduce the foundation file-by-file in a tool response. The UI and host evaluator both POST the raw input JSON to /api/invoke; the backend returns the computed JSON value. Application tests import the same computation module. Keep computation out of duplicated browser/test code.

Node packs copy real local toolkit modules into lib/ so the delivered app does not depend on .fleet. They are limited calculation primitives, not completed challenge applications. example-input.json is a synthetic toolkit transport example; use the prepared brief data for the actual application and acceptance tests. Workflow/offline still need actual transitions, durable storage and synchronization; cyber only gets evidence search; governance/physics/custom fail explicitly until the agent implements the planned core. Do not invent scientific equations or use canned output to make evaluations pass.

The custom escape hatch requires a concrete incompatibility (for example browser-only offline execution, a CLI deliverable or an owner-supplied application); it copies no application code and does not provide token savings. Do not select it merely to rebuild an equivalent service. Foundation plan/provenance are frozen after materialization; starter source is editable. foundation-lock.json records original per-file hashes, total bytes and template version. It is provenance, not a claim about final test quality or exact tokens saved. Updated dependencies require exact manifests/locks and clean-runtime verification. All core and browser acceptance gates still apply.
`;

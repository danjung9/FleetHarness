import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { TSchema } from 'typebox';
import { Check } from 'typebox/value';
import { fixtures } from '../harness/fixtures.js';
import { prepareFleetWorkspace } from '../harness/integration.js';
import { createFleetTools } from '../harness/pi-tools.js';
import { invokeFleetTool, toolRegistry } from '../harness/tool-registry.js';
import { searchEvidence } from '../harness/tools/evidence.js';
import { planUploads } from '../harness/tools/offline.js';

type TimestampTool = 'fleet_search_evidence' | 'fleet_plan_uploads';

function property(schema: TSchema, name: string): TSchema {
  const properties = (schema as { properties?: Record<string, TSchema> }).properties;
  assert.ok(properties && typeof properties === 'object', 'Expected an object schema');
  const value = properties[name];
  assert.ok(value && typeof value === 'object', `Missing schema property: ${name}`);
  return value;
}

function items(schema: TSchema): TSchema {
  const value = (schema as { items?: TSchema | TSchema[] }).items;
  assert.ok(value && !Array.isArray(value) && typeof value === 'object', 'Expected an array item schema');
  return value;
}

const fields: {
  tool: TimestampTool;
  path: string;
  schema: (parameters: TSchema) => TSchema;
  input: (value: string) => unknown;
  direct: (input: unknown) => unknown;
}[] = [
  {
    tool: 'fleet_search_evidence', path: 'asOf',
    schema: parameters => property(parameters, 'asOf'),
    input: value => ({ ...structuredClone(fixtures.fleet_search_evidence), asOf: value }),
    direct: searchEvidence,
  },
  {
    tool: 'fleet_search_evidence', path: 'documents[1].updatedAt',
    schema: parameters => property(items(property(parameters, 'documents')), 'updatedAt'),
    input: value => {
      const input = structuredClone(fixtures.fleet_search_evidence);
      input.documents[1].updatedAt = value;
      return input;
    },
    direct: searchEvidence,
  },
  {
    tool: 'fleet_plan_uploads', path: 'items[1].createdAt',
    schema: parameters => property(items(property(parameters, 'items')), 'createdAt'),
    input: value => {
      const input = structuredClone(fixtures.fleet_plan_uploads);
      input.items[1].createdAt = value;
      return input;
    },
    direct: planUploads,
  },
];

const accepted = [
  '2026-11-04T12:00Z', '2026-11-04T12:00:30Z',
  '2026-11-04T07:00-05:00', '2026-11-04T07:00:30-05:00',
  '2026-11-04T17:30+05:30', '2026-11-04T17:30:30+05:30',
  '2026-11-04T12:00+14:00', '2026-11-04T12:00:30-14:00',
];
const invalidFormat = ['2043-07-19', '2043-07-19T09:14', '2043-07-19T09:14:00', 'PRIVATE-TIMESTAMP-INPUT'];
const invalidSemantic = ['2043-02-29T09:14:00Z', '2043-04-31T09:14Z', '2043-07-19T09:14:00+14:30', '2043-07-19T09:14-15:00'];

function registrySchema(tool: TimestampTool): TSchema {
  return toolRegistry.find(entry => entry.name === tool)!.parameters;
}

function assertTimestampContract(schema: TSchema) {
  const description = (schema as { description?: unknown }).description;
  assert.ok(typeof description === 'string', 'Describe the timestamp contract');
  assert.match(description, /timestamp/i);
  assert.match(description, /time\s*zone/i);
  assert.ok(JSON.stringify(schema).includes('2026-11-04T12:00:00Z'), 'Publish a concrete valid timestamp example');
  for (const value of accepted) assert.equal(Check(schema, value), true, `Schema must accept ${value}`);
  for (const value of invalidFormat) assert.equal(Check(schema, value), false, `Schema must reject ${value}`);
}

function assertTimestampError(call: () => unknown, field: string, input: string, allowPointer = false) {
  assert.throws(call, error => {
    assert.ok(error instanceof Error);
    const pointer = '/' + field.replace(/\[(\d+)\]/g, '/$1').replaceAll('.', '/');
    assert.ok(error.message.includes(field) || (allowPointer && error.message.includes(pointer)), `Error must identify ${field}: ${error.message}`);
    assert.match(error.message, /timestamp/i);
    assert.match(error.message, /time\s*zone/i);
    assert.ok(error.message.includes('2026-11-04T12:00:00Z'), 'Give a valid corrective example');
    assert.equal(error.message.includes(input), false, 'Do not echo caller-supplied invalid values');
    return true;
  });
}

test('registry and JSON-serialized schemas describe and enforce timezone-bearing timestamps', () => {
  for (const field of fields) {
    const parameters = registrySchema(field.tool);
    assertTimestampContract(field.schema(parameters));
    assertTimestampContract(field.schema(JSON.parse(JSON.stringify(parameters))));
    for (const value of invalidFormat) assert.equal(Check(parameters, field.input(value)), false, field.path);
  }
});

test('tool invocation identifies invalid timestamp fields with actionable non-echoing errors', () => {
  for (const field of fields) for (const value of [...invalidFormat, ...invalidSemantic]) {
    assertTimestampError(() => invokeFleetTool(field.tool, field.input(value)), field.path, value, true);
  }
});

test('direct toolkit calls retain indexed timestamp diagnostics for malformed and impossible dates', () => {
  for (const field of fields) for (const value of [...invalidFormat, ...invalidSemantic]) {
    assertTimestampError(() => field.direct(field.input(value)), field.path, value);
  }
});

test('valid timestamp forms and empty collections retain existing toolkit behavior', () => {
  for (const field of fields) for (const value of accepted) {
    const input = field.input(value);
    assert.equal(Check(registrySchema(field.tool), input), true, `${field.path}: ${value}`);
    assert.deepEqual(invokeFleetTool(field.tool, input), field.direct(input));
  }
  const evidence = searchEvidence({ ...fixtures.fleet_search_evidence, asOf: '2026-11-04T07:00-05:00',
    documents: [{ ...fixtures.fleet_search_evidence.documents[0], updatedAt: '2026-11-04T12:00:00Z' }] });
  assert.equal(evidence.results[0].updatedAt, '2026-11-04T12:00:00.000Z');
  assert.equal(evidence.results[0].stale, false);
  assert.equal((invokeFleetTool('fleet_search_evidence', { ...fixtures.fleet_search_evidence, documents: [] }) as ReturnType<typeof searchEvidence>).status, 'unknown');
  const uploads = invokeFleetTool('fleet_plan_uploads', { budgetBytes: 1000, items: [] }) as ReturnType<typeof planUploads>;
  assert.deepEqual(uploads.transfers, []);
  assert.equal(uploads.usedBytes, 0);
  assert.equal(uploads.remainingBudgetBytes, 1000);
});

test('Pi and prepared workspace handoffs expose the same timestamp contract', async t => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-timestamp-contract-'));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  await prepareFleetWorkspace({ workspace, resourcesRoot: process.cwd(), title: 'Timestamp contract',
    description: 'Verify the schemas supplied to agents.', criteria: ['Retain exact timestamp inputs'] });
  const saved: { name: string; inputSchema: TSchema }[] = JSON.parse(await fs.readFile(path.join(workspace, '.fleet/tool-schemas.json'), 'utf8'));
  const tools = createFleetTools(['fleet_search_evidence', 'fleet_plan_uploads']);
  for (const field of fields) {
    const pi = tools.find(tool => tool.name === field.tool)!.parameters;
    const persisted = saved.find(tool => tool.name === field.tool)!.inputSchema;
    assert.deepEqual(JSON.parse(JSON.stringify(pi)), JSON.parse(JSON.stringify(registrySchema(field.tool))));
    assert.deepEqual(persisted, JSON.parse(JSON.stringify(registrySchema(field.tool))));
    assertTimestampContract(field.schema(pi));
    assertTimestampContract(field.schema(persisted));
  }
});

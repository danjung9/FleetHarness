import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUxSpec, qualityContractGuide } from '../dist-electron/harness/quality-contract.js';
import { structuredSolutionFixture } from '../scripts/solution-fixture.mjs';

const ux = () => JSON.parse(structuredSolutionFixture(['R1'])['ux-spec.json']);

test('a missing persistentElements field has an actionable diagnostic without repairing the contract implicitly', () => {
  const draft = ux();
  delete draft.structure.persistentElements;
  const before = structuredClone(draft);
  assert.throws(() => parseUxSpec(draft), error => {
    assert.match(error.message, /structure\.persistentElements must be a nonempty string of at most 4000 characters/);
    assert.match(error.message, /Received a missing value/);
    assert.match(error.message, /Add this field with a JSON string value/);
    return true;
  });
  assert.deepEqual(draft, before);
  draft.structure.persistentElements = 'No shared shell controls are needed; the saved task remains available after reload.';
  assert.deepEqual(parseUxSpec(draft), draft);
});

test('list-shaped descriptions are rejected with a repair hint that preserves every intended item', () => {
  for (const values of [[], ['Application header', 'Saved tasks', 'Unsaved form draft']]) {
    const draft = ux();
    draft.structure.persistentElements = values;
    const before = structuredClone(draft);
    assert.throws(() => parseUxSpec(draft), error => {
      assert.match(error.message, /structure\.persistentElements/);
      assert.match(error.message, /Received an array/);
      assert.match(error.message, /one JSON string describing every intended list item; do not omit any requirements/);
      return true;
    });
    assert.deepEqual(draft, before, 'The validator must not coerce the array or drop its contents.');
  }
});

test('UX diagnostics identify the wrong screen key and list the supported selector field', () => {
  const draft = ux();
  draft.screens[0].rootSelector = draft.screens[0].selector;
  delete draft.screens[0].selector;
  const before = structuredClone(draft);
  assert.throws(() => parseUxSpec(draft), error => {
    assert.match(error.message, /screens\[0\] has an unknown field: rootSelector/);
    assert.match(error.message, /Allowed fields: .*\bselector\b/);
    assert.doesNotMatch(error.message.split('Allowed fields: ')[1], /rootSelector/);
    return true;
  });
  assert.deepEqual(draft, before);
});

test('descriptive strings retain their strict type, nonempty requirement and exact size limit', () => {
  for (const [value, received] of [
    [null, 'null'], [false, 'a value of type boolean'], [12, 'a value of type number'],
    [{ label: 'Header' }, 'a value of type object'], ['', 'an empty or whitespace-only string'],
    [' \n\t', 'an empty or whitespace-only string'], ['x'.repeat(4_001), 'a 4001-character string']
  ]) {
    const draft = ux();
    draft.structure.persistentElements = value;
    assert.throws(() => parseUxSpec(draft), error => {
      assert.ok(error.message.includes(`Received ${received}.`));
      return true;
    });
  }
  const boundary = ux();
  boundary.structure.persistentElements = 'x'.repeat(4_000);
  assert.equal(parseUxSpec(boundary).structure.persistentElements, boundary.structure.persistentElements);
});

test('the current planning guide explicitly documents the fields that stale UX guidance omitted', () => {
  assert.match(qualityContractGuide, /Every structure field is a required JSON string/);
  assert.match(qualityContractGuide, /persistentElements is one prose string, not an array/);
  assert.match(qualityContractGuide, /When no shared elements exist, say so explicitly instead of omitting the field/);
  assert.match(qualityContractGuide, /Use the exact field name selector, never rootSelector/);
});

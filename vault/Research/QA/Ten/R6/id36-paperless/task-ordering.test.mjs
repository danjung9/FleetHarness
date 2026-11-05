import test from 'node:test';
import assert from 'node:assert/strict';
import { compute } from './compute.mjs';

test('novel unresolved requests retain the public lexicographic issue order in the whole response', async () => {
  const input = {
    action: 'tasks',
    artifacts: [{
      sourceId: 'SYN-NOVEL-ORDER',
      bodyStartLine: 1,
      text: 'Request Z-9: Check aft locker. Owner unspecified. Due unspecified. Status pending.\nRequest A-7: Inspect forward locker if needed. Owner unspecified. Due unspecified. Status proposed.',
    }],
  };
  const actions = [
    { taskId: 'A-7', title: 'Inspect forward locker if needed', ownerRole: null,
      dueAt: null, status: 'proposed', dependsOn: [], citations: ['SYN-NOVEL-ORDER#L2'],
      issues: ['AMBIGUOUS_REQUEST', 'MISSING_DUE', 'MISSING_OWNER'] },
    { taskId: 'Z-9', title: 'Check aft locker', ownerRole: null,
      dueAt: null, status: 'pending', dependsOn: [], citations: ['SYN-NOVEL-ORDER#L1'],
      issues: ['MISSING_DUE', 'MISSING_OWNER'] },
  ];
  assert.deepEqual(await compute(input), {
    status: 'ok',
    data: {
      proposedActions: actions,
      verifiedActions: actions,
      verifiedTaskIds: [],
      unresolvedTaskIds: ['A-7', 'Z-9'],
      draftStatusUpdates: [
        { taskId: 'A-7', text: 'A-7: proposed; owner unresolved; due unresolved.',
          citations: ['SYN-NOVEL-ORDER#L2'], state: 'draft-unsubmitted' },
        { taskId: 'Z-9', text: 'Z-9: pending; owner unresolved; due unresolved.',
          citations: ['SYN-NOVEL-ORDER#L1'], state: 'draft-unsubmitted' },
      ],
      duplicateCount: 0,
    },
    errors: [],
  });
});

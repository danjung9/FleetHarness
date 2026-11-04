import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fetchNorfolkSnapshot, catalogFromNorfolk, norfolkIndexApi, norfolkOrigin } from '../dist-electron/harness/norfolk.js';
import { refreshNorfolkCatalog, challenges, toProjectInput } from '../dist-electron/harness/catalog.js';
import { newProject, Store } from '../dist-electron/electron/storage.js';

const detail = (id, overrides = {}) => ({ id, event_id: 1, is_active: true, name: `Challenge ${id}`, description: 'Official description with sufficient detail.',
  requirements: '- Keep source records', expected_deliverables: 'A working prototype', evaluation_criteria: null, resources: null, category: null,
  creator: { private: 'Not part of the import' }, ...overrides });
function mock(details, index = { event: { id: 1 }, use_cases: details.map(({ id }) => ({ id })) }) {
  return async (url, options) => {
    assert.equal(options.redirect,'error');assert.equal(options.headers.Accept,'application/json');assert.equal(options.credentials,undefined);
    if (url === norfolkIndexApi) return Response.json(index);
    const found = details.find(d => url === `${norfolkOrigin}/api/use-cases/${d.id}/`);
    return found ? Response.json(found) : new Response('', { status: 404 });
  };
}
test('Norfolk import follows every index ID, preserves source order and excludes unrelated account data', async () => {
  const snapshot = await fetchNorfolkSnapshot(mock([detail(99,{ description:null }),detail(37)]));
  assert.deepEqual(snapshot.useCases.map(c=>c.id),[99,37]);
  assert.equal(snapshot.useCases[0].description,'');assert.equal(snapshot.useCases[0].resources,'');
  assert.equal(snapshot.useCases[0].creator,undefined);assert.ok(Number.isFinite(Date.parse(snapshot.fetchedAt)));
  const catalog = await refreshNorfolkCatalog(mock([detail(99,{ description:null }),detail(37)]));
  assert.equal(catalog.challenges[0].recipe,'workflow');assert.equal(catalog.challenges[1].recipe,'fielding');
});
test('references include source and supplied links, remove prose punctuation, and deduplicate', async () => {
  const snapshot = await fetchNorfolkSnapshot(mock([detail(37,{
    resources: 'Read [the guide](https://example.com/guide). Also https://example.com/guide and https://example.com/a_(b).',
    example_project_url: 'https://example.com/demo', evaluation_criteria:'Measures of success:\n- Works offline\n- Preserves data'
  })]));
  const [challenge] = catalogFromNorfolk(snapshot,challenges);
  assert.deepEqual(challenge.links,[`${norfolkOrigin}/event/norfolk/use-cases/37`,'https://example.com/guide','https://example.com/a_(b)','https://example.com/demo']);
  assert.deepEqual(challenge.evaluationCriteria,['Works offline','Preserves data']);
});
test('invalid index, failed details, cross-event records and inactive challenges reject the complete refresh', async () => {
  for (const index of [{}, {event:{id:1},use_cases:[]}, {event:{id:1},use_cases:[{id:37},{id:37}]}, {event:{id:1},use_cases:[{id:'../37'}]}]) {
    await assert.rejects(fetchNorfolkSnapshot(mock([detail(37)],index)));
  }
  for (const change of [{event_id:2},{is_active:false},{resources:123},{description:[]},{category:{name:42}}]) {
    await assert.rejects(refreshNorfolkCatalog(mock([detail(37),detail(99,change)])));
  }
  await assert.rejects(fetchNorfolkSnapshot(mock([],{event:{id:1},use_cases:[{id:37}]})),/HTTP 404/);
  await assert.rejects(fetchNorfolkSnapshot(async()=>new Response('<html>Sign in</html>')),/unreadable/);
  await assert.rejects(refreshNorfolkCatalog(mock([detail(37,{resources:'x'.repeat(16001)})])),/16,000/);
});
test('saved catalog and project source survive reload without later source changes altering the project', async () => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'fleet-norfolk-'));
  try {
    const store=new Store(root);await store.init();
    const catalog=await refreshNorfolkCatalog(mock([detail(99)]));
    store.state.norfolkCatalog=catalog;
    const project=newProject(toProjectInput('99',catalog.challenges),catalog.challenges);
    store.state.projects.unshift(project);
    catalog.challenges[0].description='Changed on the server';
    assert.equal(project.sourceChallenge.description,'Official description with sufficient detail.');
    await store.save();
    const restored=new Store(root);await restored.init();
    assert.deepEqual(restored.state.norfolkCatalog,catalog);assert.deepEqual(restored.state.projects[0],project);
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});

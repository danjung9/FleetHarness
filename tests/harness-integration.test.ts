import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { challenges, getChallenge, toProjectInput } from '../harness/catalog.js';
import { recipes } from '../harness/recipes.js';
import { createPacket, customPacket, fleetStagePrompt } from '../harness/planner.js';
import { prepareFleetWorkspace, assertFleetPacketIntegrity } from '../harness/integration.js';
import { createFleetTools } from '../harness/pi-tools.js';
import { toolRegistry } from '../harness/tool-registry.js';
import { fixtures } from '../harness/fixtures.js';
import { globalAgentTools, toolsForPhase } from '../harness/phases.js';
import { normalizeProjectInput } from '../shared/project-input.js';
import { norfolkSnapshot } from '../harness/norfolk-snapshot.js';

const resourcesRoot=process.cwd();
async function temporary(t: any) {const root=await fs.mkdtemp(path.join(os.tmpdir(),'fleet-pipeline-'));t.after(() => fs.rm(root,{recursive:true,force:true}));return root;}

test('every captured Norfolk challenge routes to a valid recipe and official source URL', () => {
  assert.equal(challenges.length,39);assert.equal(new Set(challenges.map(c => c.id)).size,39);
  for (const c of challenges) {
    assert.ok(recipes[c.recipe]);assert.equal(new URL(c.sourceUrl).pathname,`/event/norfolk/use-cases/${c.id}`);
    assert.equal(c.sourceScope,'detail');
    const source = norfolkSnapshot.useCases.find(source => String(source.id) === c.id)!;
    assert.equal(c.description,source.description);assert.equal(c.resources,source.resources);
    assert.equal(c.expectedDeliverables,source.expected_deliverables);assert.equal(c.category,source.category?.name ?? null);
  }
  assert.deepEqual(challenges.filter(c => c.pilot).map(c => c.id).sort(),['11','12','36']);
  assert.equal(getChallenge('40').category,null);
  assert.throws(() => getChallenge('1'),/Unknown/);
});
test('project import retains source identity and yields inputs accepted by desktop title bounds', () => {
  for (const c of challenges) {
    const input=toProjectInput(c.id);
    assert.equal(input.challengeId,c.id);assert.ok(input.title.length<=120);
    assert.ok(input.description.includes(c.sourceUrl));assert.deepEqual(input.criteria,c.evaluationCriteria);
    assert.deepEqual(normalizeProjectInput(input),input);
    assert.equal(input.resources,c.resources);assert.deepEqual(input.links,c.links);
  }
  const clone=getChallenge('11');clone.title='altered';assert.notEqual(getChallenge('11').title,'altered');
});
test('the linked challenge imports official evaluation criteria, deliverables and resources while absent fields stay optional', () => {
  const input = toProjectInput('37');
  assert.match(input.description,/A reusable fielding playbook/);
  assert.ok(input.criteria.some(c => c.includes('Calculations verified against a hand-computed answer key')));
  assert.match(input.resources!,/Surf observation worksheet rules/);
  assert.ok(input.links!.includes('https://cdao.hackathon.maximus.com/event/norfolk/use-cases/37'));
  assert.deepEqual(toProjectInput('51').criteria,[]);
  assert.match(toProjectInput('51').description,/Centralized Customer Service Portal/);
  assert.equal(toProjectInput('24').resources,'');
});
test('a newly refreshed source survives workspace handoff and agent tool lookup', async t => {
  const workspace=await temporary(t);
  const sourceChallenge={...getChallenge('37'),id:'99',title:'Newly published challenge',description:'The newly published source description.'};
  const input=toProjectInput('99',[sourceChallenge]);
  await prepareFleetWorkspace({workspace,resourcesRoot,...input,sourceChallenge});
  const packet=JSON.parse(await fs.readFile(path.join(workspace,'.fleet/packet.json'),'utf8'));
  assert.deepEqual(packet.challenge,sourceChallenge);
  assert.deepEqual(packet.userScope.criteria,input.criteria);assert.deepEqual(packet.userScope.links,input.links);
  assert.equal(packet.userScope.resources,input.resources);
  const tool=createFleetTools(['fleet_get_challenge'],[sourceChallenge])[0];
  const result=await tool.execute('new-source',{id:'99'},undefined,undefined,{} as any);
  assert.deepEqual(JSON.parse((result.content[0] as any).text).challenge,sourceChallenge);
  await assert.rejects(prepareFleetWorkspace({workspace,resourcesRoot,...input,challengeId:'37',sourceChallenge}),/does not match/);
});
test('every recipe skill exists with valid frontmatter and every tool reference resolves', async () => {
  for (const recipe of Object.values(recipes)) {
    for (const tool of recipe.tools) assert.ok(toolRegistry.some(t => t.name===tool),tool);
    for (const skill of recipe.skills) {
      const content=await fs.readFile(path.join(resourcesRoot,'skills',skill,'SKILL.md'),'utf8');
      assert.match(content.replace(/\r\n/g, '\n'),new RegExp(`^---\nname: ${skill}\ndescription: .+\n---`));
    }
  }
});
test('packets retain source criteria separately from proposed acceptance checks and unknowns', () => {
  const packet=createPacket('11');
  assert.equal(packet.dataPolicy,'synthetic-only');
  assert.ok(packet.acceptance.some(c => c.id==='SCH-03'));
  assert.equal(new Set(packet.acceptance.map(c => c.id)).size,packet.acceptance.length);
  assert.ok(packet.unknowns.some(x => x.includes('SFTRM')));
  assert.equal(packet.stages.at(-1)?.id,'deliver');
  assert.throws(() => fleetStagePrompt('nonexistent'),/Unknown/);
});
test('custom packets explicitly preserve user origin instead of claiming an official source', () => {
  const packet=customPacket({title:'My workflow',description:'A local custom workflow',criteria:['Keep revisions']});
  assert.equal(packet.challenge.sourceScope,'user');assert.equal(packet.challenge.sourceUrl,'');
  assert.ok(packet.unknowns.some(s => s.includes('provisional')));
});
test('global workspace tools are inherited while phase tools remain scoped to the task and recipe', async () => {
  for (const challenge of challenges) {
    const packet = createPacket(challenge.id);
    assert.deepEqual(packet.globalTools, ['read', 'write', 'edit', 'bash']);
    assert.deepEqual(packet.stages.map(s => s.id), ['intake', 'research', 'plan', 'build', 'verify', 'review', 'deliver']);
    for (const phase of packet.stages) {
      const effective = toolsForPhase(phase, packet.globalTools);
      assert.equal(new Set(effective).size, effective.length);
      assert.ok(phase.tools.every(name => !globalAgentTools.includes(name)), 'Inherited tools belong at the global level');
      if (phase.owner === 'agent') assert.ok(globalAgentTools.every(name => effective.includes(name)));
      else assert.deepEqual(effective, [], 'Human and host phases must not launch agents');
      for (const skill of phase.skills) await fs.access(path.join(resourcesRoot, 'skills', skill, 'SKILL.md'));
    }
    const byId = (id: string) => packet.stages.find(s => s.id === id)!;
    assert.deepEqual(byId('intake').tools, ['fleet_get_challenge']);
    assert.deepEqual(byId('research').tools, ['fleet_search_evidence']);
    assert.deepEqual(byId('plan').tools, ['fleet_system_design']);
    assert.deepEqual(byId('build').tools, [...packet.recipe.tools, 'fleet_component_progress']);
    assert.deepEqual(byId('verify').tools, [...packet.recipe.tools, 'fleet_component_progress']);
    assert.ok(!byId('plan').skills.includes('fleet-delivery'));
  }
  const packet = createPacket('11'), build = packet.stages.find(s => s.id === 'build')!;
  assert.deepEqual(createFleetTools(toolsForPhase(build)).map(t => t.name), ['fleet_solve_schedule']);
  assert.deepEqual(createFleetTools([]), []);
  // Adding a tool at the global level is inherited; overlapping assignments are deduplicated.
  assert.deepEqual(toolsForPhase(build, ['read', 'fleet_solve_schedule']), ['read', 'fleet_solve_schedule', 'fleet_component_progress']);
});
test('workspace handoff materializes executable primitives, selected skills and immutable source context', async t => {
  const workspace=await temporary(t);
  const args={workspace,resourcesRoot,...toProjectInput('12')};
  const result=await prepareFleetWorkspace(args);
  assert.equal(result.challengeId,'12');assert.ok(result.skillPaths.length>=3);
  const packet=JSON.parse(await fs.readFile(path.join(workspace,'.fleet/packet.json'),'utf8'));
  assert.equal(packet.challenge.id,'12');assert.equal(packet.userScope.title,args.title);
  const module=await import(pathToFileURL(path.join(workspace,'.fleet/toolkit/messages.js')).href);
  assert.equal(module.extractMessages(fixtures.fleet_extract_messages).items.length,3);
  assert.deepEqual(await prepareFleetWorkspace(args),result);
  await assertFleetPacketIntegrity(workspace,result.packetHash);
  await fs.writeFile(path.join(workspace,'.fleet/packet.json'),'modified');
  await assert.rejects(prepareFleetWorkspace(args),/differs/);
  await assert.rejects(assertFleetPacketIntegrity(workspace,result.packetHash),/integrity failed/);
});
test('packet integrity detects added files even if the editable manifest hash is forged', async t => {
  const workspace=await temporary(t);
  const prepared=await prepareFleetWorkspace({workspace,resourcesRoot,...toProjectInput('11')});
  await fs.writeFile(path.join(workspace,'.fleet/new-input.txt'),'changed contract');
  await fs.writeFile(path.join(workspace,'.fleet/manifest.json'),JSON.stringify({hash:prepared.packetHash}));
  await assert.rejects(assertFleetPacketIntegrity(workspace,prepared.packetHash),/integrity failed/);
});
test('workspace handoff rejects a symlink packet and never writes into its destination', async t => {
  const workspace=await temporary(t),elsewhere=await temporary(t);
  // A junction exercises the same linked-directory rejection without requiring
  // Windows developer mode or elevated symlink privileges.
  await fs.symlink(elsewhere,path.join(workspace,'.fleet'),process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(prepareFleetWorkspace({workspace,resourcesRoot,...toProjectInput('36')}),/ordinary directory/);
  assert.deepEqual(await fs.readdir(elsewhere),[]);
});
test('failed preparation leaves no partial packet; incomplete existing packets are preserved', async t => {
  const workspace=await temporary(t);
  await assert.rejects(prepareFleetWorkspace({workspace,resourcesRoot:path.join(workspace,'missing'),...toProjectInput('12')}),/ENOENT/);
  assert.deepEqual(await fs.readdir(workspace),[]);
  await fs.mkdir(path.join(workspace,'.fleet'));
  await fs.writeFile(path.join(workspace,'.fleet/keep.txt'),'user data');
  await assert.rejects(prepareFleetWorkspace({workspace,resourcesRoot,...toProjectInput('12')}),/incomplete/);
  assert.equal(await fs.readFile(path.join(workspace,'.fleet/keep.txt'),'utf8'),'user data');
});
test('Pi tool adapter executes real schemas and labels returned evidence as toolkit-only', async () => {
  const tools=createFleetTools();assert.equal(tools.length,7);
  const parser=tools.find(t => t.name==='fleet_extract_messages')!;
  const result=await parser.execute('call-1',fixtures.fleet_extract_messages,undefined,undefined,{} as any);
  assert.equal((result.details as any).scope,'synthetic-toolkit');
  assert.equal(JSON.parse((result.content[0] as any).text).items.length,3);
  await assert.rejects(parser.execute('call-2',{text:42},undefined,undefined,{} as any),/Invalid input/);
});

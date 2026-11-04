import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { createPacket, customPacket, packetFor } from './planner.js';
import type { Challenge } from './types.js';
import { fixtures } from './fixtures.js';
import { toolRegistry } from './tool-registry.js';
import { compareText } from './tools/validation.js';
import type { BriefContext } from '../shared/types.js';
import { qualityContractGuide } from './quality-contract.js';
import { syntheticDataPhase } from './phases.js';
export { fleetStagePrompt } from './planner.js';

export interface PrepareFleetWorkspaceInput extends BriefContext {
  sourceChallenge?: Challenge;
  workspace:string; challengeId?:string; title:string; description:string; criteria:string[]; resourcesRoot:string;
}
export async function prepareFleetWorkspace(input: PrepareFleetWorkspaceInput) {
  if (input.sourceChallenge && input.sourceChallenge.id !== input.challengeId) throw new Error('The saved Norfolk source does not match this challenge.');
  const packet = input.sourceChallenge ? packetFor(input.sourceChallenge, input.criteria) : input.challengeId ? createPacket(input.challengeId, input.criteria) : customPacket(input);
  const workspace = await fs.realpath(input.workspace);
  const target = path.join(workspace,'.fleet');
  const files = new Map<string,string>();
  const json = (data:unknown) => JSON.stringify(data,null,2)+'\n';
  const hasInputs = !!input.dataInputs?.length;
  files.set('packet.json',json({...packet, dataPolicy: hasInputs ? 'user-provided-or-synthetic' : packet.dataPolicy,
    userScope:{title:input.title,description:input.description,criteria:input.criteria,resources:input.resources ?? '',links:input.links ?? [],
      dataInputs:(input.dataInputs ?? []).map(({name,kind,content}) => ({name,kind,bytes:Buffer.byteLength(content,'utf8')})),
      inputManifest:'inputs/manifest.json'}}));
  files.set('fixtures.json',json({classification:'synthetic',scope:'toolkit-reference-inputs',fixtures}));
  files.set('tool-schemas.json',json(toolRegistry.map(({name,description,parameters}) => ({name,description,inputSchema:parameters}))));
  files.set('quality-contract.md',qualityContractGuide);
  files.set('README.md',`# AppYard challenge packet\n\nSource: ${packet.challenge.sourceUrl || 'User-supplied problem'}\nRecipe: ${packet.recipe.title}\n\nAll fixture data is synthetic. Source requirements and prototype scope are separate in packet.json.\n\nRead the selected skills before implementation. toolkit/ contains dependency-free JavaScript calculation primitives; these do not supply production persistence, transport, identity or complete applications. Do not edit this directory during the run.\n\nToolkit tests are not evidence that the generated application works. Write application tests against its actual code.\n`);
  files.set('toolkit/package.json',json({type:'module',private:true}));
  for (const name of ['validation','messages','scheduling','offline','evidence','readiness']) {
    const source = fileURLToPath(new URL(`./tools/${name}.js`,import.meta.url));
    files.set(`toolkit/${name}.js`,await fs.readFile(source,'utf8'));
  }
  const skills = [...new Set([...packet.stages.flatMap(phase => phase.skills), ...syntheticDataPhase.skills])];
  for (const skill of skills) {
    const content = await fs.readFile(path.join(input.resourcesRoot,'skills',skill,'SKILL.md'),'utf8');
    files.set(`skills/${skill}/SKILL.md`,content);
  }
  const digest = createHash('sha256');
  for (const [name,body] of [...files].sort(([a],[b]) => compareText(a,b))) digest.update(name+'\0'+body+'\0');
  const hash = digest.digest('hex');
  files.set('manifest.json',json({version:1,hash,files:[...files.keys()],challengeId:input.challengeId ?? null}));
  try {
    const existing = await fs.lstat(target);
    if (existing.isSymbolicLink() || !existing.isDirectory()) throw new Error('.fleet must be an ordinary directory.');
    // Idempotency permits an identical preparation; never overwrite changed context.
    for (const [name,body] of files) {
      const resolved = await fs.realpath(path.join(target,name));
      if (!resolved.startsWith(target+path.sep) || await fs.readFile(resolved,'utf8') !== body) throw new Error('Existing .fleet packet differs; start a new run workspace.');
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    // Existing but incomplete packets are not overwritten.
    try { await fs.lstat(target); throw new Error('Existing .fleet packet is incomplete; start a new run workspace.'); }
    catch (check) { if ((check as NodeJS.ErrnoException).code !== 'ENOENT') throw check; }
    const temporary = path.join(workspace,`.fleet-preparing-${randomUUID()}`);
    try {
      await fs.mkdir(temporary,{mode:0o700});
      for (const [name,body] of files) {
        const file = path.join(temporary,name);
        await fs.mkdir(path.dirname(file),{recursive:true});
        await fs.writeFile(file,body,{flag:'wx',mode:0o600});
      }
      await fs.rename(temporary,target);
    } finally { await fs.rm(temporary,{recursive:true,force:true}); }
  }
  return {challengeId:input.challengeId,packetHash:hash,acceptance:packet.acceptance,phases:packet.stages,globalTools:packet.globalTools,skillPaths:skills.map(skill => path.join(target,'skills',skill)),
    context:`AppYard packet: .fleet/packet.json\nRecipe: ${packet.recipe.title}\nSource: ${packet.challenge.sourceUrl || 'User-defined'}\nRead .fleet/README.md and .fleet/quality-contract.md. Use only the skills and tools assigned to the current phase.\nData boundary: ${hasInputs ? 'the inputs explicitly attached to this brief and clearly labeled synthetic examples' : 'synthetic-only; a dedicated data agent prepares use-case fixtures during intake'}. Read inputs/manifest.json; preserve supplied files and validated data artifacts. Respect any stricter source requirement. Toolkit calculations and reference fixtures are not application verification.\nKnown gaps: ${packet.unknowns.join('; ')}`};
}

/** Compare against a hash retained by the host, not a hash chosen by generated code. */
export async function assertFleetPacketIntegrity(workspace: string, expectedHash: string) {
  const base=path.join(await fs.realpath(workspace),'.fleet');
  const digest=createHash('sha256');
  const entries: [string,string][]=[];
  async function walk(dir: string, prefix='') {
    for (const entry of await fs.readdir(dir,{withFileTypes:true})) {
      if (entry.isSymbolicLink()) throw new Error('Fleet packet integrity failed: symbolic link.');
      const name=prefix+entry.name;
      if (entry.isDirectory()) await walk(path.join(dir,entry.name),name+'/');
      else if (entry.isFile() && name!=='manifest.json') entries.push([name,await fs.readFile(path.join(dir,entry.name),'utf8')]);
    }
  }
  if ((await fs.lstat(base)).isSymbolicLink()) throw new Error('Fleet packet integrity failed: symbolic link.');
  await walk(base);
  for (const [name,body] of entries.sort(([a],[b]) => compareText(a,b))) digest.update(name+'\0'+body+'\0');
  if (digest.digest('hex')!==expectedHash) throw new Error('Fleet packet integrity failed: source context, skills or reference toolkit changed. Start a new run with reviewed inputs.');
}

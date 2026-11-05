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
import { solutionContractGuide } from './solution-contract.js';
import { syntheticDataPhase } from './phases.js';
import { prepareFoundationPacket } from './foundations.js';
import { agentHelperGuide } from './agent-helpers.js';
import { generatedApplicationContract } from './application-policy.js';
export { fleetStagePrompt } from './planner.js';

export interface PrepareFleetWorkspaceInput extends BriefContext {
  sourceChallenge?: Challenge;
  workspace:string; challengeId?:string; title:string; description:string; criteria:string[]; resourcesRoot:string;
}

type PacketFile = { body: Buffer; executable: number };
const skillModesFile = 'skill-modes.json';

/** Read complete skill packets without following links or opening special files. */
async function readDirectory(root: string, label: string): Promise<Map<string, PacketFile>> {
  const files = new Map<string, PacketFile>();
  async function walk(directory: string, prefix: string) {
    const stat = await fs.lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`${label}: ordinary directories required; symbolic links are forbidden.`);
    for (const entry of (await fs.readdir(directory)).sort(compareText)) {
      const file = path.join(directory, entry), name = prefix + entry;
      const info = await fs.lstat(file);
      if (info.isDirectory()) await walk(file, name + '/');
      else if (info.isFile()) files.set(name, { body: await fs.readFile(file), executable: info.mode & 0o111 });
      else throw new Error(`${label}: only ordinary files and directories are supported; symbolic links are forbidden: ${name}`);
    }
  }
  await walk(root, '');
  return files;
}

/** Preserve the v1 text-packet digest while hashing binary assets without UTF-8 conversion. */
function packetHash(files: Iterable<[string, string | Buffer]>) {
  const digest = createHash('sha256');
  for (const [name, body] of [...files].sort(([a], [b]) => compareText(a, b))) digest.update(name + '\0').update(body).update('\0');
  return digest.digest('hex');
}

export async function prepareFleetWorkspace(input: PrepareFleetWorkspaceInput) {
  if (input.sourceChallenge && input.sourceChallenge.id !== input.challengeId) throw new Error('The saved Norfolk source does not match this challenge.');
  const packet = input.sourceChallenge ? packetFor(input.sourceChallenge, input.criteria, input.description) : input.challengeId ? createPacket(input.challengeId, input.criteria, input.description) : customPacket(input);
  const workspace = await fs.realpath(input.workspace);
  const target = path.join(workspace,'.fleet');
  const files = new Map<string,string | Buffer>();
  const executable = new Map<string, number>();
  const json = (data:unknown) => JSON.stringify(data,null,2)+'\n';
  const hasInputs = !!(input.dataInputs?.length || input.connectedData?.length);
  files.set('packet.json',json({...packet, dataPolicy: hasInputs ? 'user-provided-or-synthetic' : packet.dataPolicy,
    userScope:{title:input.title,description:input.description,criteria:input.criteria,inputs:input.inputs ?? '',outputs:input.outputs ?? '',resources:input.resources ?? '',links:input.links ?? [],
      dataInputs:(input.dataInputs ?? []).map(({name,kind,content}) => ({name,kind,bytes:Buffer.byteLength(content,'utf8')})),
      ...(input.connectedData?.length ? { connectedData: input.connectedData.map(({id,digest}) => ({id,digest})) } : {}),
      inputManifest:'inputs/manifest.json'}}));
  files.set('fixtures.json',json({classification:'synthetic',scope:'toolkit-reference-inputs',fixtures}));
  files.set('tool-schemas.json',json(toolRegistry.map(({name,description,parameters}) => ({name,description,inputSchema:parameters}))));
  files.set('quality-contract.md',qualityContractGuide);
  files.set('solution-contract.md',solutionContractGuide);
  files.set('helper-guide.md',agentHelperGuide);
  for (const [name, body] of await prepareFoundationPacket(packet.recipe.id, input.resourcesRoot)) files.set(name, body);
  files.set('README.md',`# AppYard challenge packet\n\nSource: ${packet.challenge.sourceUrl || 'User-supplied problem'}\nRecipe: ${packet.recipe.title}\n\nToolkit reference fixtures are synthetic test inputs. Source requirements and the planned application scope are separate in packet.json.\n\n${generatedApplicationContract}\n\nRead the selected skills before implementation. toolkit/ contains dependency-free JavaScript calculation primitives; these do not supply production persistence, transport, identity or complete applications. Do not edit this directory during the run.\n\nToolkit tests are not evidence that the generated application works. Write application tests against its actual code.\n`);
  files.set('toolkit/package.json',json({type:'module',private:true}));
  for (const name of ['validation','messages','scheduling','offline','evidence','readiness']) {
    const source = fileURLToPath(new URL(`./tools/${name}.js`,import.meta.url));
    files.set(`toolkit/${name}.js`,await fs.readFile(source,'utf8'));
  }
  const skills = [...new Set([...packet.stages.flatMap(phase => phase.skills), ...syntheticDataPhase.skills])];
  const skillsRoot = path.join(input.resourcesRoot, 'skills');
  const rootStat = await fs.lstat(skillsRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('Skill root must be an ordinary directory without symbolic links.');
  for (const skill of skills) {
    const contents = await readDirectory(path.join(skillsRoot, skill), `Skill ${skill}`);
    if (!contents.has('SKILL.md')) throw new Error(`Skill ${skill} is missing SKILL.md.`);
    for (const [relative, file] of contents) {
      const name = `skills/${skill}/${relative}`;
      files.set(name, file.body);
      if (file.executable) executable.set(name, file.executable);
    }
  }
  // Executable bits are covered by the trusted content hash, not the editable manifest.
  // Omit this file for text-only v1 packets so their bytes and digest remain unchanged.
  if (executable.size) files.set(skillModesFile, json(Object.fromEntries([...executable].sort(([a], [b]) => compareText(a, b)))));
  const hash = packetHash(files);
  files.set('manifest.json',json({version:1,hash,files:[...files.keys()],challengeId:input.challengeId ?? null}));
  try {
    const existing = await fs.lstat(target);
    if (existing.isSymbolicLink() || !existing.isDirectory()) throw new Error('.fleet must be an ordinary directory.');
    // Idempotency permits an identical preparation; never overwrite changed context.
    const current = await readDirectory(target, 'Existing .fleet packet');
    for (const [name,body] of files) {
      const file = current.get(name);
      if (!file) throw new Error('Existing .fleet packet is incomplete; start a new run workspace.');
      if (!file.body.equals(Buffer.from(body)) || file.executable !== (executable.get(name) ?? 0)) throw new Error('Existing .fleet packet differs; start a new run workspace.');
    }
    if (current.size !== files.size) throw new Error('Existing .fleet packet differs; start a new run workspace.');
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
        const mode = 0o600 | (executable.get(name) ?? 0);
        await fs.writeFile(file,body,{flag:'wx',mode});
        if (mode !== 0o600) await fs.chmod(file, mode);
      }
      await fs.rename(temporary,target);
    } finally { await fs.rm(temporary,{recursive:true,force:true}); }
  }
  return {challengeId:input.challengeId,packetHash:hash,acceptance:packet.acceptance,phases:packet.stages,globalTools:packet.globalTools,skillPaths:skills.map(skill => path.join(target,'skills',skill)),
    context:`AppYard packet: .fleet/packet.json\nRecipe: ${packet.recipe.title}\nSource: ${packet.challenge.sourceUrl || 'User-defined'}\nRead .fleet/README.md and .fleet/quality-contract.md. Use only the skills and tools assigned to the current phase.\nReusable foundations: .fleet/foundation-catalog.json and .fleet/foundation-guide.md. The host copies the chosen versioned foundation before implementation; extend its shared backend instead of rebuilding setup.\nBuild-time data boundary: ${hasInputs ? 'the inputs explicitly attached to this brief and generated test fixtures' : 'generated test fixtures only; a dedicated data agent prepares use-case fixtures during intake'}. Read inputs/manifest.json; preserve supplied files and validated data artifacts. Keep fixture provenance in developer evidence; fixtures are not default application records. Respect any stricter source requirement. Toolkit calculations and reference fixtures are not application verification.\nBuild a real application with plugin and connector interfaces the user implements and configures after the build. Read the Generated application contract in .fleet/README.md.\nKnown gaps: ${packet.unknowns.join('; ')}`};
}

/** Compare against a hash retained by the host, not a hash chosen by generated code. */
export async function assertFleetPacketIntegrity(workspace: string, expectedHash: string) {
  const base=path.join(await fs.realpath(workspace),'.fleet');
  const files = await readDirectory(base, 'Fleet packet integrity failed');
  const entries = [...files].filter(([name]) => name !== 'manifest.json');
  if (packetHash(entries.map(([name, file]) => [name, file.body])) !== expectedHash) throw new Error('Fleet packet integrity failed: source context, skills or reference toolkit changed. Start a new run with reviewed inputs.');
  const modes: Record<string, number> = files.has(skillModesFile) ? JSON.parse(files.get(skillModesFile)!.body.toString('utf8')) : {};
  for (const [name, file] of files) {
    if (file.executable !== (modes[name] ?? 0)) throw new Error('Fleet packet integrity failed: executable permissions changed: ' + name);
  }
}

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { challenges, toProjectInput } from './catalog.js';
import { createPacket } from './planner.js';
import { prepareFleetWorkspace } from './integration.js';
import { toolRegistry, invokeFleetTool } from './tool-registry.js';
import { fixtures } from './fixtures.js';
import { runToolkitDemo } from './evaluate.js';
import { foundationCatalog, recommendFoundation, materializeFoundation, foundationRuntime, validateFoundationPlan } from './foundations.js';

const resourcesRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [command,...args]=process.argv.slice(2);
const print=(value:unknown) => process.stdout.write(JSON.stringify(value,null,2)+'\n');
function option(name:string): string|undefined {
  const index=args.indexOf(name);
  if (index===-1) return undefined;
  if (!args[index+1] || args[index+1].startsWith('--')) throw new Error(`Missing value for ${name}`);
  return args[index+1];
}
async function main() {
  if (!command || command==='help' || command==='--help') {
    process.stdout.write(`AppYard challenge pipeline\n\n  catalog                         List source-linked challenges\n  plan <id> [--out <directory>]    Print a packet or prepare an isolated workspace\n  foundations                     List bundled versioned application starters\n  scaffold <id> --out <new-dir>    Copy the recipe-selected starter without model calls\n    [--template node-service|python-service]\n  tools                           List tool schemas\n  fixture <tool>                  Print a synthetic input\n  tool <tool> --input <json-file>  Run a validated local tool\n  demo [--out <new-directory>]    Run reproducible toolkit scenarios without a model\n\nDesktop Pi and Codex runs use the same packets, selected skills, tools and foundations.\n`);return;
  }
  if (command==='catalog') {print(challenges);return;}
  if (command==='foundations') {print(foundationCatalog);return;}
  if (command==='scaffold') {
    const packet = createPacket(args[0]), out = option('--out');
    if (!out) throw new Error('scaffold requires --out <new-directory>.');
    const recommended = recommendFoundation(packet.recipe.id), override = option('--template');
    if (override && !['node-service', 'python-service'].includes(override)) throw new Error('Unknown bundled template. Run foundations to list available starters.');
    const selection = validateFoundationPlan(override ? { ...recommended, templateId: override,
      computePack: override === 'python-service' ? 'custom' : recommended.computePack, reason: `Explicit CLI template choice for the ${packet.recipe.id} specialist.` } : recommended);
    const workspace = path.resolve(out);
    await fs.mkdir(path.dirname(workspace), { recursive: true });
    await fs.mkdir(workspace, { mode: 0o700 }); // Deliberately refuse every existing destination.
    await fs.writeFile(path.join(workspace, 'foundation-plan.json'), JSON.stringify(selection, null, 2) + '\n', { flag: 'wx' });
    const snapshot = await materializeFoundation({ workspace, resourcesRoot, selection });
    const runtime = foundationRuntime(selection);
    await fs.writeFile(path.join(workspace, 'runtime-manifest.json'), JSON.stringify(runtime, null, 2) + '\n', { flag: 'wx' });
    print({ workspace, selection, copiedFiles: snapshot.files, copiedBytes: snapshot.bytes, templateHash: snapshot.templateHash,
      start: runtime.command!.runtime === 'node' ? 'node server.mjs' : 'python3 server.py',
      scope: 'Starter foundation only; extend the computation and UI, then run application acceptance tests.' });
    return;
  }
  if (command==='tools') {print(toolRegistry.map(({name,description,parameters}) => ({name,description,inputSchema:parameters})));return;}
  if (command==='fixture') {
    if (!Object.hasOwn(fixtures,args[0])) throw new Error('Unknown fixture tool. Run tools to list available names.');
    print(fixtures[args[0] as keyof typeof fixtures]);return;
  }
  if (command==='tool') {
    const input=option('--input');if (!input) throw new Error('tool requires --input <json-file>.');
    const stat=await fs.stat(input);if (stat.size>2_000_000) throw new Error('Input file exceeds 2 MB.');
    print(invokeFleetTool(args[0],JSON.parse(await fs.readFile(input,'utf8'))));return;
  }
  if (command==='plan') {
    const packet=createPacket(args[0]);const out=option('--out');
    if (!out) {print(packet);return;}
    const workspace=path.resolve(out);await fs.mkdir(workspace,{recursive:true,mode:0o700});
    const prepared=await prepareFleetWorkspace({workspace,resourcesRoot,...toProjectInput(args[0])});
    print({workspace,packet:path.join(workspace,'.fleet/packet.json'),...prepared});return;
  }
  if (command==='demo') {
    const report=runToolkitDemo();const out=option('--out');
    if (out) {
      const directory=path.resolve(out);await fs.mkdir(directory,{recursive:true});
      await fs.writeFile(path.join(directory,'toolkit-report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
      print({report:path.join(directory,'toolkit-report.json'),scope:report.scope,passed:report.passed,failed:report.failed,total:report.total});
    } else print(report);
    if (report.failed) process.exitCode=1;return;
  }
  throw new Error(`Unknown command: ${command}. Run help.`);
}
main().catch(error => {process.stderr.write((error instanceof Error ? error.message : String(error))+'\n');process.exitCode=1;});

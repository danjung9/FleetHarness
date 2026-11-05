import { promises as fs } from 'node:fs';
import path from 'node:path';
import { newProject, sourceHash } from '../dist-electron/electron/storage.js';
import { reportHash } from '../dist-electron/electron/delivery.js';
import { stageExecutable } from '../dist-electron/electron/executable.js';

// Synthetic approval metadata exercises delivery only, without model calls or a review UI.
export async function serviceAppFixture(root) {
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(path.join(workspace, '.fleet'), { recursive: true });
  const runtime = { profile: 'service', files: ['server.cjs', 'worker.cjs', 'page.html'], requiredEnv: [],
    command: { runtime: 'node', entrypoint: 'server.cjs', args: [] }, healthPath: '/ready', invokePath: '/invoke' };
  const files = {
    'solution-contract.json': JSON.stringify({ schemaVersion: 1, objective: 'Save a synthetic local note.', runtime,
      capabilities: [{ id: 'save', kind: 'stateful', description: 'Retain a note locally.', criterionIds: ['R1'], required: true, evaluationIds: ['save-cases'] }] }),
    '.fleet/packet.json': JSON.stringify({ acceptance: [{ id: 'R1', requirement: 'Save a synthetic local note.', method: 'automated', scenario: 'Reopen a saved note.' }] }),
    // Legacy fixture evidence expects this workspace file. It is deliberately not shipped.
    'index.html': '<h1>This is not the service page</h1>',
    'page.html': `<!doctype html><html><head><title>Synthetic service notebook</title></head><body>
<h1>Synthetic service notebook</h1><label>Note <input id="note"></label><button>Save note</button><output></output><a href="/again">Open notebook</a>
<script>const input=document.querySelector('input'),output=document.querySelector('output');
input.value=localStorage.getItem('note')||'';output.textContent=input.value;
document.querySelector('button').onclick=()=>{localStorage.setItem('note',input.value);output.textContent=input.value};</script></body></html>`,
    'worker.cjs': `const fs=require('node:fs');setInterval(()=>fs.appendFileSync('heartbeat.txt','tick\\n'),50);`,
    'server.cjs': `const http=require('node:http'),fs=require('node:fs'),{spawn}=require('node:child_process');
const child=spawn(process.execPath,['worker.cjs'],{env:process.env,stdio:'ignore',detached:process.platform!=='win32'});
fs.writeFileSync('pids.json',JSON.stringify({parent:process.pid,child:child.pid,cwd:process.cwd(),data:process.env.APPYARD_USER_DATA}));
if(fs.existsSync('fail-start'))process.exit(2);
const server=http.createServer((request,response)=>{
  if(request.url==='/ready'){response.end('ready');return}
  if(request.url==='/invoke'){response.setHeader('content-type','application/json');response.end('true');return}
  if(request.url==='/'||request.url==='/again'){response.setHeader('content-type','text/html');response.end(fs.readFileSync('page.html'));return}
  response.writeHead(404);response.end('Not found');
});
server.listen(Number(process.env.PORT),'0.0.0.0',()=>fs.writeFileSync('bound-address.json',JSON.stringify(server.address())));
`
  };
  for (const [relative, content] of Object.entries(files)) await fs.writeFile(path.join(workspace, relative), content);
  const project = { ...newProject({ title: 'Synthetic service notebook', description: 'An offline synthetic service packaging check.', criteria: ['Save a note.'] }),
    workspace, runtimeProfile: 'service', status: 'approved', approvedAt: new Date().toISOString(), runId: 'synthetic-delivery-fixture' };
  project.processScope = { runId: project.runId, marker: 'synthetic-delivery-fixture', cleanup: 'confirmed' };
  project.report = { exitCode: 0, passed: 1, total: 1, failed: 0, skipped: 0, sourceHash: await sourceHash(workspace), independentJudge: { stage: 'verify', verdict: 'SATISFACTORY', gaps: [], attempts: [], repairs: 0, repairLimitReached: false, durationMs: 0, evaluatorRetries: 0 } };
  project.stages.find(stage => stage.id === 'review').status = 'complete';
  project.verification = { runId: project.runId, reportHash: reportHash(project.report) };
  project.approval = { runId: project.runId, sourceHash: project.report.sourceHash, reportHash: project.verification.reportHash, approvedAt: project.approvedAt, feedback: project.feedback };
  const staged = await stageExecutable(project, root);
  return { staged, project, runtime };
}

export function packagedPaths(extracted, name) {
  const app = process.platform === 'darwin' ? path.join(extracted, name + '.app', 'Contents') : extracted;
  return { binary: process.platform === 'darwin' ? path.join(app, 'MacOS', name) : path.join(app, name + (process.platform === 'win32' ? '.exe' : '')),
    source: path.join(app, process.platform === 'darwin' ? 'Resources' : 'resources', 'app') };
}

export async function assertProcessesGone(assert, pids) {
  for (const pid of [pids.parent, pids.child]) {
    assert.ok(Number.isInteger(pid) && pid > 1);
    const end = Date.now() + 5000;
    let alive;
    do {
      try { process.kill(pid, 0); alive = true; }
      catch (error) { if (error.code !== 'ESRCH') throw error; alive = false; }
      if (alive) await new Promise(resolve => setTimeout(resolve, 50));
    } while (alive && Date.now() < end);
    assert.equal(alive, false, 'Owned process survived shutdown: ' + pid);
  }
}

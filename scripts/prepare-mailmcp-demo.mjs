import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const demoRoot = path.join(repositoryRoot, 'output', 'mailmcp-demo');
export const demoBundle = path.join(demoRoot, 'bundle');
export const upstream = {
  repository: 'https://github.com/shourovsahaaa/mailmcp',
  commit: '82abd7f68d964326419df16cd9c52f3a91bd79b3',
};
const projectId = 'mailmcp-demo';
const runId = 'mailmcp-demo-run-001';
const sourceRoot = path.join(demoRoot, 'source');
const evidenceRoot = path.join(demoRoot, 'evidence');
const upstreamLogName = 'upstream-tests-normalized-tmp.log';

const writeJSON = (file, value) => fs.writeFile(file, JSON.stringify(value, null, 2) + '\n');
const sha256 = value => createHash('sha256').update(value).digest('hex');

async function exists(file) {
  try { await fs.access(file); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function trackedSource() {
  if (!(await exists(path.join(sourceRoot, '.git')))) {
    await fs.mkdir(demoRoot, { recursive: true });
    await execute('git', ['clone', '--no-checkout', upstream.repository + '.git', sourceRoot]);
    await execute('git', ['checkout', '--detach', upstream.commit], { cwd: sourceRoot });
  }
  const { stdout: revision } = await execute('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot });
  if (revision.trim() !== upstream.commit) throw new Error(`MailMCP source must be at ${upstream.commit}.`);
  const { stdout: changes } = await execute('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: sourceRoot });
  if (changes.trim()) throw new Error('MailMCP has changed tracked files. Preserve the pinned upstream source before preparing the demo.');
  const { stdout } = await execute('git', ['ls-files', '-z'], { cwd: sourceRoot, maxBuffer: 4 * 1024 * 1024 });
  const files = stdout.split('\0').filter(Boolean).sort();
  if (!files.includes('app/server.py') || !files.includes('app/static/index.html')) throw new Error('MailMCP source inventory is incomplete.');
  for (const file of files) {
    if (path.isAbsolute(file) || file.split('/').some(part => ['..', '.git', '.venv', '__pycache__'].includes(part))) {
      throw new Error(`Unsupported upstream source path: ${file}`);
    }
    if (!(await fs.lstat(path.join(sourceRoot, file))).isFile()) throw new Error(`Upstream source must be an ordinary file: ${file}`);
  }
  return files;
}

async function readUpstreamReport() {
  const file = path.join(evidenceRoot, upstreamLogName);
  const output = await fs.readFile(file, 'utf8');
  const summary = /\bRan (\d+) tests in ([\d.]+)s\s+OK(?: \(skipped=(\d+)\))?\s*$/.exec(output);
  if (!summary) throw new Error(`Expected a successful captured unittest run in ${file}.`);
  const total = Number(summary[1]);
  const skipped = Number(summary[3] ?? 0);
  if (total !== 204 || skipped !== 8) throw new Error('The pinned MailMCP evidence should contain 204 tests with 8 Windows-only skips; inspect the source and evidence before updating the fixture.');
  const modules = new Map();
  for (const match of output.matchAll(/^test_\S+ \((test_\w+)\./gm)) {
    const file = `source/tests/${match[1]}.py`;
    modules.set(file, (modules.get(file) ?? 0) + 1);
  }
  return {
    time: (await fs.stat(file)).mtime.toISOString(),
    command: 'python -m unittest discover -s tests -v',
    exitCode: 0,
    passed: total - skipped,
    failed: 0,
    skipped,
    total,
    output,
    durationMs: Math.round(Number(summary[2]) * 1000),
    sourceHash: '',
    registeredTests: [...modules].map(([file, tests]) => ({ file, tests })),
    provenance: {
      runner: 'Python 3.12 unittest', args: ['-m', 'unittest', 'discover', '-s', 'tests', '-v'],
      cwd: 'source', environment: { TMPDIR: 'resolved local temporary directory' },
    },
  };
}

async function readDemoReport(fallback) {
  const file = path.join(evidenceRoot, 'demo-validation.json');
  if (!(await exists(file))) return { report: fallback, localValidation: false };
  const report = JSON.parse(await fs.readFile(file, 'utf8'));
  if (report.exitCode !== 0 || !Number.isSafeInteger(report.total) || report.total < 1
    || report.passed !== report.total || report.failed !== 0 || report.skipped !== 0
    || typeof report.command !== 'string' || !report.command || typeof report.output !== 'string'
    || !Number.isFinite(report.durationMs) || report.durationMs < 0 || !Number.isFinite(Date.parse(report.time))) {
    throw new Error('The captured local demo validation is incomplete or failed. Preserve its failure and repair the demo before packaging.');
  }
  return { report: { ...report, sourceHash: '' }, localValidation: true };
}

function simulatedActivity(endTime, localValidation, upstreamReport, localReport) {
  const logs = [];
  const start = Date.parse(endTime) - 26 * 60 * 1000;
  let tick = 0;
  const add = (stage, kind, text, tool) => {
    const log = { id: `demo-log-${String(logs.length + 1).padStart(3, '0')}`, time: new Date(start + tick * 1000).toISOString(), stage, kind, text };
    if (tool) log.tool = tool;
    logs.push(log);
    tick += 19;
  };
  const message = (stage, text) => add(stage, 'text', text);
  const tool = (stage, name, target, input, output) => {
    const callId = `demo-call-${logs.length + 1}`;
    add(stage, 'tool', `${name}\n${JSON.stringify(input, null, 2)}`, { callId, name, phase: 'start', target });
    tick += 7;
    add(stage, 'tool', `${name} completed\n${JSON.stringify({ content: [{ type: 'text', text: output }] })}`, { callId, name, phase: 'complete', target });
  };

  add('intake', 'info', 'Preloaded simulated agent history for this installed AppYard demo. The source is imported from the public MailMCP repository. No model calls or token usage are claimed. Actual local checks are recorded separately in evidence/.');
  message('intake', 'I’ll turn the brief into a reviewable mail workspace: browse the inbox, search locally, explain priority, inspect related messages, prepare a brief, and edit a reply draft. The demo will use fictional mail and keep native Outlook handoff outside the macOS preview.');
  tool('intake', 'read', 'requirements.md', { path: 'requirements.md' }, 'Seven acceptance criteria captured: inbox, search, priority rationale, related context, local brief, editable reply, and explicit integration boundaries.');
  tool('intake', 'write', 'scope.md', { path: 'scope.md', summary: 'User tasks, supplied repository, synthetic data, and platform limits' }, 'Scope prepared for the walkthrough. Repository provenance remains visible and review is required before any delivery.');
  message('intake', 'The main workflow is a three-pane mail workspace. Success is a reviewer moving from an important message to its context and an editable response without leaving the app.');
  add('intake', 'info', 'Simulated intake phase complete · scope.md and requirements.md.');

  add('research', 'info', 'Simulated research agent · this narrative illustrates how AppYard presents repository assessment.');
  tool('research', 'read', 'source/README.md', { path: 'source/README.md' }, `Pinned upstream source: ${upstream.repository}/tree/${upstream.commit}. Python/FastAPI backend; local HTML, CSS, and JavaScript frontend; no frontend build step.`);
  tool('research', 'read', 'source/app/server.py', { path: 'source/app/server.py' }, 'The upstream API already provides mailbox bootstrap, message search/detail, local briefs, drafts, import, and Outlook handoff boundaries. Its supported memory-only store allows explicit development use.');
  tool('research', 'read', 'source/app/workspace.py', { path: 'source/app/workspace.py' }, 'Priority uses visible local signals. Related-context selection is bounded. Draft recipients and attachments stay explicit. Fictional demo records are kept separate from real-message AI context.');
  message('research', 'Reuse the supplied implementation as-is and add an AppYard demo launcher around it. The macOS preview will use the upstream fictional mailbox in memory. Windows DPAPI and classic Outlook COM stay documented as platform-specific integrations.');
  add('research', 'info', 'Simulated research phase complete · research.md maps source modules and limitations.');

  add('plan', 'info', 'Simulated planning agent · the saved plan describes this imported-source demonstration.');
  tool('plan', 'write', 'plan.md', { path: 'plan.md', sections: ['inbox', 'search', 'context', 'brief', 'draft', 'verification'] }, 'Walkthrough starts with the preloaded inbox, then opens a priority message, searches Cedar, inspects related context, and creates an editable reply.');
  tool('plan', 'write', 'system-design.json', { path: 'system-design.json' }, 'Mapped the mail interface, local HTTP API, workspace logic, memory cache, and external integration boundaries to upstream source files.');
  tool('plan', 'write', 'test-matrix.md', { path: 'test-matrix.md' }, 'Separated local demo workflow checks from upstream unit tests and Windows-only coverage. No simulated activity counts as verification.');
  message('plan', 'Package the real Python service with its own runtime so the installed app needs no terminal setup. Start it on a loopback port for the AppYard preview and stop it when the demo closes.');
  add('plan', 'info', 'Simulated planning phase complete · plan.md, system-design.json, and test-matrix.md.');

  add('build', 'info', 'Simulated implementation agent · source files below are imported upstream artifacts, not claimed newly generated code.');
  tool('build', 'read', 'source/app/static/index.html', { path: 'source/app/static/index.html' }, 'Mail workspace shell includes folder navigation, message list, reading pane, related context, brief, and draft controls.');
  tool('build', 'read', 'source/app/static/app.js', { path: 'source/app/static/app.js' }, 'Frontend routes UI actions through the local API. Search, local read/flag state, message details, and draft editing use the imported upstream implementation.');
  tool('build', 'read', 'source/app/demo.py', { path: 'source/app/demo.py' }, 'Fictional Cedar/Evergreen mailbox includes messages, threads, contacts, and illustrative attachments. No user mailbox is connected.');
  tool('build', 'write', 'README.md', { path: 'README.md' }, 'Added an installed-demo guide with repository attribution, the walkthrough, memory-only reset behavior, and unsupported Windows/GenAI integrations.');
  message('build', 'The application files are ready for the preview. The launcher serves the real MailMCP frontend and API; the preloaded AppYard history is illustrative. Local data can be browsed and edited, while live GenAI requests are rejected by the demo transport.');
  add('build', 'info', 'Simulated implementation phase complete · imported source and runtime wrapper are packaged for review.');

  add('verify', 'info', 'Simulated verification narrative. The test numbers and raw logs referenced here come from separate real local runs; the tool-event timing is illustrative.');
  tool('verify', 'read', `evidence/${upstreamLogName}`, { path: `evidence/${upstreamLogName}` }, `Actual captured upstream unittest result: ${upstreamReport.passed} passed, ${upstreamReport.skipped} skipped, ${upstreamReport.failed} failed (${upstreamReport.total} total). Skips require Windows. The upstream report is not an all-platform release claim.`);
  if (localValidation) {
    tool('verify', 'read', 'evidence/demo-validation.json', { path: 'evidence/demo-validation.json' }, `Actual captured local demo workflow check: ${localReport.passed} passed, ${localReport.failed} failed, ${localReport.skipped} skipped. Command: ${localReport.command}`);
  }
  tool('verify', 'write', 'verification.md', { path: 'verification.md' }, 'Recorded real evidence, explicit limitations, and the distinction between this demo workflow and the complete upstream Windows application.');
  message('verify', localValidation
    ? 'The local demo checks are green. The upstream suite separately reports eight Windows-only skips. Please try the preview and inspect the evidence; no human approval or delivery has been pre-recorded.'
    : 'The captured upstream checks completed with no failures and eight Windows-only skips. Inspect those limits in the evidence before reviewing the preview. No human approval or delivery has been pre-recorded.');
  add('verify', 'info', 'Simulated verification phase complete · real test output is available in Files and Review.');
  add('review', 'info', 'Ready for your review. This demo has no recorded approval, live model session, or production deployment.');
  return logs;
}

function architecture(time) {
  const definition = {
    title: 'MailMCP · GenAI Outlook',
    description: 'Imported upstream architecture, displayed as a preloaded AppYard demo. The installed macOS preview uses fictional mail and memory-only storage.',
    components: [
      { id: 'interface', label: 'Mail workspace', kind: 'interface', description: 'Inbox, folders, search, message details, brief, and reply editing.', files: ['source/app/static/index.html', 'source/app/static/styles.css', 'source/app/static/app.js'] },
      { id: 'api', label: 'Local API', kind: 'logic', description: 'FastAPI routes on a loopback-only service.', files: ['source/app/server.py', 'source/app/main.py'] },
      { id: 'workspace', label: 'Context and drafts', kind: 'logic', description: 'Priority signals, related messages, local briefs, and editable drafts.', files: ['source/app/workspace.py', 'source/app/signatures.py'] },
      { id: 'cache', label: 'Mailbox cache', kind: 'data', description: 'Memory-only demo cache and search; upstream encrypted persistence needs Windows.', files: ['source/app/cache.py', 'source/app/demo.py', 'source/app/importers.py'] },
      { id: 'integrations', label: 'Outlook and GenAI', kind: 'integration', description: 'Upstream Windows and service boundaries. Native handoff and live inference are unavailable in this offline macOS demonstration.', files: ['source/app/outlook.py', 'source/app/genai.py'] },
    ],
    connections: [
      { from: 'interface', to: 'api', label: 'Local HTTP requests' },
      { from: 'api', to: 'workspace', label: 'Mail workflows' },
      { from: 'workspace', to: 'cache', label: 'Search and context' },
      { from: 'api', to: 'cache', label: 'Mailbox state' },
      { from: 'workspace', to: 'integrations', label: 'Explicit integration boundaries' },
    ],
  };
  return { definition, updatedAt: time, progress: Object.fromEntries(definition.components.map(component => [component.id, {
    status: component.id === 'integrations' ? 'blocked' : 'generated',
    detail: component.id === 'integrations' ? 'Windows Outlook/DPAPI and live GenAI are outside this offline macOS demo.' : 'Imported from the pinned MailMCP repository; available in the local demo.',
    updatedAt: time,
  }])) };
}

function documents(report, upstreamReport, localValidation) {
  const provenance = `Source: ${upstream.repository}\nPinned commit: ${upstream.commit}\n`;
  const distinction = 'The AppYard agent activity is preloaded and simulated. It illustrates a completed project walkthrough; it is not a transcript of agents writing the upstream repository. The application source is imported from the pinned public MailMCP repository, and the verification output is from actual local checks.';
  const checks = localValidation
    ? `Local demo workflow: **${report.passed} passed, ${report.failed} failed, ${report.skipped} skipped**.\n\nCommand: \`${report.command}\`. This is the report shown in AppYard Review.\n\n`
    : 'No separate local demo workflow report was supplied. AppYard Review displays the upstream report, including its Windows-only skips.\n\n';
  const upstreamChecks = `Upstream suite: **${upstreamReport.passed} passed, ${upstreamReport.failed} failed, ${upstreamReport.skipped} skipped, ${upstreamReport.total} total**.\n\nThe eight skipped checks depend on Windows facilities. They remain explicitly skipped; the local demo result does not replace or waive them. Read \`evidence/${upstreamLogName}\` and \`evidence/upstream-test-report.json\` for the captured result.\n`;
  const limits = '- The demonstration is local, offline, and memory-only. Quit AppYard Demo to reset the fictional mailbox and draft edits.\n- Native classic Outlook handoff and Windows DPAPI persistence are not available on macOS.\n- Live GenAI connections are disabled in the demo launcher; brief/draft editing remains local, and AI generation requires a separately configured upstream installation.\n- Fictional attachment names do not represent downloadable source files.\n- No human approval, deployment, production readiness, or real mailbox connection is recorded.\n';
  return {
    'DEMO.md': `# AppYard Demo · MailMCP\n\n${distinction}\n\n${provenance}\n## Try the installed demo\n\n1. Open the MailMCP project in AppYard Demo.\n2. Choose **View app** to open the working MailMCP preview.\n3. Inspect the fictional inbox, search for **Cedar**, open a message, and view its priority reasons and related context.\n4. Read the local brief and create or edit a reply draft. Changes stay in this demonstration process.\n5. Inspect Build/Activity for the simulated agent narrative and Review/Files for the actual evidence.\n\n## Verification\n\n${checks}${upstreamChecks}\n## Boundaries\n\n${limits}\n## Reset\n\nQuit and reopen AppYard Demo to restore the fictional mailbox. To restore the preloaded project itself, quit the app, move its isolated \`~/Library/Application Support/fleetharness-mailmcp-demo\` profile folder to a backup location, and reopen it. The regular AppYard profile is separate.\n\n## Source\n\nThe \`source/\` directory contains only tracked files from the pinned upstream commit, without Git metadata, virtual environments, or caches. Read \`source/README.md\` for the upstream application's full setup and limitations. \`repository-info.json\` records file hashes.\n`,
    'README.md': `# MailMCP · GenAI Outlook\n\nAn installed AppYard walkthrough of the supplied MailMCP repository, with a real local preview and a preloaded simulated build history.\n\n${distinction}\n\n${provenance}\n## Walkthrough\n\nOpen **View app**, browse the fictional inbox, search for **Cedar**, open a message, inspect related context and its local brief, then create and edit a draft. The upstream local frontend and FastAPI backend handle these actions. No API key or system Python installation is needed for the bundled preview.\n\n## What was checked\n\n${checks}${upstreamChecks}\n## Limitations\n\n${limits}\nSee \`DEMO.md\` for provenance and reset instructions, \`verification.md\` for evidence, and \`source/README.md\` for the original application's Windows installation guide.\n`,
    'requirements.md': `# Demo project requirements\n\n${provenance}\nBuild an inspectable AppYard demonstration of the existing MailMCP mail workspace.\n\n1. Browse the fictional inbox and folders through the real local application.\n2. Search cached mail locally and open the matching message.\n3. Explain message priority using visible local signals.\n4. Show bounded related-message context alongside the selected message.\n5. Read the local brief and retain source context.\n6. Create and edit a reply draft without sending mail.\n7. Keep simulated activity, real verification, and unsupported integrations explicit.\n\n${distinction}\n`,
    'scope.md': `# Scope\n\nThis installed demonstration imports the existing MailMCP application and presents its working local mail workflow inside AppYard. The user requested preloaded dummy agent activity.\n\n${provenance}\nThe audience is a reviewer trying the inbox-to-reply workflow. Inputs are the upstream fictional mailbox and the reviewer’s local draft edits. Outputs are message context, a local brief, editable drafts, and inspectable verification evidence.\n\n${distinction}\n\n## Outside the demo\n\n${limits}`,
    'research.md': `# Repository assessment\n\n${provenance}\nMailMCP already provides the requested workflow. The demo packages that implementation rather than asserting it was generated during the simulated history.\n\n| Module | Responsibility |\n| --- | --- |\n| source/app/static/ | Local mail interface and interactions |\n| source/app/server.py | FastAPI routes and startup |\n| source/app/workspace.py | Priority, context, briefs, and drafts |\n| source/app/cache.py | Local cache, retention, and search |\n| source/app/demo.py | Explicit fictional mailbox |\n| source/app/outlook.py | Windows classic Outlook integration |\n| source/app/genai.py | Upstream inference gateway client |\n\nThe wrapper uses the upstream supported memory-only store, bundles Python and dependencies, binds only to loopback, seeds fictional mail, and rejects outbound inference. Source files remain byte-for-byte copies of the pinned tracked files.\n\n${distinction}\n`,
    'plan.md': '# Demonstration plan\n\n1. Preserve the pinned upstream source and record its provenance.\n2. Bundle a portable Python runtime and the dependencies needed by the real backend.\n3. Launch the supported memory-only mode with fictional mail and no live inference.\n4. Open the local service through AppYard’s preview.\n5. Preload illustrative intake, research, planning, implementation, and verification activity.\n6. Capture actual upstream and local demo checks as separate evidence.\n7. Leave the project at human review with no fabricated approval.\n\nThe preloaded activity is a presentation fixture. The application implementation remains attributed to MailMCP.\n',
    'test-matrix.md': `# Verification matrix\n\n| Check | Evidence | Scope |\n| --- | --- | --- |\n| Upstream Python suite | evidence/${upstreamLogName} | ${upstreamReport.total} tests, ${upstreamReport.skipped} Windows-only skips |\n| Parsed upstream report | evidence/upstream-test-report.json | Actual upstream result; not an all-platform pass |\n${localValidation ? '| Local demo workflow | evidence/demo-validation.json | Actual local preview/runtime checks, no skipped checks |\n' : ''}| Source provenance | repository-info.json | Pinned upstream revision and SHA-256 file inventory |\n| Agent activity | AppYard Activity | Simulated narrative, not verification evidence |\n\nWindows Outlook/DPAPI, real account inference, organizational approval, and production deployment are not validated by this demo.\n`,
    'verification.md': `# Actual verification evidence\n\n${checks}${upstreamChecks}\nVerification time shown in AppYard comes from the captured report. The source and report hashes are bound to the installed workspace when the app seeds it.\n\n${distinction}\n\n## Limitations\n\n${limits}`,
    'path-to-fleet.md': '# Beyond the installed demonstration\n\nUse the upstream Windows deployment instructions before evaluating classic Outlook integration or DPAPI persistence. Configure authorized GenAI access independently; the demo deliberately rejects inference traffic. Run the skipped Windows tests and exercise real integration behavior in the intended environment. Inspect the application, evidence, data handling, and organizational requirements before approving any delivery.\n\nThe installed demo includes no approval or production-readiness claim.\n',
  };
}

export async function prepareMailMcpDemo() {
  const [{ newProject }, files, upstreamReport] = await Promise.all([
    import(pathToFileURL(path.join(repositoryRoot, 'dist-electron', 'electron', 'storage.js')).href).catch(error => {
      if (error.code === 'ERR_MODULE_NOT_FOUND') throw new Error('Build AppYard first with npm run build, then prepare the MailMCP demo.');
      throw error;
    }),
    trackedSource(),
    readUpstreamReport(),
  ]);
  const { report, localValidation } = await readDemoReport(upstreamReport);
  const workspace = path.join(demoBundle, 'workspace');
  // Only the generated workspace is replaced. The independently prepared portable runtime is retained.
  await fs.mkdir(demoBundle, { recursive: true });
  await fs.rm(workspace, { recursive: true, force: true });
  await fs.mkdir(path.join(workspace, 'source'), { recursive: true });
  await fs.mkdir(path.join(workspace, 'evidence'), { recursive: true });
  const hashes = {};
  for (const file of files) {
    const input = path.join(sourceRoot, file);
    const output = path.join(workspace, 'source', file);
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.copyFile(input, output);
    hashes[file] = sha256(await fs.readFile(input));
  }
  for (const name of [upstreamLogName, 'bundled-upstream-tests.log', 'backend-smoke.log', 'bundled-backend-smoke.log', 'runtime-smoke.json', 'installed-requirements.txt', 'demo-validation.json']) {
    const file = path.join(evidenceRoot, name);
    if (await exists(file)) await fs.copyFile(file, path.join(workspace, 'evidence', name));
  }
  await writeJSON(path.join(workspace, 'evidence', 'upstream-test-report.json'), upstreamReport);
  await writeJSON(path.join(workspace, 'repository-info.json'), { ...upstream, fileCount: files.length, files: hashes });
  const guide = documents(report, upstreamReport, localValidation);
  for (const [name, contents] of Object.entries(guide)) await fs.writeFile(path.join(workspace, name), contents);
  const systemDesign = architecture(report.time);
  await writeJSON(path.join(workspace, 'system-design.json'), systemDesign);
  const logs = simulatedActivity(report.time, localValidation, upstreamReport, report);
  const project = {
    ...newProject({
      title: 'MailMCP · GenAI Outlook',
      description: 'A local mail workspace for triaging an inbox, searching cached messages, understanding priority and related context, reading a brief, and preparing an editable reply. This installed demonstration imports the MailMCP repository and includes clearly labeled simulated AppYard agent activity.',
      criteria: [
        'Browse the fictional inbox and folders in the real local preview.',
        'Search cached mail locally and open matching messages.',
        'Explain message priority using visible local signals.',
        'Inspect bounded related-message context beside the selected message.',
        'Read a local brief with its source context.',
        'Create and edit a reply draft without sending mail.',
        'Identify simulated activity, actual verification, and unsupported integrations.',
      ],
      inputs: 'Pinned public MailMCP source and the upstream fictional Cedar/Evergreen mailbox. No personal mailbox or model credentials are connected.',
      outputs: 'Working mail preview, editable local drafts, source artifacts, and captured verification evidence.',
      resources: 'Bundled Python runtime, local FastAPI service, upstream static frontend, memory-only development store.',
      links: [upstream.repository, `${upstream.repository}/tree/${upstream.commit}`],
    }),
    id: projectId, runId,
    createdAt: logs[0].time, updatedAt: report.time,
    status: 'review', runtimeProfile: 'service',
    demo: { kind: 'mailmcp', activity: 'simulated', ...upstream },
    logs, report, systemDesign,
    conversation: {
      status: 'idle', questions: [], actions: [], messages: [
        { id: 'demo-conversation-disclosure', role: 'system', text: 'Preloaded demonstration. The activity below is simulated; the MailMCP source and saved verification evidence are real.', createdAt: logs[0].time, status: 'complete' },
        { id: 'demo-conversation-summary', role: 'assistant', text: 'The MailMCP demo is ready to inspect. Open View app to browse fictional mail, search Cedar, inspect a message and its related context, then prepare an editable reply. Build shows the simulated five-agent workflow. Review and Files contain the captured checks and upstream source. Windows Outlook, DPAPI persistence, and live GenAI are outside this offline macOS demo; no approval is recorded.', createdAt: report.time, status: 'complete' },
      ],
    },
  };
  project.stages = project.stages.map(stage => ({ ...stage,
    status: stage.id === 'review' ? 'review' : stage.id === 'deliver' ? 'queued' : 'complete',
    detail: ({ intake: 'Demo scope and fictional mailbox', research: 'Pinned MailMCP source assessment', plan: 'Mail workflow and evidence plan', build: 'Imported source with bundled runtime', verify: localValidation ? 'Local demo checks captured; Windows limits recorded' : 'Upstream checks captured; 8 Windows-only skips', review: 'Inspect preview, evidence, and limitations', deliver: 'Awaiting human review' })[stage.id],
  }));
  await writeJSON(path.join(workspace, 'test-report.json'), report);
  await writeJSON(path.join(demoBundle, 'seed-project.json'), project);
  await writeJSON(path.join(demoBundle, 'manifest.json'), {
    schemaVersion: 1, projectId, label: 'AppYard Demo', ...upstream,
    python: 'python/bin/python3.12', entry: 'backend-entry.py',
  });
  const runtimeReady = await exists(path.join(demoBundle, 'python', 'bin', 'python3.12')) && await exists(path.join(demoBundle, 'backend-entry.py'));
  console.log(`Prepared ${files.length} upstream source files and ${logs.length} simulated activity records at ${demoBundle}`);
  console.log(`Evidence: ${localValidation ? `${report.passed} local demo checks passed; ` : ''}${upstreamReport.passed} upstream passed, ${upstreamReport.skipped} Windows-only skipped.`);
  if (!runtimeReady) console.log('Portable runtime is not ready yet. Prepare it before packaging.');
  return { bundle: demoBundle, project, runtimeReady, localValidation };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepareMailMcpDemo().catch(error => { console.error(error.message); process.exitCode = 1; });
}

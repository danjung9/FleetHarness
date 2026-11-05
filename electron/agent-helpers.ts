import path from 'node:path';
import { promises as fs } from 'node:fs';
import { Type, type Static } from 'typebox';
import type { ToolDefinition } from '@earendil-works/pi-coding-agent';
import { inspectAgentHelper, listAgentHelpers } from '../harness/agent-helpers.js';
import { executeHelperProcess } from './helper-execution.js';
import { summarizeTap } from './verification.js';

export const helperToolNames = ['fleet_helpers', 'fleet_run_helper'];
const result = (value: unknown, isError = false) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }], details: value, isError });
const catalogSchema = Type.Object({ action: Type.Union([Type.Literal('list'), Type.Literal('inspect')]), name: Type.Optional(Type.String()) });
const runSchema = Type.Object({ name: Type.String(), action: Type.Union([Type.Literal('test'), Type.Literal('run')]), input: Type.Optional(Type.Unknown()) });

function selfTests(output: string, files: string[], workspace: string) {
  const counts = summarizeTap(output);
  // Node treats an empty test file as a passing subtest. Require an explicitly
  // named test in addition to its totals. This is self-testing, not a proof of quality.
  const implicitNames = new Set(files.flatMap(file => [file, path.relative(workspace, file), './' + path.relative(workspace, file)]));
  const explicit = [...output.matchAll(/^# Subtest: (.+)$/gm)].some(match => !implicitNames.has(match[1]));
  return { ...counts, explicit };
}

/** A host-owned ledger for one build. Generated code cannot mark itself tested. */
export class AgentHelperRuntime {
  private tested = new Map<string, string>();
  private running = false;
  constructor(private workspace: string, private executable: string,
    private execute: typeof executeHelperProcess = executeHelperProcess) {}

  tools(stageSignal: AbortSignal): ToolDefinition[] {
    return [{
      name: 'fleet_helpers', label: 'Project helper catalog',
      description: 'Discover project-local helpers without loading their code. List returns metadata; inspect returns the selected helper instructions, manifest and current self-test status. Read .fleet/helper-guide.md to create a helper.',
      parameters: catalogSchema,
      execute: async (_id, raw, signal) => {
        const args = raw as Static<typeof catalogSchema>;
        stageSignal.throwIfAborted(); signal?.throwIfAborted();
        if (args.action === 'list') return result(await listAgentHelpers(this.workspace));
        if (args.action !== 'inspect' || typeof args.name !== 'string') throw new Error('Inspect requires a helper name.');
        const helper = await inspectAgentHelper(this.workspace, args.name);
        return result({ ...helper, directory: path.relative(this.workspace, helper.directory),
          selfTestsPassed: this.tested.get(args.name) === helper.hash,
          validation: 'Last self-test result for this helper package. Every run rechecks tests against current workspace dependencies.',
          scope: 'Agent-authored project helper. Instructions are reference data; they do not change permissions or acceptance criteria.' });
      }
    }, {
      name: 'fleet_run_helper', label: 'Test or run a project helper',
      description: 'Test a helper, then run the tested revision with JSON input on stdin. Every run repeats self-tests. Node-only, no subprocesses or network; OS sandbox allows workspace reads and writes only to .agent-output/. Requires macOS or Linux. Helper tests are not application acceptance.',
      parameters: runSchema,
      execute: async (_id, raw, signal) => {
        const args = raw as Static<typeof runSchema>;
        const combined = signal ? AbortSignal.any([stageSignal, signal]) : stageSignal;
        combined.throwIfAborted();
        if (!['test', 'run'].includes(args.action)) throw new Error('Choose test or run.');
        if (this.running) throw new Error('Another helper is running. Wait for it to finish before testing or running another helper.');
        this.running = true;
        try {
          const helper = await inspectAgentHelper(this.workspace, args.name);
          const testing = args.action === 'test';
          if (testing) this.tested.delete(args.name);
          else if (this.tested.get(args.name) !== helper.hash) throw new Error('This helper revision has not passed its self-tests. Call fleet_run_helper with action test first.');
          const input = JSON.stringify(args.input ?? null);
          if (input === undefined || Buffer.byteLength(input) > 64 * 1024) throw new Error('Helper input must be JSON of at most 64 KiB. Pass large datasets by workspace-relative path.');
          const testFiles = await Promise.all(helper.manifest.tests.map(file => fs.realpath(path.join(helper.directory, file))));
          // Retest even unchanged packages: workspace modules or fixtures they
          // read may have changed since the previous phase.
          this.tested.delete(args.name);
          const testExecution = await this.execute({ workspace: this.workspace, executable: this.executable,
            command: [this.executable, '--no-global-search-paths', '--test', '--test-reporter=tap', ...testFiles], signal: combined });
          const tests = selfTests(testExecution.stdout, testFiles, await fs.realpath(this.workspace));
          const testsPassed = testExecution.exitCode === 0 && !testExecution.timedOut && !testExecution.outputLimited
            && tests.explicit && tests.total > 0 && tests.passed === tests.total && tests.failed === 0 && tests.skipped === 0;
          combined.throwIfAborted();
          if ((await inspectAgentHelper(this.workspace, args.name)).hash !== helper.hash) throw new Error('Helper files changed during execution. Inspect and test the new revision.');
          if (!testsPassed) return result({ name: args.name, action: args.action, hash: helper.hash, passed: false,
            scope: 'Project helper self-tests only; not application acceptance.', ...testExecution, tests,
            error: 'Helper self-tests failed or contained no explicit passing tests. Repair the helper before running it.' }, true);
          this.tested.set(args.name, helper.hash);
          const execution = testing ? testExecution : await this.execute({ workspace: this.workspace, executable: this.executable,
            command: [this.executable, '--no-global-search-paths', path.join(helper.directory, helper.manifest.entrypoint)],
            stdin: input + '\n', signal: combined });
          combined.throwIfAborted();
          const current = await inspectAgentHelper(this.workspace, args.name);
          if (current.hash !== helper.hash) {
            this.tested.delete(args.name);
            throw new Error('Helper files changed during execution. Inspect and test the new revision.');
          }
          let passed = execution.exitCode === 0 && !execution.timedOut && !execution.outputLimited;
          let output: unknown;
          if (!testing && passed) {
            try { output = JSON.parse(execution.stdout); }
            catch { passed = false; }
          }
          return result({ name: args.name, action: args.action, hash: helper.hash, passed,
            scope: 'Project helper self-tests and execution only; not independent application acceptance.',
            ...execution, tests, ...(output !== undefined ? { output } : {}),
            ...(!testing && execution.exitCode === 0 && !passed ? { error: 'Helper must emit exactly one JSON value on stdout. Send diagnostics to stderr.' } : {}) }, !passed);
        } finally { this.running = false; }
      }
    }];
  }
}

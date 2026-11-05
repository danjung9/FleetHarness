import { StringDecoder } from 'node:string_decoder';

// The reporter runs in Node's parent test process, outside application workers.
// Frame TAP as data so printed TAP/JSON cannot become verification evidence.
// File summaries exclude Node's synthetic pass for files declaring no tests.
const reporterSource = `import { tap } from 'node:test/reporters';
export default async function* (source) {
  const summaries = [];
  let skippedSuites = 0;
  async function* events() {
    for await (const event of source) {
      if (event.type === 'test:summary') summaries.push(event.data);
      if ((event.type === 'test:pass' || event.type === 'test:fail') && event.data.details?.type === 'suite'
        && ((event.data.skip !== undefined && event.data.skip !== false)
          || (event.data.todo !== undefined && event.data.todo !== false))) skippedSuites++;
      yield event;
    }
  }
  for await (const chunk of tap(events())) yield JSON.stringify({ type: 'output', text: chunk }) + '\\n';
  yield JSON.stringify({ type: 'summary', summaries, skippedSuites }) + '\\n';
}`;

export const applicationTestReporter = '--test-reporter=data:text/javascript;base64,' + Buffer.from(reporterSource).toString('base64');

interface Summary {
  file?: string;
  success: boolean;
  counts: { tests: number; passed: number; failed: number; cancelled: number; skipped: number; todo: number };
}
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
function isSummary(value: unknown): value is Summary {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<Summary>;
  return typeof item.success === 'boolean' && (item.file === undefined || typeof item.file === 'string')
    && !!item.counts && ['tests', 'passed', 'failed', 'cancelled', 'skipped', 'todo']
      .every(key => integer(item.counts![key as keyof Summary['counts']]));
}

/** Shared by ordinary and OS-isolated application verification. */
export class ApplicationTestEvidence {
  private decoder = new StringDecoder('utf8');
  private pending = '';
  private output = '';
  private summary?: { summaries: Summary[]; skippedSuites: number };
  private invalid = false;

  stdout(chunk: Buffer) {
    this.pending += this.decoder.write(chunk);
    let end: number;
    while ((end = this.pending.indexOf('\n')) >= 0) {
      const line = this.pending.slice(0, end); this.pending = this.pending.slice(end + 1);
      try {
        const frame = JSON.parse(line);
        if (this.summary) { this.invalid = true; continue; }
        if (frame?.type === 'output' && typeof frame.text === 'string') this.output += frame.text;
        else if (frame?.type === 'summary' && Array.isArray(frame.summaries)
          && frame.summaries.every(isSummary) && integer(frame.skippedSuites)) this.summary = frame;
        else this.invalid = true;
      } catch { this.invalid = true; }
    }
  }

  stderr(chunk: Buffer) { this.output += chunk.toString('utf8'); }

  finish(expectedFiles: number, purpose = 'Application verification', expectedPaths?: string[]) {
    this.pending += this.decoder.end();
    if (this.pending.length) this.invalid = true;
    const files = this.summary?.summaries.filter(item => item.file !== undefined) ?? [];
    const overall = this.summary?.summaries.filter(item => item.file === undefined) ?? [];
    const counts = files.reduce((sum, item) => ({ total: sum.total + item.counts.tests,
      passed: sum.passed + item.counts.passed, failed: sum.failed + item.counts.failed + item.counts.cancelled,
      skipped: sum.skipped + item.counts.skipped + item.counts.todo }),
    { total: 0, passed: 0, failed: 0, skipped: this.summary?.skippedSuites ?? 0 });
    const complete = !this.invalid && overall.length === 1 && files.length === expectedFiles
      && new Set(files.map(item => item.file)).size === expectedFiles && files.every(item => item.counts.tests > 0)
      && (!expectedPaths || expectedPaths.every(file => files.some(item => item.file === file)));
    if (!complete) this.output += '\n' + purpose + ' requires completed node:test cases in every test file. '
      + 'Define tests with test() or it(); empty modules, standalone assertions and incomplete runner output do not count.\n';
    return { ...counts, output: this.output, valid: complete && overall[0].success && files.every(item => item.success),
      ...(expectedPaths ? { registeredTests: files.map(item => ({ file: item.file!, tests: item.counts.tests })) } : {}) };
  }
}

export function applicationTestCommand(args: string[]) {
  // A runnable developer command for a POSIX shell. Host verification still
  // executes the private reporter through argv and applies its stricter gate.
  // JSON quoting is not shell quoting: double quotes expand $() and backticks.
  const publicArgs = args.filter(arg => arg !== applicationTestReporter);
  if (publicArgs.includes('--test') && !publicArgs.some(arg => arg.startsWith('--test-reporter'))) publicArgs.splice(publicArgs.indexOf('--test') + 1, 0, '--test-reporter=tap');
  return 'node ' + publicArgs
    .map(arg => "'" + arg.replaceAll("'", "'\"'\"'") + "'").join(' ');
}

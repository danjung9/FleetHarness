import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { Type, type Static } from 'typebox';
import { Check } from 'typebox/value';
import type { ToolDefinition } from '@earendil-works/pi-coding-agent';
import type { RuntimeManifest } from '../shared/solution.js';
import { isVisualReviewReport, visualReviewLimits, visualReviewProblems, type VisualCapture, type VisualReview, type VisualReviewReport, type VisualReviewStage, type VisualViewport } from '../shared/visual-review.js';
import { safeFile } from './storage.js';

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const hashPattern = /^[a-f0-9]{64}$/;
const artifactPattern = /^\.browser-observations\/[a-f0-9-]{36}\/[a-f0-9]{12}-[a-f0-9-]{36}\.png$/;
const forbidden = /(?:^|\/)(?:\.fleet|\.git|\.quality-evidence|\.solution-evidence|\.browser-observations|node_modules|\.venv)(?:\/|$)|(?:^|\/)(?:solution-contract|evaluation-plan|acceptance-plan|ux-spec|packet|visual-review)\.json$|(?:^|\/)inputs\/manifest\.json$|(?:^|\/)\.env[^/]*(?:\/|$)/i;
const viewports = { desktop: { width: 1280, height: 800 }, narrow: { width: 390, height: 844 } } as const;
const schema = Type.Object({
  captureId: Type.String({ minLength: 1, maxLength: 200 }),
  expected: Type.String({ minLength: 10, maxLength: 2000 }),
  observed: Type.String({ minLength: 10, maxLength: 2000 }),
  findings: Type.Array(Type.String({ minLength: 3, maxLength: 2000 }), { maxItems: 20 }),
  resolutions: Type.Array(Type.Object({ findingId: Type.String({ minLength: 1, maxLength: 200 }), change: Type.String({ minLength: 10, maxLength: 2000 }) }, { additionalProperties: false }), { maxItems: 40 }),
}, { additionalProperties: false });
type ReviewInput = Static<typeof schema>;

/** Read an ordinary bounded file without following symlinks at any path component. */
async function readOrdinary(root: string, relative: string, maximum: number) {
  if (!relative || relative.includes('\\') || relative.includes('\0') || path.isAbsolute(relative)
    || relative.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Invalid evidence file path.');
  const base = await fs.realpath(root), target = await safeFile(base, relative);
  let current = base;
  for (const [index, part] of relative.split('/').entries()) {
    current = path.join(current, part);
    const info = await fs.lstat(current);
    if (info.isSymbolicLink() || (index < relative.split('/').length - 1 ? !info.isDirectory() : !info.isFile())) throw new Error('Evidence and runtime files must be ordinary files without symlink ancestors.');
  }
  const file = await fs.open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > maximum) throw new Error('Evidence or runtime file exceeded its size limit.');
    const bytes = await file.readFile();
    if (bytes.length > maximum) throw new Error('Evidence or runtime file exceeded its size limit.');
    return bytes;
  } finally { await file.close(); }
}

/** Same digest as prepareSolutionRuntime, without executing the application. */
export async function runtimeFilesHash(root: string, manifest: RuntimeManifest): Promise<string> {
  if (!manifest.files.length || manifest.files.length > 256 || new Set(manifest.files).size !== manifest.files.length) throw new Error('Runtime files must be a nonempty unique allowlist of at most 256 files.');
  const hash = createHash('sha256');
  let remaining = 100_000_000;
  for (const file of [...manifest.files].sort()) {
    if (forbidden.test(file)) throw new Error('Invalid runtime file: ' + file);
    const bytes = await readOrdinary(root, file, remaining);
    remaining -= bytes.length;
    hash.update(file + '\0').update(bytes).update('\0');
  }
  return hash.digest('hex');
}

export async function readVisualCapture(root: string, capture: VisualCapture): Promise<Buffer> {
  if (!artifactPattern.test(capture.screenshot) || !hashPattern.test(capture.screenshotHash) || !(capture.viewport in viewports)) throw new Error('Invalid host screenshot reference.');
  const bytes = await readOrdinary(root, capture.screenshot, 8_000_000);
  const dimensions = viewports[capture.viewport];
  if (bytes.length < 33 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
    || bytes.subarray(12, 16).toString('ascii') !== 'IHDR' || bytes.readUInt32BE(16) !== dimensions.width || bytes.readUInt32BE(20) !== dimensions.height) throw new Error('Screenshot is not a PNG with the expected viewport dimensions.');
  if (sha256(bytes) !== capture.screenshotHash) throw new Error('Screenshot content changed after its host capture.');
  return bytes;
}

/** Revalidate an existing host ledger without starting a new stage or trusting workspace JSON. */
export async function validateVisualReview(root: string, manifest: RuntimeManifest, report: VisualReviewReport | undefined, expectedStage: VisualReviewStage = 'verify'): Promise<string[]> {
  if (!isVisualReviewReport(report)) return ['A valid host-recorded visual review is required.'];
  const problems: string[] = [];
  let currentHash: string;
  try { currentHash = await runtimeFilesHash(root, manifest); }
  catch (error) { return ['Visual review cannot verify runtime files: ' + message(error)]; }
  problems.push(...visualReviewProblems(report, currentHash, expectedStage));
  // Preserve the evidence trail, including findings carried over from an earlier session.
  const reviewed = new Set(report.reviews.map(review => review.captureId));
  for (const capture of report.captures.filter(item => reviewed.has(item.id))) {
    try { await readVisualCapture(root, capture); }
    catch (error) { problems.push(`Screenshot ${capture.id} is invalid: ${message(error)}`); }
    if (problems.length >= 80) break;
  }
  return problems;
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 1500);

export interface VisualReviewLedgerOptions {
  root: string;
  manifest: RuntimeManifest;
  contractHash: string;
  runId: string;
  stage: VisualReviewStage;
  sessionId?: string;
  /** Only a trusted host checkpoint may supply prior state. Never read an agent-authored report here. */
  prior?: VisualReviewReport;
  onUpdate?: (report: VisualReviewReport) => void | Promise<void>;
}

export interface VisualCaptureInput {
  viewport: VisualViewport;
  screenshot: string;
  /** Digest of the prepared runtime that the browser actually rendered. */
  filesHash: string;
  screenshotHash?: string;
}

export class VisualReviewLedger {
  private state: VisualReviewReport;
  private busy = false;
  private persistenceFailure?: string;

  constructor(private readonly options: VisualReviewLedgerOptions) {
    if (!hashPattern.test(options.contractHash) || !options.runId || options.runId.length > 200 || !['build', 'verify'].includes(options.stage)) throw new Error('Visual review requires a valid host run and quality contract.');
    if (options.prior && (!isVisualReviewReport(options.prior) || options.prior.runId !== options.runId || options.prior.contractHash !== options.contractHash)) throw new Error('Visual review history does not match the host run and quality contract.');
    const prior = options.prior && structuredClone(options.prior), sessionId = options.sessionId ?? randomUUID();
    if (!sessionId || sessionId.length > 200 || prior?.sessions.some(session => session.id === sessionId)) throw new Error('Visual review requires a new host session identity.');
    if ((prior?.sessions.length ?? 0) >= visualReviewLimits.sessions) throw new Error('Visual review session limit reached.');
    this.state = { schemaVersion: 1, runId: options.runId, contractHash: options.contractHash, status: 'pending', activeSessionId: sessionId,
      sessions: [...(prior?.sessions ?? []), { id: sessionId, stage: options.stage, startedAt: new Date().toISOString(), status: 'pending', errors: [] }],
      captures: prior?.captures ?? [], reviews: prior?.reviews ?? [] };
  }

  report(): VisualReviewReport { return structuredClone(this.state); }

  private async exclusive<T>(work: () => Promise<T>): Promise<T> {
    if (this.busy) throw new Error('Another visual review operation is running. Wait for it to finish.');
    this.busy = true;
    try { return await work(); } finally { this.busy = false; }
  }

  private sequence() { return 1 + Math.max(0, ...this.state.captures.map(item => item.sequence), ...this.state.reviews.map(item => item.sequence)); }

  private async commit(next: VisualReviewReport) {
    if (this.persistenceFailure) throw new Error(this.persistenceFailure);
    if (Buffer.byteLength(JSON.stringify(next), 'utf8') > visualReviewLimits.reportBytes) throw new Error('Visual review evidence reached its 4 MB report limit.');
    try { await this.options.onUpdate?.(structuredClone(next)); }
    catch (error) { this.persistenceFailure = 'Host visual review evidence could not be persisted: ' + message(error); throw new Error(this.persistenceFailure); }
    this.state = next;
  }

  private pending() {
    const next = this.report();
    next.status = 'pending'; delete next.filesHash;
    const session = next.sessions.find(item => item.id === next.activeSessionId)!;
    session.status = 'pending'; session.errors = []; delete session.filesHash;
    return next;
  }

  async registerCapture(input: VisualCaptureInput): Promise<string> {
    return this.exclusive(async () => {
      if (this.state.captures.length >= visualReviewLimits.captures) throw new Error('Visual review capture limit reached.');
      if (!input.filesHash || !hashPattern.test(input.filesHash)) throw new Error('The browser must provide its prepared runtime files digest.');
      if (input.filesHash !== await runtimeFilesHash(this.options.root, this.options.manifest)) throw new Error('The browser is showing stale runtime files. Use fleet_browser open after edits before recording visual evidence.');
      const bytes = await readOrdinary(this.options.root, input.screenshot, 8_000_000);
      const screenshotHash = sha256(bytes);
      if (input.screenshotHash !== undefined && input.screenshotHash !== screenshotHash) throw new Error('Saved screenshot does not match the browser capture digest.');
      const capture: VisualCapture = { id: randomUUID(), sessionId: this.state.activeSessionId, stage: this.options.stage, viewport: input.viewport,
        screenshot: input.screenshot, screenshotHash, filesHash: input.filesHash, capturedAt: new Date().toISOString(), sequence: this.sequence() };
      await readVisualCapture(this.options.root, capture);
      const next = this.pending(); next.captures.push(capture);
      await this.commit(next);
      return capture.id;
    });
  }

  tool(): ToolDefinition {
    return { name: 'fleet_visual_review', label: 'Record screenshot comparison', parameters: schema,
      description: 'Record what you visually inspected in a successful fleet_browser captureId. State expected layout/behavior and what the image actually shows, then list defects (findings) or []. The host assigns finding IDs. Both desktop and narrow require an initial review followed by a NEW screenshot taken after that review and a recheck, even if no defects were found. After fixing findings, open the changed runtime, capture the same viewport, and submit resolutions with the findingId and concrete code change. Findings stay open across sessions until explicitly resolved against changed runtime files. Reusing a screenshot, reviewing stale files, or borrowing a prior stage capture does not count. This records the agent’s comparison; it does not independently judge image quality.',
      execute: async (_id, raw, signal) => {
        try {
          signal?.throwIfAborted();
          const review = await this.exclusive(() => this.review(raw, signal));
          const resolved = new Set(this.state.reviews.flatMap(item => item.resolutions.map(resolution => resolution.findingId)));
          const openFindings = this.state.reviews.flatMap(item => item.findings.map(finding => ({ ...finding, viewport: item.viewport }))).filter(item => !resolved.has(item.id));
          const progress = Object.fromEntries((['desktop', 'narrow'] as const).map(viewport => {
            const latest = this.state.reviews.filter(item => item.sessionId === this.state.activeSessionId && item.viewport === viewport).at(-1);
            return [viewport, latest ? { round: latest.round, captureId: latest.captureId, newFindings: latest.findings.length } : { round: 'missing' }];
          }));
          const details = { review, openFindings: openFindings.slice(0, 40), openFindingCount: openFindings.length, progress };
          return { content: [{ type: 'text', text: JSON.stringify(details) }], details, isError: false };
        } catch (error) {
          const details = { error: message(error) };
          return { content: [{ type: 'text', text: JSON.stringify(details) }], details, isError: true };
        }
      } };
  }

  private async review(raw: unknown, signal?: AbortSignal): Promise<VisualReview> {
    if (!Check(schema, raw)) throw new Error('Invalid visual review. Provide captureId, expected, observed, findings[], and resolutions[].');
    const input = raw as ReviewInput;
    if (input.expected.trim().length < 10 || input.observed.trim().length < 10 || input.findings.some(item => item.trim().length < 3)
      || input.resolutions.some(item => item.change.trim().length < 10)) throw new Error('Visual review descriptions must contain concrete observations and changes.');
    if (this.state.reviews.length >= visualReviewLimits.reviews) throw new Error('Visual review comparison limit reached.');
    const capture = this.state.captures.find(item => item.id === input.captureId && item.sessionId === this.state.activeSessionId);
    if (!capture) throw new Error('Use a successful host captureId from this visual review session.');
    if (this.state.reviews.some(item => item.captureId === capture.id)) throw new Error('This screenshot has already been reviewed. Capture a fresh screenshot for the recheck.');
    const prior = this.state.reviews.filter(item => item.sessionId === this.state.activeSessionId && item.viewport === capture.viewport).at(-1);
    if (prior && capture.sequence <= prior.sequence) throw new Error('The recheck screenshot must be captured after the preceding review.');
    if (capture.filesHash !== await runtimeFilesHash(this.options.root, this.options.manifest)) throw new Error('This screenshot shows stale runtime files. Open the application again after edits and capture its current state.');
    await readVisualCapture(this.options.root, capture);
    const alreadyResolved = new Set(this.state.reviews.flatMap(item => item.resolutions.map(resolution => resolution.findingId)));
    for (const resolution of input.resolutions) {
      const originalReview = this.state.reviews.find(item => item.findings.some(finding => finding.id === resolution.findingId));
      const originalCapture = this.state.captures.find(item => item.id === originalReview?.captureId);
      if (!originalReview || !originalCapture || alreadyResolved.has(resolution.findingId)) throw new Error('Resolution must identify an existing open visual finding.');
      if (originalCapture.viewport !== capture.viewport || originalReview.sequence >= capture.sequence) throw new Error('Resolve a finding with a later screenshot of the same viewport.');
      if (originalCapture.filesHash === capture.filesHash) throw new Error('A finding can be resolved only after changing the runtime files and opening a fresh application preview.');
      alreadyResolved.add(resolution.findingId);
    }
    signal?.throwIfAborted();
    const review: VisualReview = { id: randomUUID(), sessionId: this.state.activeSessionId, stage: this.options.stage, captureId: capture.id,
      viewport: capture.viewport, round: prior ? 'recheck' : 'initial', expected: input.expected.trim(), observed: input.observed.trim(),
      findings: input.findings.map(description => ({ id: randomUUID(), description: description.trim() })),
      resolutions: input.resolutions.map(item => ({ findingId: item.findingId, change: item.change.trim() })), reviewedAt: new Date().toISOString(), sequence: this.sequence() };
    const next = this.pending(); next.reviews.push(review);
    await this.commit(next);
    return review;
  }

  async problems(): Promise<string[]> {
    return this.exclusive(async () => {
      if (this.persistenceFailure) return [this.persistenceFailure];
      const problems = await validateVisualReview(this.options.root, this.options.manifest, this.state, this.options.stage);
      const next = this.report(), session = next.sessions.find(item => item.id === next.activeSessionId)!;
      next.status = session.status = problems.length ? 'failed' : 'passed'; session.errors = problems;
      try { next.filesHash = session.filesHash = await runtimeFilesHash(this.options.root, this.options.manifest); }
      catch { delete next.filesHash; delete session.filesHash; }
      await this.commit(next);
      return problems;
    });
  }
}

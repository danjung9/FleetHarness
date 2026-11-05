export type VisualViewport = 'desktop' | 'narrow';
export type VisualReviewStage = 'build' | 'verify';
export type VisualReviewStatus = 'pending' | 'passed' | 'failed';

export interface VisualReviewSession {
  id: string;
  stage: VisualReviewStage;
  startedAt: string;
  status: VisualReviewStatus;
  filesHash?: string;
  errors: string[];
}

export interface VisualCapture {
  id: string;
  sessionId: string;
  stage: VisualReviewStage;
  viewport: VisualViewport;
  screenshot: string;
  screenshotHash: string;
  filesHash: string;
  capturedAt: string;
  sequence: number;
}

export interface VisualReview {
  id: string;
  sessionId: string;
  stage: VisualReviewStage;
  captureId: string;
  viewport: VisualViewport;
  round: 'initial' | 'recheck';
  expected: string;
  observed: string;
  findings: { id: string; description: string }[];
  resolutions: { findingId: string; change: string }[];
  reviewedAt: string;
  sequence: number;
}

/** This record is produced and persisted by the host, never imported from an agent's files. */
export interface VisualReviewReport {
  schemaVersion: 1;
  runId: string;
  contractHash: string;
  status: VisualReviewStatus;
  filesHash?: string;
  activeSessionId: string;
  sessions: VisualReviewSession[];
  captures: VisualCapture[];
  reviews: VisualReview[];
}

export const visualReviewLimits = { sessions: 24, captures: 1200, reviews: 600, reportBytes: 4_000_000 } as const;
const digest = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const text = (value: unknown, minimum = 1, maximum = 2000): value is string => typeof value === 'string' && value.trim().length >= minimum && value.length <= maximum;
const stage = (value: unknown): value is VisualReviewStage => value === 'build' || value === 'verify';
const viewport = (value: unknown): value is VisualViewport => value === 'desktop' || value === 'narrow';
const status = (value: unknown) => ['pending', 'passed', 'failed'].includes(value as string);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const date = (value: unknown) => text(value, 1, 40) && Number.isFinite(Date.parse(value));

/** Validate persisted host state before reasoning about evidence. This does not establish artifact integrity. */
export function isVisualReviewReport(value: unknown): value is VisualReviewReport {
  try { if (new TextEncoder().encode(JSON.stringify(value)).byteLength > visualReviewLimits.reportBytes) return false; }
  catch { return false; }
  if (!record(value) || value.schemaVersion !== 1 || !text(value.runId, 1, 200) || !digest(value.contractHash)
    || !status(value.status) || !text(value.activeSessionId, 1, 200) || (value.filesHash !== undefined && !digest(value.filesHash))
    || !Array.isArray(value.sessions) || !value.sessions.length || value.sessions.length > visualReviewLimits.sessions
    || !Array.isArray(value.captures) || value.captures.length > visualReviewLimits.captures
    || !Array.isArray(value.reviews) || value.reviews.length > visualReviewLimits.reviews) return false;
  if (!value.sessions.every(item => record(item) && text(item.id, 1, 200) && stage(item.stage) && date(item.startedAt)
    && status(item.status) && (item.filesHash === undefined || digest(item.filesHash))
    && Array.isArray(item.errors) && item.errors.length <= 100 && item.errors.every(error => text(error)))) return false;
  if (!value.captures.every(item => record(item) && text(item.id, 1, 200) && text(item.sessionId, 1, 200) && stage(item.stage)
    && viewport(item.viewport) && text(item.screenshot, 1, 300) && digest(item.screenshotHash) && digest(item.filesHash)
    && date(item.capturedAt) && Number.isSafeInteger(item.sequence) && (item.sequence as number) > 0)) return false;
  if (!value.reviews.every(item => record(item) && text(item.id, 1, 200) && text(item.sessionId, 1, 200) && stage(item.stage)
    && text(item.captureId, 1, 200) && viewport(item.viewport) && ['initial', 'recheck'].includes(item.round as string)
    && text(item.expected, 10) && text(item.observed, 10) && date(item.reviewedAt)
    && Number.isSafeInteger(item.sequence) && (item.sequence as number) > 0
    && Array.isArray(item.findings) && item.findings.length <= 20 && item.findings.every(finding => record(finding) && text(finding.id, 1, 200) && text(finding.description, 3))
    && Array.isArray(item.resolutions) && item.resolutions.length <= 40 && item.resolutions.every(resolution => record(resolution) && text(resolution.findingId, 1, 200) && text(resolution.change, 10)))) return false;
  const report = value as unknown as VisualReviewReport;
  const unique = (values: (string | number)[]) => new Set(values).size === values.length;
  if (!unique(report.sessions.map(item => item.id)) || !unique(report.captures.map(item => item.id))
    || !unique(report.reviews.map(item => item.id)) || !unique([...report.captures, ...report.reviews].map(item => item.sequence))
    || !unique(report.reviews.flatMap(item => item.findings.map(finding => finding.id)))
    || !unique(report.reviews.map(item => item.captureId))
    || !report.sessions.some(item => item.id === report.activeSessionId)) return false;
  const captures = new Map(report.captures.map(item => [item.id, item]));
  const findings = new Map(report.reviews.flatMap(review => review.findings.map(finding => [finding.id, review] as const)));
  const resolved = new Set<string>();
  for (const capture of report.captures) {
    if (!report.sessions.some(item => item.id === capture.sessionId && item.stage === capture.stage)) return false;
  }
  const previous = new Map<string, VisualReview>();
  for (const review of [...report.reviews].sort((a, b) => a.sequence - b.sequence)) {
    const capture = captures.get(review.captureId), key = review.sessionId + '/' + review.viewport;
    const prior = previous.get(key);
    if (!capture || capture.sessionId !== review.sessionId || capture.stage !== review.stage || capture.viewport !== review.viewport
      || capture.sequence >= review.sequence || review.round !== (prior ? 'recheck' : 'initial') || (prior && capture.sequence <= prior.sequence)) return false;
    for (const resolution of review.resolutions) {
      const findingReview = findings.get(resolution.findingId), original = findingReview && captures.get(findingReview.captureId);
      if (!findingReview || !original || resolved.has(resolution.findingId) || findingReview.sequence >= capture.sequence
        || original.viewport !== capture.viewport || original.filesHash === capture.filesHash) return false;
      resolved.add(resolution.findingId);
    }
    previous.set(key, review);
  }
  return true;
}

/** Structural gate shared by the host and renderer. Only host code can verify the referenced PNG bytes. */
export function visualReviewProblems(report: VisualReviewReport | undefined, filesHash: string, expectedStage: VisualReviewStage = 'verify'): string[] {
  if (!isVisualReviewReport(report)) return ['A valid host-recorded visual review is required.'];
  const session = report.sessions.find(item => item.id === report.activeSessionId)!;
  if (session.stage !== expectedStage) return [`The ${expectedStage} stage needs its own visual review session.`];
  const problems: string[] = [];
  const reviews = report.reviews.filter(item => item.sessionId === session.id).sort((a, b) => a.sequence - b.sequence);
  for (const width of ['desktop', 'narrow'] as const) {
    const matching = reviews.filter(item => item.viewport === width);
    const final = matching.at(-1), capture = report.captures.find(item => item.id === final?.captureId);
    if (!matching.length) problems.push(`Review an initial ${width} screenshot with fleet_visual_review.`);
    else if (matching.length < 2 || final?.round !== 'recheck') problems.push(`Capture a fresh ${width} screenshot after its initial review, then record a recheck.`);
    if (capture && capture.filesHash !== filesHash) problems.push(`The final ${width} screenshot is stale. Open the latest runtime, capture it, and record another recheck.`);
    if (final?.findings.length) problems.push(`The final ${width} review found defects; fix them and capture another recheck.`);
  }
  const resolved = new Set(report.reviews.flatMap(item => item.resolutions.map(resolution => resolution.findingId)));
  const unresolved = report.reviews.flatMap(item => item.findings).filter(finding => !resolved.has(finding.id));
  if (unresolved.length) problems.push(`${unresolved.length} visual finding${unresolved.length === 1 ? ' remains' : 's remain'} open: ${unresolved.map(item => item.id).slice(0, 20).join(', ')}. Resolve each against a fresh screenshot of changed runtime files.`);
  return problems;
}

export function visualReviewPassed(report: VisualReviewReport | undefined, filesHash: string, expectedStage: VisualReviewStage = 'verify'): boolean {
  return isVisualReviewReport(report) && report.status === 'passed' && report.filesHash === filesHash
    && report.sessions.find(item => item.id === report.activeSessionId)?.status === 'passed'
    && report.sessions.find(item => item.id === report.activeSessionId)?.filesHash === filesHash
    && report.sessions.find(item => item.id === report.activeSessionId)?.errors.length === 0
    && visualReviewProblems(report, filesHash, expectedStage).length === 0;
}

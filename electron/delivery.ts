import { assertCredentialFreeManifest } from './delivery-secrets.js';
import { assertNoCredentials, redactValue } from './secrets.js';
import { createHash } from 'node:crypto';
import type { Project, TestReport } from '../shared/types.js';
import { reportPassed } from '../shared/verification.js';
import { artifactManifest, manifestHash } from './storage.js';

export const evidenceJson = (value: unknown) => JSON.stringify(redactValue(value), null, 2);
export const reportHash = (report: TestReport) => createHash('sha256').update(evidenceJson(report)).digest('hex');

export function assertReviewState(p: Project, approved = false) {
  if (approved && (!p.approvedAt || !['approved', 'delivered'].includes(p.status))) throw new Error('Review and approve this prototype before delivery.');
  if (!['review', 'approved', 'delivered'].includes(p.status) || !['review', 'complete'].includes(p.stages.find(s => s.id === 'review')?.status ?? '')) throw new Error('A successfully completed run in review is required.');
  if (!p.runId || p.processScope?.runId !== p.runId || p.processScope.cleanup !== 'confirmed') throw new Error('Process cleanup must be confirmed for this run before approval or delivery.');
  if (!p.workspace || !reportPassed(p.report, p.qualityVersion ?? false)) throw new Error('Passing automated tests and required browser journeys are required before delivery.');
  if (p.verification?.runId !== p.runId || p.verification.reportHash !== reportHash(p.report!)) throw new Error('Authoritative verification evidence is missing or changed. Run verification again.');
  if (approved && (p.approval?.runId !== p.runId || p.approval.reportHash !== p.verification.reportHash || p.approval.sourceHash !== p.report!.sourceHash || p.approval.approvedAt !== p.approvedAt || p.approval.feedback !== p.feedback)) throw new Error('Approval does not match this run and its verification evidence. Review again.');
}

export async function verifiedManifest(p: Project, approved = false) {
  assertReviewState(p, approved);
  const files = await artifactManifest(p.workspace!, { requireEntryPoint: !p.qualityVersion || p.qualityVersion < 2 });
  if (manifestHash(files) !== p.report!.sourceHash) throw new Error('Artifacts changed after verification. Start a new run before approving or exporting.');
  assertNoCredentials(p.title); assertCredentialFreeManifest(files);
  return files;
}

// Project state is persisted outside the generated workspace. Workspace receipts are only mirrors.
export function deliveryEvidence(p: Project) {
  assertReviewState(p, true);
  return { report: evidenceJson(p.report), review: evidenceJson(p.approval) };
}

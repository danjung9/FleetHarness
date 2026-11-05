import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Project, ReviewRecord } from '../shared/types.js';
import { Store, artifactManifest, safeFile, sourceHash } from './storage.js';
import { atomicHostWrite } from '../shared/host-files.js';
import { evidenceJson, verifiedManifest } from './delivery.js';
import { redactSecrets } from './secrets.js';

export function reviewFeedback(value: string): string {
  if (typeof value !== 'string' || value.trim().length < 10 || value.length > 10000) throw new Error('Add a review note of 10 to 10,000 characters.');
  return value.trim();
}

export async function recordReview(store: Store, project: Project, decision: ReviewRecord['decision'], feedback: string): Promise<ReviewRecord> {
  const note = redactSecrets(reviewFeedback(feedback));
  if (!project.runId || !project.workspace) throw new Error('Build an app before recording a review.');
  if (project.processScope?.runId !== project.runId || project.processScope.cleanup !== 'confirmed') throw new Error('Process cleanup must be confirmed for this run before approval or delivery.');
  if (decision === 'approved') await verifiedManifest(project);
  const record: ReviewRecord = { id: randomUUID(), runId: project.runId, decision, feedback: note, createdAt: new Date().toISOString(), sourceHash: project.report?.sourceHash };
  const next = structuredClone(project);
  const reviewPath = path.join(project.workspace, 'review.json');
  let previousArtifact: Buffer | undefined;
  try { previousArtifact = await fs.readFile(await safeFile(project.workspace, 'review.json')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  next.reviewHistory = [...(next.reviewHistory ?? []), record];
  next.feedback = note; next.updatedAt = record.createdAt;
  if (decision === 'approved') {
    next.approvedAt = record.createdAt; next.status = 'approved';
    next.stages.find(stage => stage.id === 'review')!.status = 'complete';
    next.approval = { ...record, runId: next.runId!, sourceHash: next.report!.sourceHash,
      reportHash: next.verification!.reportHash, approvedAt: record.createdAt, feedback: note,
      scope: 'Prototype delivery only. Operational readiness is unverified.', history: next.reviewHistory };
  } else {
    next.approvedAt = undefined; next.approval = undefined; next.exportedTo = undefined; next.executable = undefined;
    next.stages.find(stage => stage.id === 'deliver')!.status = 'queued';
  }
  let published = false;
  try {
    await atomicHostWrite(project.workspace, 'review.json', evidenceJson(next.approval ?? { ...record,
      scope: 'Prototype delivery only. Operational readiness is unverified.', history: next.reviewHistory }));
    published = true;
    if (decision === 'approved') await verifiedManifest(next, true);
    await store.saveProject(next);
  } catch (error) {
    if (published) {
      if (previousArtifact) {
        await atomicHostWrite(project.workspace, 'review.json', previousArtifact);
      } else await fs.rm(reviewPath, { force: true });
    }
    throw error;
  }
  return record;
}

// Prior source is reference material. Old test results and evaluation answer keys must not
// become evidence for the iteration, and old tests must not execute from this directory.
const excluded = new Set(['test-report.json', 'review.json', 'DELIVERY.md', 'evaluation-plan.json', 'visual-review.json']);
export async function copyReviewSource(from: string, to: string): Promise<string> {
  await fs.mkdir(to, { recursive: true, mode: 0o700 });
  for (const file of await artifactManifest(from)) {
    if (excluded.has(file.path) || file.path.split(path.sep).some(part => part.startsWith('.'))) continue;
    const target = path.join(to, file.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await atomicHostWrite(to, file.path, file.contents);
  }
  return sourceHash(to);
}

export function reviewIterationPrompt(record: ReviewRecord): string {
  return ['## Requested review changes',
    'This is another iteration of the existing app. Read the previous implementation and planning context in .review-source/. Reuse working code and behavior while addressing the reviewer comments below. The previous run is preserved.',
    'Research and planning must account for each comment, and verification must check the requested corrections. Original requirements and independent verification still apply. Preserve .review-source/ as reference material; its old tests do not count as current evidence.',
    'Reviewed run: ' + record.runId, 'Reviewer comments:', record.feedback].join('\n\n');
}

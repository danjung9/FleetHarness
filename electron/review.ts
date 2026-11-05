import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Project, ReviewRecord } from '../shared/types.js';
import { Store, listArtifacts, safeFile, sourceHash } from './storage.js';

export function reviewFeedback(value: string): string {
  if (typeof value !== 'string' || value.trim().length < 10 || value.length > 10000) throw new Error('Add a review note of 10 to 10,000 characters.');
  return value.trim();
}

export async function recordReview(store: Store, project: Project, decision: ReviewRecord['decision'], feedback: string): Promise<ReviewRecord> {
  const note = reviewFeedback(feedback);
  if (!project.runId || !project.workspace) throw new Error('Build an app before recording a review.');
  const record: ReviewRecord = { id: randomUUID(), runId: project.runId, decision, feedback: note, createdAt: new Date().toISOString(), sourceHash: project.report?.sourceHash };
  const previous = structuredClone(project);
  const reviewPath = path.join(project.workspace, 'review.json');
  let previousArtifact: Buffer | undefined;
  try { previousArtifact = await fs.readFile(await safeFile(project.workspace, 'review.json')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  project.reviewHistory = [...(project.reviewHistory ?? []), record];
  project.feedback = note; project.updatedAt = record.createdAt;
  if (decision === 'approved') {
    project.approvedAt = record.createdAt; project.status = 'approved';
    project.stages.find(stage => stage.id === 'review')!.status = 'complete';
  } else {
    project.approvedAt = undefined; project.exportedTo = undefined; project.executable = undefined;
    project.stages.find(stage => stage.id === 'deliver')!.status = 'queued';
  }
  const temporary = path.join(project.workspace, '.review-' + randomUUID() + '.tmp');
  let published = false;
  try {
    await fs.writeFile(temporary, JSON.stringify({ ...record, approvedAt: project.approvedAt,
      scope: 'Prototype delivery only. Operational readiness is unverified.', history: project.reviewHistory }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    await fs.rename(temporary, reviewPath); published = true;
    await store.save();
  } catch (error) {
    for (const key of Object.keys(project)) delete (project as unknown as Record<string, unknown>)[key];
    Object.assign(project, previous);
    if (published) {
      if (previousArtifact) {
        await fs.writeFile(temporary, previousArtifact, { flag: 'wx', mode: 0o600 });
        await fs.rename(temporary, reviewPath);
      } else await fs.rm(reviewPath, { force: true });
    }
    throw error;
  } finally { await fs.rm(temporary, { force: true }); }
  return record;
}

// Prior source is reference material. Old test results and evaluation answer keys must not
// become evidence for the iteration, and old tests must not execute from this directory.
const excluded = new Set(['test-report.json', 'review.json', 'DELIVERY.md', 'evaluation-plan.json', 'visual-review.json']);
export async function copyReviewSource(from: string, to: string): Promise<string> {
  await fs.mkdir(to, { recursive: true, mode: 0o700 });
  for (const file of await listArtifacts(from)) {
    if (excluded.has(file.path) || file.path.split(path.sep).some(part => part.startsWith('.'))) continue;
    const target = path.join(to, file.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(await safeFile(from, file.path), target);
  }
  return sourceHash(to);
}

export function reviewIterationPrompt(record: ReviewRecord): string {
  return ['## Requested review changes',
    'This is another iteration of the existing app. Read the previous implementation and planning context in .review-source/. Reuse working code and behavior while addressing the reviewer comments below. The previous run is preserved.',
    'Research and planning must account for each comment, and verification must check the requested corrections. Original requirements and independent verification still apply. Preserve .review-source/ as reference material; its old tests do not count as current evidence.',
    'Reviewed run: ' + record.runId, 'Reviewer comments:', record.feedback].join('\n\n');
}

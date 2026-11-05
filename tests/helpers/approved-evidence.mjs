import { reportHash } from '../../dist-electron/electron/delivery.js';
import { judgeAccepted, judgeGaps } from '../../dist-electron/shared/verification.js';

// Synthetic admission state for tests of deeper delivery validation. This is not a native run receipt.
export function bindSyntheticApproval(project) {
  project.runId ??= 'synthetic-approved-run';
  project.feedback ??= '';
  project.stages = [{ id: 'review', status: 'complete' }];
  project.processScope = { runId: project.runId, marker: 'synthetic-marker', cleanup: 'confirmed' };
  project.verification = { runId: project.runId, reportHash: reportHash(project.report) };
  project.approval = { runId: project.runId, reportHash: project.verification.reportHash, sourceHash: project.report.sourceHash,
    approvedAt: project.approvedAt, feedback: project.feedback,
    ...(!judgeAccepted(project.report) ? { judgeGapsAccepted: true, acceptedJudgeGaps: structuredClone(judgeGaps(project.report)) } : {}) };
}

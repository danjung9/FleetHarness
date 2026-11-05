import type { JourneyResult } from '../shared/quality.js';
import type { QualityContract, ApplicationVerificationLimits } from './quality.js';
import { assertQualityContract } from './quality.js';
import { verifyBrowserJourneys } from './browser-verification.js';
import { prepareSolutionRuntime } from './solution-runtime.js';
import { runtimeFilesHash } from './visual-review.js';
import { ClassifiedExecutionFailure } from './execution-failure.js';
import type { RepairObservation } from './functional-repair.js';
import type { AgentBrowserSession } from './agent-browser.js';

/** Development feedback only; final verification reruns the entire frozen plan. */
export interface WorkflowCheckpointReport {
  schemaVersion: 1;
  contractHash: string;
  filesHash: string;
  journeyId: string;
  status: 'passed' | 'failed';
  journeys: JourneyResult[];
  errors: string[];
  /** Host-recorded Playwright exploration, separate from frozen acceptance replay. */
  uiFlow?: { errors: string[]; report?: ReturnType<AgentBrowserSession['flowReport']> };
}

export async function verifyPrimaryWorkflow(root: string, executable: string, contract: QualityContract,
  signal: AbortSignal, options: Partial<ApplicationVerificationLimits> & { prepareRuntime?: typeof prepareSolutionRuntime } = {}): Promise<WorkflowCheckpointReport> {
  await assertQualityContract(root, contract);
  if (!contract.solution || contract.solution.runtime.profile === 'cli') throw new Error('A primary browser workflow requires a browser or service contract.');
  const journey = contract.plan.journeys.find(item => item.kind === 'primary');
  if (!journey) throw new Error('The frozen plan has no primary user workflow.');
  const filesHash = await runtimeFilesHash(root, contract.solution.runtime);
  const report = await verifyBrowserJourneys({ root, plan: { ...contract.plan, journeys: [journey] }, ux: contract.ux,
    contractHash: contract.hash, signal, allowSameOrigin: true,
    timeoutMs: options.browserTimeoutMs, stepTimeoutMs: options.browserStepTimeoutMs,
    prepareRuntime: async browserSignal => {
      const runtime = await (options.prepareRuntime ?? prepareSolutionRuntime)(root, contract.solution!.runtime, executable, browserSignal);
      if (runtime.provenance.filesHash !== filesHash) {
        await runtime.close();
        throw new ClassifiedExecutionFailure('integrity', 'Application files changed during the primary workflow checkpoint.');
      }
      return runtime;
    } });
  signal.throwIfAborted();
  await assertQualityContract(root, contract);
  if (await runtimeFilesHash(root, contract.solution.runtime) !== filesHash) {
    throw new ClassifiedExecutionFailure('integrity', 'Application files changed during the primary workflow checkpoint.');
  }
  const passed = report.errors.length === 0 && ['desktop', 'narrow'].every(viewport =>
    report.journeys.some(item => item.id === journey.id && item.viewport === viewport && item.status === 'passed'));
  return { schemaVersion: 1, contractHash: contract.hash, filesHash, journeyId: journey.id,
    status: passed ? 'passed' : 'failed', ...report };
}

export function workflowRepairObservation(report: WorkflowCheckpointReport): RepairObservation {
  const failures: string[] = [];
  const metrics: Record<string, number> = {};
  for (const viewport of ['desktop', 'narrow']) {
    const journey = report.journeys.find(item => item.id === report.journeyId && item.viewport === viewport);
    const id = `workflow:${report.journeyId}:${viewport}`;
    if (journey?.status !== 'passed') failures.push(id);
    metrics[id] = journey?.completedSteps ?? (journey?.status === 'passed' ? 1 : 0);
  }
  if (report.errors.length) failures.push('workflow:execution');
  if (report.uiFlow) {
    if (report.uiFlow.errors.length) failures.push('workflow:ui-flow');
    metrics['workflow:ui-flow'] = -report.uiFlow.errors.length;
  }
  return { failures, metrics };
}

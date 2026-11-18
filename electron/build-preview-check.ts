import type { BrowserStep, JourneyResult } from '../shared/quality.js';
import { verifyBrowserJourneys } from './browser-verification.js';
import { ClassifiedExecutionFailure } from './execution-failure.js';
import type { QualityContract } from './quality.js';
import { redactSecrets } from './secrets.js';
import { prepareSolutionRuntime } from './solution-runtime.js';
import { VerificationShutdownError } from './verification.js';

const quote = (text: string) => JSON.stringify(redactSecrets(text).slice(0, 120));

function expectedStep(step: BrowserStep): string {
  switch (step.action) {
    case 'expectText': return `${step.selector} to display ${quote(step.text)}`;
    case 'expectValue': return `${step.selector} to have value ${quote(step.value)}`;
    case 'expectVisible': return `${step.selector} to be visible`;
    case 'expectHidden': return `${step.selector} to be hidden or absent`;
    case 'expectScreen': return `screen ${step.screenId}`;
    case 'expectServiceState': return 'the frozen service response';
    case 'expectHttpError': return `HTTP ${step.status} for ${step.method} ${step.path}`;
    case 'expectDownload': return `a download from ${step.selector}${step.fileName ? ` named ${quote(step.fileName)}` : ''}${step.text ? ` containing ${quote(step.text)}` : ''}`;
    default: return `${step.action}${'selector' in step ? ` on ${step.selector}` : ''} to complete`;
  }
}

function failureDetail(detail: string, steps: BrowserStep[]): string {
  const observation = redactSecrets(detail).split('\n')[0].trim();
  const failure = /^Step (\d+): (.+)$/.exec(observation);
  const step = failure && steps[Number(failure[1]) - 1];
  if (failure && step) {
    if (/\bexpected\b.*\breceived\b/i.test(failure[2])) return observation;
    return redactSecrets(`Step ${failure[1]} expected ${expectedStep(step)}. Observed ${failure[2]}`).slice(0, 1200);
  }
  if (observation.startsWith('Step load: ')) {
    return 'Expected the application to load. Observed ' + observation.slice('Step load: '.length, 1200);
  }
  return 'Expected the browser journey to pass. Observed ' + observation.slice(0, 1200);
}

/** Collect development feedback on one frozen journey with a fresh runtime. */
export async function checkBuildPreview(snapshotRoot: string, executable: string, contract: QualityContract, journeyId: string,
  signal: AbortSignal, viewport: JourneyResult['viewport'] = 'desktop'): Promise<{ passed: boolean; detail: string }> {
  signal.throwIfAborted();
  const manifest = contract.solution?.runtime;
  const journey = contract.plan.journeys.find(candidate => candidate.id === journeyId);
  if (!manifest || manifest.profile === 'cli' || !journey) {
    return { passed: false, detail: 'A frozen browser journey and a browser or service runtime are required.' };
  }
  try {
    const report = await verifyBrowserJourneys({
      root: snapshotRoot, plan: { ...contract.plan, journeys: [journey] }, ux: contract.ux, contractHash: contract.hash,
      signal, viewports: [viewport], evidence: 'diagnostic', timeoutMs: 30_000, stepTimeoutMs: 3_000,
      allowSameOrigin: true,
      prepareRuntime: browserSignal => prepareSolutionRuntime(snapshotRoot, manifest, executable, browserSignal),
    });
    signal.throwIfAborted();
    const result = report.journeys.find(item => item.id === journeyId && item.viewport === viewport);
    if (result?.status === 'passed' && !report.errors.length) return { passed: true, detail: result.detail };
    return { passed: false, detail: failureDetail(result?.detail || report.errors[0] || 'No browser outcome was recorded.', journey.steps) };
  } catch (error) {
    if (error instanceof VerificationShutdownError || (error instanceof ClassifiedExecutionFailure && error.classification !== 'implementation')) throw error;
    signal.throwIfAborted();
    return { passed: false, detail: failureDetail(error instanceof Error ? error.message : String(error), journey.steps) };
  }
}

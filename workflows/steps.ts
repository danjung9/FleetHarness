import { prepareBuild, pollBuild, prepareVerification, pollVerification, failBuild } from '../server/build-control.js';

// Keep directives on their own lines: Workflow's discovery pre-scan skips inline directives.
export async function prepare(runId: string, epoch: number) {
  'use step';
  return prepareBuild(runId, epoch);
}
export async function progress(runId: string, epoch: number) {
  'use step';
  return pollBuild(runId, epoch);
}
export async function verify(runId: string, epoch: number) {
  'use step';
  return prepareVerification(runId, epoch);
}
export async function verificationProgress(runId: string, epoch: number) {
  'use step';
  return pollVerification(runId, epoch);
}
export async function failure(runId: string, epoch: number) {
  'use step';
  return failBuild(runId, epoch);
}

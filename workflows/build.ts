import { sleep } from 'workflow';
import { prepareBuild, pollBuild, prepareVerification, pollVerification, failBuild } from '../server/build-control.js';

export async function buildWorkflow(runId: string, epoch: number) {
  'use workflow';
  try {
    if (!await prepare(runId, epoch)) return;
    for (let poll = 0; poll < 240; poll++) {
      const state = await progress(runId, epoch);
      if (state === 'done') return;
      if (state === 'verify') {
        if (!await verify(runId, epoch)) return;
        for (let check = 0; check < 80; check++) {
          if (await verificationProgress(runId, epoch)) return;
          await sleep('10s');
        }
        break;
      }
      await sleep('10s');
    }
    await failure(runId, epoch);
  } catch { await failure(runId, epoch); }
}
async function prepare(runId: string, epoch: number) { 'use step'; return prepareBuild(runId, epoch); }
async function progress(runId: string, epoch: number) { 'use step'; return pollBuild(runId, epoch); }
async function verify(runId: string, epoch: number) { 'use step'; return prepareVerification(runId, epoch); }
async function verificationProgress(runId: string, epoch: number) { 'use step'; return pollVerification(runId, epoch); }
async function failure(runId: string, epoch: number) { 'use step'; return failBuild(runId, epoch); }

import { sleep } from 'workflow';
import { prepare, progress, verify, verificationProgress, failure } from './steps.js';

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

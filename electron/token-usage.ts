import { randomUUID } from 'node:crypto';
import type { Project } from '../shared/types.js';
import { mergeTokenUsage, type TokenTotals, type TokenUsageSession } from '../shared/token-usage.js';

/** One recorder per model session, including sessions interrupted before reporting. */
export function tokenUsageRecorder(project: Project, metadata: Pick<TokenUsageSession, 'source' | 'model' | 'runId' | 'stage'>,
  save: () => Promise<void>, notify: () => void) {
  const startedAt = new Date().toISOString();
  const session: TokenUsageSession = { ...metadata, id: randomUUID(), startedAt, updatedAt: startedAt };
  return async (totals: TokenTotals | undefined) => {
    if (totals) session.totals = totals;
    session.updatedAt = new Date().toISOString();
    project.tokenUsage = mergeTokenUsage(project.tokenUsage, { version: 1, startedAt, sessions: [session] });
    notify(); await save();
  };
}

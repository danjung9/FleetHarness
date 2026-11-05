export interface CodexGoalActivity {
  id: string;
  at: string;
  kind: 'message' | 'command' | 'file' | 'info';
  text: string;
  status?: 'running' | 'completed' | 'failed';
}

/** A headless Codex goal, separate from the pipeline's independent verification. */
export interface CodexGoalLaunch {
  id: string;
  workspace: string;
  createdAt: string;
  // `opened` identifies legacy Terminal handoffs saved by older versions.
  status: 'prepared' | 'running' | 'stopping' | 'completed' | 'stopped' | 'blocked' | 'opened' | 'failed';
  threadId?: string;
  error?: string;
  updatedAt?: string;
  finishedAt?: string;
  activity?: CodexGoalActivity[];
  processScope?: { marker: string; cleanup: 'pending' | 'confirmed' | 'unconfirmed' };
}

export const codexGoalActive = (goal?: CodexGoalLaunch) => !!goal && (['prepared', 'running', 'stopping'].includes(goal.status)
  || !!goal.processScope && goal.processScope.cleanup !== 'confirmed');

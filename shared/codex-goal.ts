/** A handoff to an independent CLI session, not a tracked or verified build. */
export interface CodexGoalLaunch {
  id: string;
  workspace: string;
  createdAt: string;
  status: 'prepared' | 'opened' | 'failed';
  threadId?: string;
  error?: string;
}

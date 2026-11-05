export type StageId = 'intake' | 'research' | 'plan' | 'build' | 'verify' | 'review' | 'deliver';
export type StageStatus = 'queued' | 'active' | 'complete' | 'failed' | 'review';
export type RunStatus = 'draft' | 'running' | 'stopped' | 'failed' | 'review' | 'approved' | 'delivered';
export type View = 'portfolio' | 'factory' | 'design' | 'workspace' | 'agents' | 'requirements' | 'evidence' | 'delivery' | 'artifacts' | 'settings' | 'connectors';
/** Token counts reported by the engine, never estimates. Reasoning is part of output. */
export interface StageTokenUsage {
  inputTokens: number | null; cachedInputTokens: number | null; uncachedInputTokens: number | null;
  outputTokens: number | null; reasoningOutputTokens: number | null; totalTokens: number | null;
  uncachedPlusOutputTokens: number | null;
}
export interface StageMetrics {
  startedAt: string; finishedAt: string | null; durationMs: number | null;
  agentAttempts: number; inferenceDurationMs: number; usage: StageTokenUsage | null;
}
export interface Stage { id: StageId; label: string; detail: string; status: StageStatus; metrics?: StageMetrics }
export interface ToolEvent { callId: string; name: string; phase: 'start' | 'complete' | 'error'; target?: string }
export interface LogEntry { id: string; time: string; stage: StageId; kind: 'info' | 'text' | 'tool' | 'error'; text: string; tool?: ToolEvent }
export interface TestReport {
  time: string; command: string; exitCode: number | null; passed: number; failed: number;
  skipped: number; total: number; output: string; durationMs: number; sourceHash: string;
  stageMetrics?: (StageMetrics & { stage: StageId })[];
  independentJudge?: import('../electron/independent-judge.js').IndependentJudgment;
  quality?: import('./quality.js').QualityReport;
  registeredTests?: { file: string; tests: number }[];
  portableCommand?: string;
  provenance?: { runner: string; args: string[]; cwd: string; environment: Record<string, string | undefined> };
  testBaseline?: { hashes: Record<string, string>; changes: string[]; policy: string };
}
export interface BriefDataInput { name: string; kind: 'file' | 'text'; content: string }
export interface BriefContext { inputs?: string; outputs?: string; resources?: string; links?: string[]; dataInputs?: BriefDataInput[]; connectedData?: import('./connectors.js').ConnectedDataSelection[] }
export interface RunCheckpoint {
  data?: import('../electron/brief-data.js').BriefDataSnapshot;
  foundation?: import('../harness/foundations.js').FoundationSnapshot;
  clarifications?: string;
  version: 1;
  briefHash: string;
  requirementsHash: string;
  packetHash: string;
  context: string;
  connectedContextHash?: string;
  qualityHash?: string;
  planHash?: string;
  planBodies?: [string, string][];
  repairAttempts: number;
  // Missing or interrupted shutdown evidence cannot authorize workspace recovery.
  writerState?: 'active' | 'idle' | 'unconfirmed';
  verificationAgent?: 'started' | 'complete';
  repairStopped?: boolean;
  buildTests?: Record<string, string>;
  buildTestContents?: Record<string, string>;
  lastTests?: Record<string, string>;
  testChanges?: string[];
  backgroundJob?: boolean; // Legacy metadata; cleanup evidence determines safe resume.
  review?: ReviewRecord;
  reviewSourceHash?: string;
}
export interface ReviewRecord {
  id: string; runId: string; decision: 'approved' | 'changes_requested'; feedback: string; createdAt: string;
  sourceHash?: string; nextRunId?: string;
}
export interface Project extends BriefContext {
  reviewHistory?: ReviewRecord[];
  processScope?: { runId: string; marker: string; cleanup: 'pending' | 'confirmed' | 'unconfirmed' };
  verification?: { runId: string; reportHash: string };
  approval?: { runId: string; sourceHash: string; reportHash: string; approvedAt: string; feedback: string; scope: string; id?: string; decision?: ReviewRecord['decision']; createdAt?: string; history?: ReviewRecord[] };
  runCheckpoint?: RunCheckpoint;
  conversation?: import('./conversation.js').ProjectConversation;
  qualityVersion?: 1 | 2 | 3;
  visualReview?: import('./visual-review.js').VisualReviewReport;
  runtimeProfile?: 'browser' | 'cli' | 'service';
  executable?: { status: 'packaging' | 'ready' | 'failed'; platform: string; arch: string; fileName: string; savedTo?: string; error?: string };
  phasePlan?: import('../harness/phases.js').PhaseContract[];
  globalTools?: string[];
  backend?: AgentBackend;
  systemDesign?: import('./system-design.js').SystemDesign;
  challengeId?: string;
  sourceChallenge?: import('../harness/types.js').Challenge;
  id: string; title: string; description: string; criteria: string[]; createdAt: string; updatedAt: string;
  status: RunStatus; stages: Stage[]; logs: LogEntry[]; runId?: string; workspace?: string;
  /** Stage backed by a private host recovery checkpoint; offers resume after failure or Stop. */
  resumeStage?: StageId;
  model?: string; report?: TestReport; feedback: string; approvedAt?: string; exportedTo?: string; error?: string;
}
export type AgentBackend = 'pi' | 'codex';
export interface AgentModel { id: string; provider: string; name: string; configured: boolean; backend?: AgentBackend }
export interface Settings { backend?: AgentBackend; provider: string; model: string; rememberKey: boolean; developerMode?: boolean }
export interface ChatGPTAccount {
  status: 'disconnected' | 'connecting' | 'connected' | 'unavailable';
  authType?: 'chatgpt' | 'apiKey';
  email?: string; plan?: string; error?: string;
  activeAccountId?: string;
  accounts?: { id: string; label: string; email?: string; connected: boolean }[];
  planUsageEnabled?: boolean;
  limits?: { label: string; usedPercent: number; resetsAt: number | null }[];
}
export interface AppState { version: 1; projects: Project[]; settings: Settings; norfolkCatalog?: import('../harness/norfolk.js').NorfolkCatalog }
export interface GenAiMilIssue { message: string; nextStep: string; unlockUrl?: string; replacementModel?: string; retryAt?: number }
export interface GenAiMilConnection { address: string; hasKey: boolean; connected: boolean; models: string[]; issue?: GenAiMilIssue }
export interface Bootstrap { state: AppState; models: AgentModel[]; storagePath: string; credentialStatus: string; runtime: string; chatgpt?: ChatGPTAccount; capabilities?: { projectConversation: boolean }; genAiMil?: GenAiMilConnection }
export interface NewProject extends BriefContext { title: string; description: string; criteria: string[]; challengeId?: string }
export interface Artifact { path: string; size: number }
export interface FleetAPI {
  connectors?: import('./connectors.js').ConnectorsAPI;
  sendMessage(id: string, text: string): Promise<void>;
  cancelMessage(id: string): Promise<void>;
  answerClarification(id: string, questionId: string, answer: string | import('./conversation.js').ClarificationAnswer): Promise<void>;
  applyConversationAction(id: string, actionId: string): Promise<void>;
  dismissConversationAction(id: string, actionId: string): Promise<void>;
  bootstrap(): Promise<Bootstrap>;
  refreshNorfolkCatalog(): Promise<import('../harness/norfolk.js').NorfolkCatalog>;
  createProject(input: NewProject): Promise<Project>;
  updateProject(id: string, input: NewProject): Promise<Project>;
  startRun(id: string): Promise<void>;
  // Optional for web-only clients that cannot execute backend builds.
  resumeRun(id: string): Promise<void>;
  stopRun(id: string): Promise<void>;
  approve(id: string, feedback: string): Promise<void>;
  requestChanges(id: string, feedback: string): Promise<void>;
  exportProject(id: string): Promise<string | null>;
  downloadExecutable(id: string): Promise<string | null>;
  artifacts(id: string): Promise<Artifact[]>;
  readArtifact(id: string, file: string): Promise<string>;
  visualReviewImage(id: string, captureId: string): Promise<string>;
  preview(id: string): Promise<string | null>;
  openWorkspace(id: string): Promise<void>;
  setDeveloperMode(enabled: boolean): Promise<Bootstrap>;
  saveSettings(settings: Settings, apiKey?: string): Promise<Bootstrap>;
  saveGenAiMil?(address: string, key?: string): Promise<Bootstrap>;
  connectGenAiMil?(): Promise<Bootstrap>;
  clearGenAiMil?(): Promise<Bootstrap>;
  openGenAiMilUnlock?(): Promise<void>;
  connectChatGPT(accountId?: string): Promise<Bootstrap>;
  selectChatGPTAccount(accountId: string): Promise<Bootstrap>;
  reopenChatGPTLogin(): Promise<Bootstrap>;
  manageChatGPTUsage(): Promise<void>;
  connectCodexKey?(apiKey: string): Promise<Bootstrap>;
  cancelChatGPTLogin(): Promise<Bootstrap>;
  disconnectChatGPT(): Promise<Bootstrap>;
  refreshChatGPT(): Promise<Bootstrap>;
  onState(callback: (state: AppState) => void): () => void;
}
export const stageDefinitions: Stage[] = [
  { id: 'intake', label: 'Challenge intake', detail: 'Problem & constraints', status: 'queued' },
  { id: 'research', label: 'Research', detail: 'Reuse & architecture', status: 'queued' },
  { id: 'plan', label: 'Plan', detail: 'Tasks & acceptance tests', status: 'queued' },
  { id: 'build', label: 'Build', detail: 'Implementation agent', status: 'queued' },
  { id: 'verify', label: 'Verify', detail: 'Tests & repair', status: 'queued' },
  { id: 'review', label: 'Human review', detail: 'Evidence & decision', status: 'queued' },
  { id: 'deliver', label: 'Deliver', detail: 'Source & evidence bundle', status: 'queued' }
];
export const starters: NewProject[] = [
  {
    title: 'Operational-message parser',
    description: 'Extract structured tasks, events, deadlines, and exact source references from synthetic operational messages. Let a reviewer paste a message, inspect the extracted fields, and export JSON. Keep processing local and flag ambiguous dates for human review.',
    criteria: ['Extract tasks and events from representative synthetic messages.', 'Preserve an exact source excerpt for every extracted item.', 'Flag ambiguous or missing dates instead of inventing values.', 'Handle empty and malformed messages without crashing.', 'Run the delivered application offline in a browser.']
  },
  {
    title: 'Training deconfliction',
    description: 'Build a training schedule from personnel, time slots, and shared resources. Detect overlapping assignments and explain infeasible constraints. Include editable synthetic examples and a clear schedule view.',
    criteria: ['Detect overlapping personnel and resource assignments.', 'Reject invalid time ranges with actionable errors.', 'Explain when no feasible schedule exists.', 'Allow users to edit and export a synthetic schedule.']
  },
  {
    title: 'Offline-first workflow',
    description: 'Build a local task board with persistent offline edits and an explicit synchronization simulator. Demonstrate a two-replica conflict and let a reviewer resolve it. Clearly label the simulated remote service.',
    criteria: ['Persist edits across browser reloads.', 'Queue edits while the simulated connection is offline.', 'Surface conflicting edits without silently losing data.', 'Show an inspectable sync history using synthetic data.']
  }
];

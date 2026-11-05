import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import type {
  CandidateOutcome, CandidateRecord, EvidenceEdge, EvidenceObservation, ExperimentRecord,
  ExperimentSummary, ForgetResult, LearningSettings, LessonRecord, MemorySnapshot,
  PolicyDecision, PolicySnapshot, PreferenceRecord, PromotionOutboxRecord,
} from '../shared/learning.js';
import { defaultLearningSettings } from '../shared/learning.js';

const canonical = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);
const now = () => new Date().toISOString();
export function candidateSucceeded(outcome: CandidateOutcome | undefined): boolean | null {
  if (!outcome || outcome.terminalReason === 'cancelled' || outcome.terminalReason === 'infrastructure') return null;
  return outcome.terminalReason === 'completed' && outcome.mandatoryPassed && outcome.requiredScopePassed && outcome.withinBudget;
}
export interface RoutingState { credit: number; consecutiveFailures: number; rolledBack: boolean }
function identifier(value: string, name: string) {
  if (typeof value !== 'string' || !value.trim() || value.length > 512) throw new Error(`Invalid ${name}.`);
}
function immutableFields(before: Record<string, unknown>, after: Record<string, unknown>, fields: string[]) {
  for (const field of fields) if (!same(before[field], after[field])) throw new Error(`Cannot change immutable ${field}.`);
}

/** Host-only SQLite sidecar. Public renderer projections are explicitly constructed below. */
export class LearningStore {
  readonly file: string;
  private database?: DatabaseSync;
  private depth = 0;
  constructor(readonly root: string) { this.file = path.join(root, 'learning.sqlite'); }
  async init(): Promise<void> {
    if (this.database) return;
    await fs.mkdir(this.root, { recursive: true, mode: 0o700 });
    try { if ((await fs.lstat(this.file)).isSymbolicLink()) throw new Error('Learning database cannot be a symbolic link.'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const database = new DatabaseSync(this.file);
    try {
      database.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
      if (database.prepare('PRAGMA quick_check').get()?.quick_check !== 'ok') throw new Error('Learning database integrity check failed.');
      const version = Number(database.prepare('PRAGMA user_version').get()?.user_version);
      if (version > 3) throw new Error('Unsupported learning database version.');
      if (version === 0) {
        database.exec(`BEGIN IMMEDIATE;
          CREATE TABLE settings (id TEXT PRIMARY KEY, body TEXT NOT NULL);
          CREATE TABLE lineage_partitions (lineage_id TEXT PRIMARY KEY, partition TEXT NOT NULL);
          CREATE TABLE experiments (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, lineage_id TEXT NOT NULL, partition TEXT NOT NULL, cohort_key TEXT NOT NULL, body TEXT NOT NULL);
          CREATE INDEX experiments_project ON experiments(project_id);
          CREATE INDEX experiments_cohort ON experiments(cohort_key);
          CREATE TABLE candidates (id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE, body TEXT NOT NULL);
          CREATE INDEX candidates_experiment ON candidates(experiment_id);
          CREATE TABLE preferences (id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL UNIQUE REFERENCES experiments(id) ON DELETE CASCADE, body TEXT NOT NULL);
          CREATE TABLE observations (id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE, candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE, body TEXT NOT NULL);
          CREATE TABLE lessons (id TEXT PRIMARY KEY, lesson_key TEXT NOT NULL UNIQUE, body TEXT NOT NULL);
          CREATE VIRTUAL TABLE lesson_search USING fts5(lesson_id UNINDEXED, statement, conditions, task_family);
          CREATE TABLE memory_snapshots (id TEXT PRIMARY KEY, body TEXT NOT NULL);
          CREATE TABLE invalidated_memory (id TEXT PRIMARY KEY, reason TEXT NOT NULL);
          CREATE TABLE policies (id TEXT PRIMARY KEY, cohort_key TEXT NOT NULL, status TEXT NOT NULL, reason TEXT, body TEXT NOT NULL);
          CREATE INDEX policies_cohort ON policies(cohort_key);
          CREATE TABLE decisions (id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL UNIQUE REFERENCES experiments(id) ON DELETE CASCADE, body TEXT NOT NULL);
          CREATE TABLE routing_state (cohort_key TEXT PRIMARY KEY, body TEXT NOT NULL);
          CREATE TABLE edges (from_type TEXT NOT NULL, from_id TEXT NOT NULL, relation TEXT NOT NULL, to_type TEXT NOT NULL, to_id TEXT NOT NULL,
            PRIMARY KEY(from_type,from_id,relation,to_type,to_id));
          CREATE INDEX edges_target ON edges(to_type,to_id);
          CREATE TABLE promotion_outbox (id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL UNIQUE REFERENCES experiments(id) ON DELETE CASCADE, candidate_id TEXT NOT NULL REFERENCES candidates(id), status TEXT NOT NULL, body TEXT NOT NULL);
          PRAGMA user_version=1; COMMIT;`);
      }
      if (version < 2) database.exec(`BEGIN IMMEDIATE;
        ALTER TABLE promotion_outbox RENAME TO promotion_outbox_v1;
        CREATE TABLE promotion_outbox (id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
          candidate_id TEXT NOT NULL REFERENCES candidates(id), status TEXT NOT NULL, body TEXT NOT NULL);
        INSERT INTO promotion_outbox SELECT * FROM promotion_outbox_v1;
        DROP TABLE promotion_outbox_v1;
        CREATE INDEX promotion_outbox_experiment ON promotion_outbox(experiment_id);
        PRAGMA user_version=2; COMMIT;`);
      if (version < 3) database.exec(`BEGIN IMMEDIATE;
        ALTER TABLE lineage_partitions ADD COLUMN first_experiment_id TEXT;
        UPDATE lineage_partitions SET first_experiment_id=(SELECT id FROM experiments WHERE lineage_id=lineage_partitions.lineage_id ORDER BY rowid LIMIT 1);
        PRAGMA user_version=3; COMMIT;`);
      this.database = database;
      await fs.chmod(this.file, 0o600);
    } catch (error) { database.close(); throw error; }
  }
  close(): void { this.database?.close(); this.database = undefined; }
  private get db(): DatabaseSync { if (!this.database) throw new Error('Learning store is not initialized.'); return this.database; }
  transaction<T>(work: () => T): T {
    const level = this.depth++, savepoint = `learning_${level}`;
    this.db.exec(level ? `SAVEPOINT ${savepoint}` : 'BEGIN IMMEDIATE');
    try {
      const result = work();
      if (result && typeof (result as { then?: unknown }).then === 'function') throw new Error('Learning transactions must be synchronous.');
      this.db.exec(level ? `RELEASE SAVEPOINT ${savepoint}` : 'COMMIT'); return result;
    } catch (error) {
      this.db.exec(level ? `ROLLBACK TO SAVEPOINT ${savepoint}; RELEASE SAVEPOINT ${savepoint}` : 'ROLLBACK'); throw error;
    } finally { this.depth--; }
  }
  private body<T>(table: string, id: string): T | undefined {
    const row = this.db.prepare(`SELECT body FROM ${table} WHERE id=?`).get(id);
    return row ? JSON.parse(String(row.body)) as T : undefined;
  }
  private bodies<T>(table: string, clause = '', args: string[] = []): T[] {
    return this.db.prepare(`SELECT body FROM ${table} ${clause}`).all(...args).map(row => JSON.parse(String(row.body)) as T);
  }
  getSettings(): LearningSettings { return { ...defaultLearningSettings, ...this.body<LearningSettings>('settings', 'settings') }; }
  setSettings(patch: Partial<LearningSettings>): LearningSettings {
    const value = { ...this.getSettings(), ...patch, schemaVersion: 1 as const };
    if (!['off', 'paired', 'adaptive'].includes(value.mode) || typeof value.memoryEnabled !== 'boolean' || typeof value.automaticComparisons !== 'boolean'
      || !Number.isInteger(value.maxHumanRequestsPerDay) || value.maxHumanRequestsPerDay < 0 || value.maxHumanRequestsPerDay > 2) throw new Error('Invalid learning settings.');
    this.db.prepare('INSERT INTO settings(id,body) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run('settings', canonical(value)); return value;
  }
  createExperiment(value: ExperimentRecord): ExperimentRecord {
    return this.transaction(() => {
      for (const field of ['id', 'projectId', 'lineageId', 'cohortKey'] as const) identifier(value[field], field);
      if (!['development', 'validation', 'holdout', 'test'].includes(value.partition)) throw new Error('Invalid learning partition.');
      const existing = this.getExperiment(value.id);
      if (existing) { if (!same(existing, value)) throw new Error('Experiment id already records different content.'); return existing; }
      const lineage = this.db.prepare('SELECT partition FROM lineage_partitions WHERE lineage_id=?').get(value.lineageId);
      if (lineage && lineage.partition !== value.partition) throw new Error('A task lineage cannot cross learning partitions.');
      this.db.prepare('INSERT OR IGNORE INTO lineage_partitions(lineage_id,partition,first_experiment_id) VALUES(?,?,?)').run(value.lineageId, value.partition, value.id);
      this.db.prepare('INSERT INTO experiments VALUES(?,?,?,?,?,?)').run(value.id, value.projectId, value.lineageId, value.partition, value.cohortKey, canonical(value));
      return structuredClone(value);
    });
  }
  getExperiment(id: string): ExperimentRecord | undefined { return this.body('experiments', id); }
  getLineagePartition(lineageId: string): ExperimentRecord['partition'] | undefined {
    return this.db.prepare('SELECT partition FROM lineage_partitions WHERE lineage_id=?').get(lineageId)?.partition as ExperimentRecord['partition'] | undefined;
  }
  listExperiments(projectId?: string): ExperimentRecord[] { return this.bodies('experiments', projectId ? 'WHERE project_id=? ORDER BY rowid' : 'ORDER BY rowid', projectId ? [projectId] : []); }
  canEnrollValidation(id: string): boolean {
    const experiment = this.getExperiment(id); if (!experiment || experiment.partition !== 'development' || experiment.mode !== 'paired'
      || experiment.decisionId || experiment.candidateIds.length || experiment.policySnapshotId) return false;
    const lineage = this.db.prepare('SELECT partition,first_experiment_id FROM lineage_partitions WHERE lineage_id=?').get(experiment.lineageId);
    return lineage?.partition === 'development' && lineage.first_experiment_id === id
      && !this.db.prepare('SELECT id FROM experiments WHERE lineage_id=? AND id!=? LIMIT 1').get(experiment.lineageId, id);
  }
  /** Shared planning resolves context; enrollment still precedes every decision and candidate outcome. */
  enrollValidation(id: string, policyId: string): ExperimentRecord {
    return this.transaction(() => {
      if (!this.canEnrollValidation(id)) throw new Error('Validation enrollment requires a new lineage before candidate decisions or evidence.');
      const experiment = this.getExperiment(id)!, policy = this.getPolicy(policyId);
      if (!policy || policy.validation || policy.status !== 'shadow' || policy.cohortKey !== experiment.cohortKey
        || Date.parse(policy.createdAt) > Date.parse(experiment.createdAt)) throw new Error('Validation enrollment requires an earlier frozen proposal in this cohort.');
      if (this.listExperiments().filter(item => item.mode === 'holdout' && item.policySnapshotId === policyId).length >= 12) throw new Error('The frozen validation batch already contains twelve tasks.');
      const next: ExperimentRecord = { ...experiment, partition: 'validation', mode: 'holdout', policySnapshotId: policyId, updatedAt: now() };
      this.db.prepare('UPDATE lineage_partitions SET partition=? WHERE lineage_id=?').run('validation', experiment.lineageId);
      this.db.prepare('UPDATE experiments SET partition=?,body=? WHERE id=?').run('validation', canonical(next), id);
      return next;
    });
  }
  updateExperiment(id: string, patch: Partial<ExperimentRecord>): ExperimentRecord {
    const previous = this.getExperiment(id); if (!previous) throw new Error('Experiment not found.');
    const next = { ...previous, ...patch, updatedAt: patch.updatedAt ?? now() };
    immutableFields(previous as unknown as Record<string, unknown>, next as unknown as Record<string, unknown>, ['id', 'projectId', 'lineageId', 'partition', 'createdAt', 'briefFingerprint', 'modelConfig', 'settingsSnapshot', 'profileSnapshots', 'sourceProject']);
    for (const field of ['objectiveHash', 'executionOrder', 'decisionId', 'memorySnapshotId', 'policySnapshotId', 'eligibleProfileIds', 'comparisonProfileIds'] as const) {
      if (previous[field] !== undefined && !same(previous[field], next[field])) throw new Error(`Cannot change frozen ${field}.`);
    }
    if (previous.decisionId && next.cohortKey !== previous.cohortKey) throw new Error('Decision cohort is frozen.');
    if (next.candidateIds.length > 2 || new Set(next.candidateIds).size !== next.candidateIds.length) throw new Error('An experiment supports at most two distinct candidates.');
    this.db.prepare('UPDATE experiments SET cohort_key=?,body=? WHERE id=?').run(next.cohortKey, canonical(next), id); return next;
  }
  putCandidate(value: CandidateRecord): CandidateRecord {
    return this.transaction(() => {
      const experiment = this.getExperiment(value.experimentId); if (!experiment) throw new Error('Candidate experiment not found.');
      const previous = this.getCandidate(value.id);
      if (previous) {
        immutableFields(previous as unknown as Record<string, unknown>, value as unknown as Record<string, unknown>, ['id', 'experimentId', 'profileId', 'profileVersion', 'baseline', 'createdAt']);
        if (previous.outcome && !same(previous.outcome, value.outcome)) throw new Error('A finalized candidate outcome is immutable.');
      } else if (this.listCandidates(value.experimentId).length >= 2) throw new Error('An experiment supports at most two candidates.');
      if (value.outcome) this.validateOutcome(value.outcome);
      this.db.prepare('INSERT INTO candidates VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(value.id, value.experimentId, canonical(value));
      if (!experiment.candidateIds.includes(value.id)) this.updateExperiment(experiment.id, { candidateIds: [...experiment.candidateIds, value.id] });
      this.addEdge({ fromType: 'experiment', fromId: value.experimentId, relation: 'contains', toType: 'candidate', toId: value.id });
      return structuredClone(value);
    });
  }
  getCandidate(id: string): CandidateRecord | undefined { return this.body('candidates', id); }
  listCandidates(experimentId: string): CandidateRecord[] { return this.bodies('candidates', 'WHERE experiment_id=? ORDER BY rowid', [experimentId]); }
  updateCandidate(id: string, patch: Partial<CandidateRecord>): CandidateRecord {
    const previous = this.getCandidate(id); if (!previous) throw new Error('Candidate not found.');
    return this.putCandidate({ ...previous, ...patch, updatedAt: patch.updatedAt ?? now() });
  }
  private validateOutcome(outcome: CandidateOutcome) {
    if (![outcome.mandatoryPassed, outcome.requiredScopePassed, outcome.withinBudget].every(value => typeof value === 'boolean')
      || !Number.isFinite(outcome.durationMs) || outcome.durationMs < 0 || !Number.isInteger(outcome.repairCount) || outcome.repairCount < 0
      || (outcome.costUsd !== null && (!Number.isFinite(outcome.costUsd) || outcome.costUsd < 0))
      || !['completed', 'verification-failed', 'build-failed', 'timeout', 'cancelled', 'infrastructure'].includes(outcome.terminalReason)
      || !Number.isFinite(Date.parse(outcome.recordedAt)) || !outcome.evaluatorVersion) throw new Error('Invalid candidate outcome.');
    if (candidateSucceeded(outcome) && (!outcome.sourceHash || !outcome.evidenceHash || !outcome.contractHash)) throw new Error('Passing outcomes require source, contract and evidence hashes.');
  }
  recordOutcome(candidateId: string, outcome: CandidateOutcome): CandidateRecord {
    return this.transaction(() => {
      const candidate = this.getCandidate(candidateId); if (!candidate) throw new Error('Candidate not found.');
      if (candidate.outcome) { if (!same(candidate.outcome, outcome)) throw new Error('A finalized candidate outcome is immutable.'); return candidate; }
      const success = candidateSucceeded(outcome);
      const updated = this.updateCandidate(candidateId, { outcome, status: success === null ? 'stopped' : success ? 'passed' : 'failed' });
      const experiment = this.getExperiment(candidate.experimentId)!;
      const decision = experiment.decisionId ? this.getDecision(experiment.decisionId) : undefined;
      if (experiment.partition === 'development' && decision?.mode === 'adaptive' && decision.selectedProfileId === candidate.profileId && success !== null) {
        const state = this.getRoutingState(experiment.cohortKey);
        state.consecutiveFailures = success ? 0 : state.consecutiveFailures + 1;
        if (state.consecutiveFailures >= 3) {
          state.rolledBack = true;
          this.rollbackContext(experiment.cohortKey, 'Three consecutive routed-candidate failures.');
        }
        this.setRoutingState(experiment.cohortKey, state);
      }
      return updated;
    });
  }
  recordPreference(value: PreferenceRecord): PreferenceRecord {
    return this.transaction(() => {
      const previous = this.body<PreferenceRecord>('preferences', value.id);
      if (previous) { if (!same(previous, value)) throw new Error('Preference id already records different content.'); return previous; }
      const a = this.getCandidate(value.candidateAId), b = this.getCandidate(value.candidateBId);
      if (!a || !b || a.id === b.id || a.experimentId !== value.experimentId || b.experimentId !== value.experimentId) throw new Error('Preferences require two candidates in the same experiment.');
      if (!candidateSucceeded(a.outcome) || !candidateSucceeded(b.outcome)) throw new Error('Only independently passing candidates can receive a comparative preference.');
      if (a.outcome?.sourceHash !== value.sourceHashA || b.outcome?.sourceHash !== value.sourceHashB) throw new Error('Preference source hashes are stale.');
      if (!['a', 'b', 'tie', 'neither'].includes(value.choice) || value.presentationOrder.length !== 2 || new Set(value.presentationOrder).size !== 2
        || !value.presentationOrder.includes(a.id) || !value.presentationOrder.includes(b.id)
        || (value.samplingProbability !== null && (!Number.isFinite(value.samplingProbability) || value.samplingProbability <= 0 || value.samplingProbability > 1))) throw new Error('Invalid preference.');
      this.db.prepare('INSERT INTO preferences VALUES(?,?,?)').run(value.id, value.experimentId, canonical(value)); return structuredClone(value);
    });
  }
  listPreferences(experimentId?: string): PreferenceRecord[] { return this.bodies('preferences', experimentId ? 'WHERE experiment_id=? ORDER BY rowid' : 'ORDER BY rowid', experimentId ? [experimentId] : []); }
  putObservation(value: EvidenceObservation): EvidenceObservation {
    const previous = this.body<EvidenceObservation>('observations', value.id);
    if (previous) { if (!same(previous, value)) throw new Error('Observation id already records different content.'); return previous; }
    const experiment = this.getExperiment(value.experimentId), candidate = this.getCandidate(value.candidateId);
    if (!experiment || !candidate || candidate.experimentId !== experiment.id || value.partition !== 'development' || experiment.partition !== 'development'
      || value.lineageId !== experiment.lineageId || value.cohortKey !== experiment.cohortKey || value.profileId !== candidate.profileId) throw new Error('Observation provenance or partition is invalid.');
    if (!candidate.outcome || candidate.outcome.sourceHash !== value.sourceHash || candidate.outcome.evidenceHash !== value.evidenceHash) throw new Error('Observation does not match host evidence.');
    this.db.prepare('INSERT INTO observations VALUES(?,?,?,?)').run(value.id, value.experimentId, value.candidateId, canonical(value));
    this.addEdge({ fromType: 'observation', fromId: value.id, relation: 'derived-from', toType: 'candidate', toId: candidate.id }); return structuredClone(value);
  }
  getObservation(id: string): EvidenceObservation | undefined { return this.body('observations', id); }
  listObservations(): EvidenceObservation[] { return this.bodies('observations', 'ORDER BY rowid'); }
  getLesson(id: string): LessonRecord | undefined { return this.body('lessons', id); }
  getLessonByKey(key: string): LessonRecord | undefined {
    const row = this.db.prepare('SELECT body FROM lessons WHERE lesson_key=?').get(key); return row ? JSON.parse(String(row.body)) as LessonRecord : undefined;
  }
  listLessons(): LessonRecord[] { return this.bodies('lessons', 'ORDER BY rowid'); }
  saveLesson(value: LessonRecord): LessonRecord {
    return this.transaction(() => {
      this.db.prepare('INSERT INTO lessons VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(value.id, value.key, canonical(value));
      this.db.prepare('DELETE FROM lesson_search WHERE lesson_id=?').run(value.id);
      this.db.prepare('INSERT INTO lesson_search(lesson_id,statement,conditions,task_family) VALUES(?,?,?,?)').run(value.id, value.statement, value.conditions.join(' '), value.taskFamily);
      this.db.prepare("DELETE FROM edges WHERE from_type='lesson' AND from_id=?").run(value.id);
      for (const id of value.observationIds) {
        const observation = this.getObservation(id); if (!observation) throw new Error('Lesson evidence is missing.');
        this.addEdge({ fromType: 'lesson', fromId: value.id, relation: observation.outcome === 'supported' ? 'supports' : 'contradicts', toType: 'observation', toId: id });
      }
      return structuredClone(value);
    });
  }
  /** Yield ranked matches without truncating before the caller checks evidence eligibility. */
  *searchLessons(query: string, taskFamily: string): IterableIterator<LessonRecord> {
    const tokens = [...new Set(query.match(/[\p{L}\p{N}_-]+/gu) ?? [])].slice(0, 20);
    if (!tokens.length) {
      for (const row of this.db.prepare('SELECT body FROM lessons ORDER BY rowid').iterate()) {
        const lesson = JSON.parse(String(row.body)) as LessonRecord;
        if (lesson.taskFamily === taskFamily) yield lesson;
      }
      return;
    }
    const expression = tokens.map(token => '"' + token.replace(/"/g, '""') + '"').join(' OR ');
    for (const row of this.db.prepare("SELECT l.body FROM lesson_search s JOIN lessons l ON l.id=s.lesson_id WHERE lesson_search MATCH ? AND (s.task_family=? OR s.task_family='*') ORDER BY bm25(lesson_search),l.id")
      .iterate(expression, taskFamily)) yield JSON.parse(String(row.body)) as LessonRecord;
  }
  addEdge(edge: EvidenceEdge): void {
    this.db.prepare('INSERT OR IGNORE INTO edges VALUES(?,?,?,?,?)').run(edge.fromType, edge.fromId, edge.relation, edge.toType, edge.toId);
  }
  listEdges(): EvidenceEdge[] { return this.db.prepare('SELECT * FROM edges ORDER BY rowid').all().map(row => ({ fromType: row.from_type, fromId: row.from_id, relation: row.relation, toType: row.to_type, toId: row.to_id } as EvidenceEdge)); }
  saveMemorySnapshot(value: MemorySnapshot): MemorySnapshot {
    if (value.text.length > 4000 || value.lessonIds.length > 3) throw new Error('Memory snapshot exceeds retrieval limits.');
    if (this.db.prepare('SELECT id FROM invalidated_memory WHERE id=?').get(value.id)) throw new Error('Forgotten memory snapshot cannot be recreated.');
    const previous = this.getMemorySnapshot(value.id);
    if (previous) { if (!same(previous, value)) throw new Error('Memory snapshots are immutable.'); return previous; }
    return this.transaction(() => {
      for (const id of value.lessonIds) if (this.getLesson(id)?.status !== 'corroborated') throw new Error('Memory requires corroborated lessons.');
      this.db.prepare('INSERT INTO memory_snapshots VALUES(?,?)').run(value.id, canonical(value));
      for (const id of value.lessonIds) this.addEdge({ fromType: 'memory', fromId: value.id, relation: 'retrieved', toType: 'lesson', toId: id }); return structuredClone(value);
    });
  }
  getMemorySnapshot(id: string): MemorySnapshot | undefined { return this.body('memory_snapshots', id); }
  savePolicy(value: PolicySnapshot): PolicySnapshot {
    const previous = this.body<PolicySnapshot>('policies', value.id);
    if (previous) { if (!same(previous, value)) throw new Error('Policy snapshots are immutable.'); return this.getPolicy(value.id)!; }
    return this.transaction(() => {
      if (value.profileIds.length !== 2 || new Set(value.profileIds).size !== 2 || !value.profileIds.includes(value.baselineProfileId)
        || value.validatedProfileIds.some(id => !value.profileIds.includes(id))
        || value.arms.some(arm => !value.profileIds.includes(arm.profileId) || !Number.isInteger(arm.successes) || !Number.isInteger(arm.failures) || arm.successes < 0 || arm.failures < 0)) throw new Error('Invalid policy snapshot.');
      if (value.status === 'active') throw new Error('Save a shadow snapshot, then activate it through promotion validation.');
      if (value.memorySnapshotId && !this.getMemorySnapshot(value.memorySnapshotId)) throw new Error('Policy memory snapshot is missing.');
      for (const id of value.sourceExperimentIds) if (this.getExperiment(id)?.partition !== 'development') throw new Error('Policy fitting may use development experiments only.');
      this.db.prepare('INSERT INTO policies VALUES(?,?,?,?,?)').run(value.id, value.cohortKey, value.status, value.invalidationReason ?? null, canonical(value));
      for (const id of value.sourceExperimentIds) this.addEdge({ fromType: 'policy', fromId: value.id, relation: 'derived-from', toType: 'experiment', toId: id });
      for (const id of value.validation?.validationExperimentIds ?? []) this.addEdge({ fromType: 'policy', fromId: value.id, relation: 'derived-from', toType: 'experiment', toId: id });
      if (value.memorySnapshotId) this.addEdge({ fromType: 'policy', fromId: value.id, relation: 'derived-from', toType: 'memory', toId: value.memorySnapshotId });
      return structuredClone(value);
    });
  }
  getPolicy(id: string): PolicySnapshot | undefined {
    const row = this.db.prepare('SELECT body,status,reason FROM policies WHERE id=?').get(id);
    return row ? { ...JSON.parse(String(row.body)), status: row.status, ...(row.reason ? { invalidationReason: row.reason } : {}) } as PolicySnapshot : undefined;
  }
  listPolicies(cohortKey?: string): PolicySnapshot[] {
    return this.db.prepare('SELECT id FROM policies' + (cohortKey ? ' WHERE cohort_key=?' : '') + ' ORDER BY rowid').all(...(cohortKey ? [cohortKey] : [])).map(row => this.getPolicy(String(row.id))!);
  }
  activatePolicy(id: string, options: { preserveRoutingState?: boolean } = {}): PolicySnapshot {
    return this.transaction(() => {
      const value = this.getPolicy(id); if (!value || value.status === 'invalidated' || value.status === 'rolled-back') throw new Error('Policy cannot be activated.');
      if (!value.validation?.eligible) throw new Error('Policy must pass independent promotion validation.');
      const source = value.validation.policySnapshotId ? this.getPolicy(value.validation.policySnapshotId) : undefined;
      if (!source || source.id === value.id || ['invalidated', 'rolled-back'].includes(source.status)) throw new Error('Policy validation requires its available frozen source snapshot.');
      const routing = (policy: PolicySnapshot) => ({ cohortKey: policy.cohortKey, baselineProfileId: policy.baselineProfileId, profileIds: policy.profileIds,
        arms: policy.arms, preferences: policy.preferences, sourceExperimentIds: policy.sourceExperimentIds, memorySnapshotId: policy.memorySnapshotId, version: policy.version });
      if (!same(routing(source), routing(value)) || value.validation.memorySnapshotId !== value.memorySnapshotId
        || !same([...value.validatedProfileIds].sort(), [...value.profileIds].sort())) throw new Error('Policy distribution or pins differ from the frozen validated snapshot.');
      this.db.prepare("UPDATE policies SET status='shadow' WHERE cohort_key=? AND status='active'").run(value.cohortKey);
      this.db.prepare("UPDATE policies SET status='active' WHERE id=?").run(id);
      if (!options.preserveRoutingState) this.setRoutingState(value.cohortKey, { credit: 0, consecutiveFailures: 0, rolledBack: false }); return this.getPolicy(id)!;
    });
  }
  getRoutingState(cohortKey: string): RoutingState {
    const row = this.db.prepare('SELECT body FROM routing_state WHERE cohort_key=?').get(cohortKey);
    return row ? JSON.parse(String(row.body)) as RoutingState : { credit: 0, consecutiveFailures: 0, rolledBack: false };
  }
  private setRoutingState(cohortKey: string, value: RoutingState): void {
    this.db.prepare('INSERT INTO routing_state VALUES(?,?) ON CONFLICT(cohort_key) DO UPDATE SET body=excluded.body').run(cohortKey, canonical(value));
  }
  rollbackContext(cohortKey: string, reason: string): void {
    this.transaction(() => {
      // Retire pending proposals too: their delayed validation must never undo
      // a rollback. A newly fitted snapshot can earn fresh validation later.
      this.db.prepare("UPDATE policies SET status='rolled-back', reason=? WHERE cohort_key=? AND status IN ('active','shadow')").run(reason, cohortKey);
      this.setRoutingState(cohortKey, { ...this.getRoutingState(cohortKey), rolledBack: true });
    });
  }
  recordDecision(value: PolicyDecision): PolicyDecision {
    return this.transaction(() => {
      const existing = this.getDecision(value.id);
      if (existing) { if (!same(existing, value)) throw new Error('Decision id already records different content.'); return existing; }
      const experiment = this.getExperiment(value.experimentId), policy = this.getPolicy(value.policySnapshotId);
      if (!experiment || !policy || experiment.cohortKey !== value.cohortKey || policy.cohortKey !== value.cohortKey) throw new Error('Decision provenance is invalid.');
      if (policy.status === 'invalidated' || policy.status === 'rolled-back' || (value.mode === 'adaptive' && policy.status !== 'active')) throw new Error('Decision policy is not eligible.');
      if (value.memorySnapshotId && !this.getMemorySnapshot(value.memorySnapshotId)) throw new Error('Decision memory snapshot is missing.');
      const probabilities = Object.values(value.probabilities);
      if (!probabilities.length || probabilities.some(p => !Number.isFinite(p) || p < 0 || p > 1) || Math.abs(probabilities.reduce((a, b) => a + b, 0) - 1) > 1e-9 || !value.probabilities[value.selectedProfileId]) throw new Error('Invalid routing probabilities.');
      const state = this.getRoutingState(value.cohortKey);
      if (Math.abs(state.credit - value.creditBefore) > 1e-8) throw new Error('Routing credits changed; make a fresh decision.');
      if (![value.primaryDraw, value.comparisonDraw].every(draw => Number.isFinite(draw) && draw >= 0 && draw < 1)
        || Object.keys(value.probabilities).length !== policy.profileIds.length || policy.profileIds.some(id => !(id in value.probabilities))
        || ![0, 0.1, 1].includes(value.comparisonProbability) || value.compare !== (value.comparisonDraw < value.comparisonProbability)) throw new Error('Invalid decision sampling record.');
      const earned = value.mode === 'paired' ? state.credit : Math.min(1, Math.round((state.credit + 0.1) * 1e10) / 1e10);
      const expectedCredit = value.mode === 'paired' ? state.credit : earned - (value.compare ? 1 : 0);
      if (value.creditAfter < 0 || value.creditAfter > 1 || Math.abs(expectedCredit - value.creditAfter) > 1e-8
        || (value.mode === 'paired' ? value.comparisonProbability !== 1 : value.comparisonProbability > 0.1 || (value.comparisonProbability > 0 && earned < 1))) throw new Error('Invalid comparison credit balance.');
      for (const id of policy.profileIds) if (Math.abs((value.observationProbabilities[id] ?? -1) - (value.probabilities[id] + (1 - value.probabilities[id]) * value.comparisonProbability)) > 1e-9) throw new Error('Invalid observation probabilities.');
      if (value.mode === 'adaptive' && !policy.validatedProfileIds.includes(value.selectedProfileId)) throw new Error('An unvalidated profile cannot be routed.');
      this.db.prepare('INSERT INTO decisions VALUES(?,?,?)').run(value.id, value.experimentId, canonical(value));
      this.updateExperiment(experiment.id, { decisionId: value.id, policySnapshotId: value.policySnapshotId, memorySnapshotId: value.memorySnapshotId });
      this.setRoutingState(value.cohortKey, { ...state, credit: value.creditAfter }); return structuredClone(value);
    });
  }
  getDecision(id: string): PolicyDecision | undefined { return this.body('decisions', id); }
  listDecisions(): PolicyDecision[] { return this.bodies('decisions', 'ORDER BY rowid'); }
  promoteCandidate(experimentId: string, candidateId: string, payload: Record<string, unknown>): PromotionOutboxRecord {
    return this.transaction(() => {
      const candidate = this.getCandidate(candidateId), experiment = this.getExperiment(experimentId);
      if (!candidate || !experiment || candidate.experimentId !== experimentId || candidate.status !== 'passed' || !candidateSucceeded(candidate.outcome)) throw new Error('Only a passing candidate from this experiment can be promoted.');
      const latest = this.db.prepare('SELECT body FROM promotion_outbox WHERE experiment_id=? ORDER BY rowid DESC LIMIT 1').get(experimentId);
      const existing = latest ? JSON.parse(String(latest.body)) as PromotionOutboxRecord : undefined;
      if (existing && existing.candidateId === candidateId && same(existing.payload, payload)) return existing;
      if (existing?.status === 'pending') throw new Error('Apply the pending candidate promotion before changing selection.');
      const id = `promotion:${experimentId}:${randomUUID()}`;
      const record: PromotionOutboxRecord = { id, experimentId, candidateId, createdAt: now(), status: 'pending', payload };
      this.db.prepare('INSERT INTO promotion_outbox VALUES(?,?,?,?,?)').run(id, experimentId, candidateId, 'pending', canonical(record));
      this.updateExperiment(experimentId, { selectedCandidateId: candidateId, status: 'promoting' }); return structuredClone(record);
    });
  }
  pendingPromotions(): PromotionOutboxRecord[] { return this.bodies('promotion_outbox', "WHERE status='pending' ORDER BY rowid"); }
  ackPromotion(id: string): void {
    this.transaction(() => {
      const record = this.body<PromotionOutboxRecord>('promotion_outbox', id); if (!record) throw new Error('Promotion not found.');
      if (record.status === 'applied') return;
      this.db.prepare("UPDATE promotion_outbox SET status='applied',body=? WHERE id=?").run(canonical({ ...record, status: 'applied', appliedAt: now() }), id);
      this.updateExperiment(record.experimentId, { status: 'complete' });
    });
  }
  summary(id: string): ExperimentSummary | undefined {
    const experiment = this.getExperiment(id); if (!experiment) return undefined;
    return { id, projectId: experiment.projectId, mode: experiment.mode, status: experiment.status, selectedCandidateId: experiment.selectedCandidateId, preferenceRequest: experiment.preferenceRequest,
      createdAt: experiment.createdAt, updatedAt: experiment.updatedAt, candidates: this.listCandidates(id).map(candidate => ({ id: candidate.id,
        profileId: candidate.profileId, profileVersion: candidate.profileVersion, baseline: candidate.baseline, status: candidate.status, stage: candidate.stage,
        success: candidateSucceeded(candidate.outcome), durationMs: candidate.outcome?.durationMs, costUsd: candidate.outcome?.costUsd, error: candidate.error, sourceHash: candidate.outcome?.sourceHash })) };
  }
  forgetExperiment(id: string): ForgetResult {
    return this.transaction(() => {
      const experiment = this.getExperiment(id);
      if (!experiment) return { experimentIds: [], lessonIds: [], policyIds: [], memorySnapshotIds: [] };
      const observations = this.listObservations().filter(item => item.experimentId === id), observationIds = new Set(observations.map(item => item.id));
      const affected = this.listLessons().filter(item => item.observationIds.some(key => observationIds.has(key)));
      const affectedIds = new Set(affected.map(item => item.id));
      const snapshots = this.bodies<MemorySnapshot>('memory_snapshots').filter(item => item.lessonIds.some(key => affectedIds.has(key)));
      const snapshotIds = new Set(snapshots.map(item => item.id));
      const policies = this.listPolicies().filter(item => item.sourceExperimentIds.includes(id)
        || item.validation?.validationExperimentIds?.includes(id)
        // A deleted held-out task retires its entire frozen batch, including the
        // source proposal before a delayed assessment has saved a successor.
        || (experiment.partition !== 'development' && experiment.policySnapshotId
          && (item.id === experiment.policySnapshotId || item.validation?.policySnapshotId === experiment.policySnapshotId))
        || (item.memorySnapshotId && snapshotIds.has(item.memorySnapshotId)));
      for (const policy of policies) this.db.prepare("UPDATE policies SET status='invalidated',reason=? WHERE id=?").run('Source experience was forgotten.', policy.id);
      for (const snapshot of snapshots) {
        this.db.prepare('DELETE FROM memory_snapshots WHERE id=?').run(snapshot.id);
        this.db.prepare('INSERT OR IGNORE INTO invalidated_memory VALUES(?,?)').run(snapshot.id, 'Source experience was forgotten.');
      }
      this.db.prepare('DELETE FROM experiments WHERE id=?').run(id);
      for (const lesson of affected) {
        const retained = lesson.observationIds.filter(key => !observationIds.has(key)).map(key => this.getObservation(key)).filter((item): item is EvidenceObservation => !!item);
        if (!retained.length) { this.db.prepare('DELETE FROM lessons WHERE id=?').run(lesson.id); this.db.prepare('DELETE FROM lesson_search WHERE lesson_id=?').run(lesson.id); }
        else {
          const lineages = [...new Set(retained.filter(item => item.outcome === 'supported').map(item => item.lineageId))];
          this.saveLesson({ ...lesson, observationIds: retained.map(item => item.id), lineageIds: lineages,
            status: lesson.status === 'retired' ? 'retired' : retained.some(item => item.outcome === 'contradicted') ? 'contradicted' : lineages.length >= 2 ? 'corroborated' : 'proposed', updatedAt: now() });
        }
      }
      for (const [type, ids] of [['experiment', [id]], ['candidate', experiment.candidateIds], ['observation', [...observationIds]], ['memory', [...snapshotIds]]] as const)
        for (const key of ids) this.db.prepare('DELETE FROM edges WHERE (from_type=? AND from_id=?) OR (to_type=? AND to_id=?)').run(type, key, type, key);
      for (const lesson of affected) if (!this.getLesson(lesson.id)) this.db.prepare("DELETE FROM edges WHERE (from_type='lesson' AND from_id=?) OR (to_type='lesson' AND to_id=?)").run(lesson.id, lesson.id);
      return { experimentIds: [id], lessonIds: [...affectedIds], policyIds: policies.map(item => item.id), memorySnapshotIds: [...snapshotIds] };
    });
  }
  forgetProject(projectId: string): ForgetResult {
    return this.transaction(() => {
      const results = this.listExperiments(projectId).map(experiment => this.forgetExperiment(experiment.id));
      return { experimentIds: [...new Set(results.flatMap(item => item.experimentIds))], lessonIds: [...new Set(results.flatMap(item => item.lessonIds))],
        policyIds: [...new Set(results.flatMap(item => item.policyIds))], memorySnapshotIds: [...new Set(results.flatMap(item => item.memorySnapshotIds))] };
    });
  }
}

export function learningId(prefix: string): string { return `${prefix}-${randomUUID()}`; }

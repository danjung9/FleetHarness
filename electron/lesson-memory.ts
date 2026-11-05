import { createHash, randomUUID } from 'node:crypto';
import type { EvidenceObservation, LessonRecord, MemorySnapshot } from '../shared/learning.js';
import { candidateSucceeded, type LearningStore } from './learning-store.js';

export const memoryPolicyVersion = 'generalized-evidence-v1';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const label = (value: string, field: string): string => {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(value)) throw new Error(`Invalid generalized ${field}.`);
  return value;
};
function generalized(value: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Invalid generalized lesson text.');
  // This is an additional guard, not a substitute for host-only construction from allowlisted evidence.
  if (/evaluation-plan\.json|expected\s*[":=]|\bBearer\s+\S+|\bsk-[a-zA-Z0-9_-]{8,}|\b(?:api[_ -]?key|password|secret)\s*[:=]|(?:https?:\/\/|\/Users\/|\/home\/)|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(value)) throw new Error('Lesson contains private data or evaluation content.');
  return value.trim();
}
export interface ObservationInput {
  experimentId: string; candidateId: string; taskFamily: string;
  lessonKey: string; statement: string; conditions: string[];
  /** Only host-computed evidence may set this. Model-authored rationales remain hypotheses. */
  outcome: 'supported' | 'contradicted'; explanation?: 'observation' | 'hypothesis'; summary?: string;
  observationId?: string; createdAt?: string;
}
export interface MemoryQuery { taskFamily: string; query: string; profileIds?: string[]; cohortKey?: string; excludeLineageIds?: string[]; enabled?: boolean }

export class LessonMemory {
  constructor(readonly store: LearningStore) {}
  /** This API is host-only. It never reads artifact files, prompts, reference answers, or raw agent text. */
  recordObservation(input: ObservationInput): LessonRecord {
    return this.store.transaction(() => {
      const experiment = this.store.getExperiment(input.experimentId), candidate = this.store.getCandidate(input.candidateId);
      if (!experiment || experiment.partition !== 'development' || !candidate || candidate.experimentId !== experiment.id || !candidate.outcome
        || !candidate.outcome.sourceHash || !candidate.outcome.evidenceHash || candidateSucceeded(candidate.outcome) === null) throw new Error('Memory requires finalized development evidence.');
      const taskFamily = label(input.taskFamily, 'task family'), key = label(input.lessonKey, 'lesson key');
      const statement = generalized(input.statement, 1200), conditions = input.conditions.map(value => generalized(value, 240));
      if (conditions.length > 8) throw new Error('Too many lesson conditions.');
      const observation: EvidenceObservation = { id: input.observationId ?? `observation-${digest(`${experiment.id}\0${candidate.id}\0${key}\0${input.outcome}`)}`,
        experimentId: experiment.id, candidateId: candidate.id, lineageId: experiment.lineageId, partition: 'development', cohortKey: experiment.cohortKey,
        profileId: candidate.profileId, sourceHash: candidate.outcome.sourceHash, evidenceHash: candidate.outcome.evidenceHash,
        summary: generalized(input.summary ?? statement, 1200), outcome: input.outcome, createdAt: input.createdAt ?? candidate.outcome.recordedAt };
      const existing = this.store.getLessonByKey(key);
      if (existing && (existing.statement !== statement || existing.taskFamily !== taskFamily || JSON.stringify(existing.conditions) !== JSON.stringify(conditions))) throw new Error('A lesson key cannot silently change its claim or conditions.');
      this.store.putObservation(observation);
      const observationIds = [...new Set([...(existing?.observationIds ?? []), observation.id])];
      const evidence = observationIds.map(id => this.store.getObservation(id)!);
      const lineages = [...new Set(evidence.filter(item => item.outcome === 'supported').map(item => item.lineageId))];
      const status = existing?.status === 'retired' ? 'retired' : evidence.some(item => item.outcome === 'contradicted') ? 'contradicted'
        : lineages.length >= 2 ? 'corroborated' : 'proposed';
      const lesson: LessonRecord = { id: existing?.id ?? `lesson-${digest(key)}`, key, statement, conditions, taskFamily,
        profileIds: [...new Set(evidence.map(item => item.profileId))], status, observationIds, lineageIds: lineages,
        explanation: existing?.explanation ?? input.explanation ?? 'observation', createdAt: existing?.createdAt ?? observation.createdAt, updatedAt: observation.createdAt };
      return this.store.saveLesson(lesson);
    });
  }
  /** A deliberately modest first extraction: observed gate outcomes, never an invented explanation of causation. */
  recordComparison(experimentId: string, taskFamily: string): LessonRecord[] {
    const experiment = this.store.getExperiment(experimentId);
    if (!experiment || experiment.partition !== 'development') return [];
    label(taskFamily, 'task family');
    const lessons: LessonRecord[] = [];
    for (const candidate of this.store.listCandidates(experimentId)) {
      const success = candidateSucceeded(candidate.outcome);
      if (success === null || !candidate.outcome?.sourceHash || !candidate.outcome.evidenceHash) continue;
      const profile = label(candidate.profileId, 'profile'), version = label(candidate.profileVersion, 'profile version');
      lessons.push(this.recordObservation({ experimentId, candidateId: candidate.id, taskFamily,
        lessonKey: `checks:${digest(`${taskFamily}\0${profile}\0${version}\0${experiment.cohortKey}`).slice(0, 48)}`,
        statement: `Architecture ${profile} version ${version} satisfied all mandatory checks within its resource budget in observed ${taskFamily} tasks.`,
        conditions: [`Task family: ${taskFamily}`, `Architecture: ${profile}`, `Architecture version: ${version}`, `Cohort: ${experiment.cohortKey}`],
        outcome: success ? 'supported' : 'contradicted', explanation: 'observation',
        summary: success ? 'Host checks and required scope passed within the resource budget.' : 'Host checks, required scope, or resource limits did not all pass.' }));
    }
    return lessons;
  }
  retrieve(input: MemoryQuery): { lessons: LessonRecord[]; text: string } {
    if (input.enabled === false) return { lessons: [], text: '' };
    label(input.taskFamily, 'task family');
    const excluded = new Set(input.excludeLineageIds ?? []);
    const lessons: LessonRecord[] = [];
    let text = '';
    for (const lesson of this.store.searchLessons(input.query, input.taskFamily)) {
      if (lesson.status !== 'corroborated' || lesson.explanation !== 'observation') continue;
      if (input.profileIds?.length && !lesson.profileIds.some(id => input.profileIds!.includes(id))) continue;
      const evidence = lesson.observationIds.map(id => this.store.getObservation(id)).filter(item => item && item.partition === 'development'
        && (!input.cohortKey || item.cohortKey === input.cohortKey) && !excluded.has(item.lineageId));
      if (new Set(evidence.filter(item => item!.outcome === 'supported').map(item => item!.lineageId)).size < 2
        || evidence.some(item => item!.outcome === 'contradicted')) continue;
      const block = `[Evidence ${lesson.id}; ${lesson.lineageIds.length} task lineages]\n${lesson.statement}\nConditions: ${lesson.conditions.join('; ')}\nThis observation does not establish causation or override the current task contract.\n`;
      if ((text ? text.length + 1 : 0) + block.length > 4000) continue;
      text += (text ? '\n' : '') + block; lessons.push(lesson);
      if (lessons.length >= 3) break;
    }
    return { lessons, text };
  }
  snapshot(input: MemoryQuery & { id?: string; createdAt?: string }): MemorySnapshot {
    const retrieved = this.retrieve(input);
    const snapshot: MemorySnapshot = { id: input.id ?? `memory-${randomUUID()}`, createdAt: input.createdAt ?? new Date().toISOString(), taskFamily: input.taskFamily,
      lessonIds: retrieved.lessons.map(item => item.id), text: retrieved.text, contentHash: digest(retrieved.text), policyVersion: memoryPolicyVersion };
    return this.store.saveMemorySnapshot(snapshot);
  }
  retire(id: string): LessonRecord {
    const lesson = this.store.getLesson(id); if (!lesson) throw new Error('Lesson not found.');
    return this.store.saveLesson({ ...lesson, status: 'retired', updatedAt: new Date().toISOString() });
  }
}

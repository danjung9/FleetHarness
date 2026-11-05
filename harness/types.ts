export type RecipeId = 'messages' | 'scheduling' | 'offline' | 'knowledge' | 'readiness' | 'cyber' | 'governance' | 'workflow' | 'physics' | 'fielding';
export interface Challenge {
  id: string;
  title: string;
  category: string | null;
  summary: string;
  description?: string;
  expectedDeliverables?: string;
  evaluationCriteria?: string[];
  resources?: string;
  links?: string[];
  recipe: RecipeId;
  related: string[];
  requirements: string[];
  dataNeeds: string[];
  sourceUrl: string;
  sourceScope: 'catalog' | 'detail' | 'user';
  capturedOn: string;
  pilot: boolean;
}
export interface AcceptanceCriterion {
  id: string;
  requirement: string;
  method: 'automated' | 'human' | 'integration';
  scenario: string;
  provenance?: Array<{
    kind: 'requirement' | 'evaluation' | 'deliverable' | 'user' | 'recipe' | 'description' | 'summary';
    id: string;
    path: string;
  }>;
}
export interface Recipe {
  id: RecipeId;
  title: string;
  approach: string;
  skills: string[];
  tools: string[];
  components: { name: string; url: string; rationale: string; status: 'candidate' | 'included' }[];
  acceptance: AcceptanceCriterion[];
  limitations: string[];
}
export interface CheckResult { id: string; passed: boolean; detail: string }
export interface PipelinePacket {
  schemaVersion: 1;
  challenge: Challenge;
  recipe: Recipe;
  dataPolicy: 'synthetic-only';
  globalTools: string[];
  acceptance: AcceptanceCriterion[];
  stages: import('./phases.js').PhaseContract[];
  unknowns: string[];
}

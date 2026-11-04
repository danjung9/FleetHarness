import type { NewProject } from '../../shared/types';
import { challenges } from '../../harness/catalog';

export const emptyBrief: NewProject = { title: '', description: '', criteria: [] };
export function validateBrief(value: unknown): string | null {
  if (!value || typeof value !== 'object') return 'Choose a Workbench brief JSON file.';
  const p = value as NewProject;
  if (typeof p.title !== 'string' || !p.title.trim() || p.title.trim().length > 120) return 'Add a title of 1–120 characters.';
  if (typeof p.description !== 'string' || p.description.trim().length < 20 || p.description.length > 16000) return 'Describe the problem in 20–16,000 characters.';
  if (!Array.isArray(p.criteria) || !p.criteria.length || p.criteria.length > 30 || p.criteria.some(c => typeof c !== 'string' || !c.trim() || c.length > 2000)) return 'Add 1–30 acceptance criteria, each up to 2,000 characters.';
  if (p.challengeId !== undefined && !challenges.some(c => c.id === p.challengeId)) return 'This source challenge is not in the Norfolk catalog.';
  return null;
}
export function cleanBrief(p: NewProject): NewProject {
  return { title: p.title, description: p.description, criteria: p.criteria, ...(p.challengeId ? { challengeId: p.challengeId } : {}) };
}
export function downloadBrief(p: NewProject) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(cleanBrief(p), null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'fleetharness-workbench-brief.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

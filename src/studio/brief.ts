import type { NewProject } from '../../shared/types';
import type { Challenge } from '../../harness/types';
import { recipes } from '../../harness/recipes';

export interface Brief {
  title: string; overview: string; requirements: string; deliverable: string;
  evaluation: string; resources: string; links: string; challengeId?: string;
}
export const blankBrief: Brief = { title: '', overview: '', requirements: '', deliverable: '', evaluation: '', resources: '', links: '' };
export const sections = [
  ['overview', 'Overview', 'Who is this for, what happens today, and what should change?'],
  ['requirements', 'Requirements', 'Describe the essential behavior, constraints, and edge cases.'],
  ['deliverable', 'Expected deliverable', 'What should someone be able to open, run, and use?'],
  ['evaluation', 'Evaluation criteria', 'One measurable acceptance criterion per line.'],
  ['resources', 'Resources', 'Available datasets, sample inputs, existing code, and missing dependencies.'],
  ['links', 'Links', 'Source challenge, documentation, repositories, or reference material.']
] as const;

export function briefForChallenge(c: Challenge): Brief {
  const recipe = recipes[c.recipe];
  return {
    title: c.title.slice(0, 120), overview: c.summary, requirements: c.requirements.join('\n'),
    deliverable: `A runnable, self-contained browser prototype for ${c.title}, with synthetic sample data, testable core logic, automated tests, a README, and a path-to-fleet document identifying unresolved integrations.`,
    evaluation: recipe.acceptance.map(a => a.requirement).join('\n'),
    resources: c.dataNeeds.join('\n'), links: [c.sourceUrl, ...recipe.components.map(c => c.url)].join('\n'), challengeId: c.id
  };
}

// Store the complete structured brief inside the existing description contract.
// JSON preserves user-entered Markdown and section headings without ambiguity.
const marker = '\n\n<!-- fleetharness-studio-brief:v1 -->\n';
export function toProject(brief: Brief): NewProject {
  const { evaluation, title, challengeId, ...body } = brief;
  const description = sections.filter(([key]) => key !== 'evaluation').map(([key, label]) => `## ${label}\n${body[key as keyof typeof body]?.trim() || 'Not supplied.'}`).join('\n\n') + marker + JSON.stringify(brief);
  return { title: title.trim(), description, criteria: evaluation.split('\n').map(s => s.trim()).filter(Boolean), ...(challengeId ? { challengeId } : {}) };
}
export function fromProject(p: NewProject): Brief {
  const offset = p.description.lastIndexOf(marker);
  if (offset !== -1) {
    try {
      const saved = JSON.parse(p.description.slice(offset + marker.length));
      if (sections.every(([key]) => typeof saved[key] === 'string')) return { ...saved, title: p.title, evaluation: p.criteria.join('\n'), challengeId: p.challengeId };
    } catch { /* Older freeform briefs remain editable. */ }
  }
  return { ...blankBrief, title: p.title, overview: p.description, evaluation: p.criteria.join('\n'), challengeId: p.challengeId };
}
export function validateBrief(brief: Brief): string | null {
  if (!brief.title.trim()) return 'Give your challenge a title.';
  if (brief.title.trim().length > 120) return 'Keep the title within 120 characters.';
  if (brief.overview.trim().length < 20) return 'Add at least 20 characters to the overview so the agents have enough context.';
  if (!brief.requirements.trim()) return 'Describe at least one requirement.';
  if (!brief.deliverable.trim()) return 'Describe the software you expect to receive.';
  const p = toProject(brief);
  if (!p.criteria.length || p.criteria.length > 30 || p.criteria.some(c => c.length > 2000)) return 'Add 1–30 evaluation criteria, one per line, up to 2,000 characters each.';
  if (p.description.length > 16000) return 'This brief is too long for the existing backend. Shorten the context or link to longer resources.';
  return null;
}

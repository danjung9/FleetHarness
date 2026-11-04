import type { NewProject } from './types.js';
import { validateSelections } from './connectors.js';

/** Shared by the renderer and desktop boundary so both accept the same brief. */
export function normalizeProjectInput(input: NewProject): NewProject {
  if (!input || typeof input.title !== 'string' || typeof input.description !== 'string' ||
      !Array.isArray(input.criteria) || input.criteria.some(c => typeof c !== 'string') ||
      (input.resources !== undefined && typeof input.resources !== 'string') ||
      (input.links !== undefined && (!Array.isArray(input.links) || input.links.some(link => typeof link !== 'string')))) {
    throw new Error('Invalid challenge.');
  }
  const title = input.title.trim(), description = input.description.trim();
  const criteria = input.criteria.map(c => c.trim()).filter(Boolean);
  const resources = input.resources?.trim() ?? '';
  const links = (input.links ?? []).map(link => link.trim()).filter(Boolean);
  if (!title || title.length > 120 || description.length < 20 || description.length > 16000) {
    throw new Error('Add a title (up to 120 characters) and a problem statement (20–16,000 characters).');
  }
  if (criteria.length > 100 || criteria.some(c => c.length > 2000)) {
    throw new Error('Use up to 100 evaluation criteria, with no more than 2,000 characters per line.');
  }
  if (resources.length > 16000) throw new Error('Keep resources to 16,000 characters or fewer.');
  if (links.length > 30 || links.some(link => link.length > 2000)) {
    throw new Error('Use up to 30 links, with no more than 2,000 characters per link.');
  }
  for (const link of links) {
    try {
      const url = new URL(link);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error();
    } catch { throw new Error('Enter a complete http:// or https:// link on each line.'); }
  }
  const connectedData = validateSelections(input.connectedData);
  return { title, description, criteria, resources, links, challengeId: input.challengeId, ...(input.connectedData !== undefined ? { connectedData } : {}) };
}

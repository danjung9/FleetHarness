import type { Challenge, RecipeId } from './types.js';

export const norfolkOrigin = 'https://cdao.hackathon.maximus.com';
export const norfolkCatalogUrl = `${norfolkOrigin}/event/norfolk/use-cases`;
export const norfolkIndexApi = `${norfolkOrigin}/api/events/norfolk/combined/`;
export interface NorfolkSource {
  id: number; name: string; description: string; requirements: string; expected_deliverables: string;
  evaluation_criteria: string; resources: string; example_project_url: string | null;
  category: { name: string } | null;
}
export interface NorfolkSnapshot { fetchedAt: string; sourceUrl: string; useCases: NorfolkSource[] }
export interface NorfolkCatalog { fetchedAt: string; challenges: Challenge[] }

export function sourceLines(text: string): string[] {
  return text.split(/\r?\n/).map(line => line.trim().replace(/^(?:[-*•]|\d+[.)])\s+/, '')).filter(Boolean);
}
function sourceLinks(source: NorfolkSource): string[] {
  const text = [source.description, source.requirements, source.expected_deliverables, source.evaluation_criteria, source.resources, source.example_project_url ?? ''].join('\n');
  const links = [`${norfolkCatalogUrl}/${source.id}`];
  for (let match of text.matchAll(/https?:\/\/[^\s<>"']+/g)) {
    let candidate = match[0].replace(/[.,;:!?]+$/, '');
    while (candidate.endsWith(')') && (candidate.match(/\)/g)?.length ?? 0) > (candidate.match(/\(/g)?.length ?? 0)) candidate = candidate.slice(0, -1);
    try { const url = new URL(candidate); if (['http:', 'https:'].includes(url.protocol)) links.push(candidate); } catch { /* Keep malformed references in the source text. */ }
  }
  return [...new Set(links)];
}
export function catalogFromNorfolk(snapshot: NorfolkSnapshot, routing: readonly Challenge[]): Challenge[] {
  return snapshot.useCases.map(source => {
    const existing = routing.find(c => c.id === String(source.id));
    return {
      id: String(source.id), title: source.name, category: source.category?.name ?? null,
      summary: existing?.summary ?? (source.description || source.requirements).split(/\n\s*\n/)[0],
      description: source.description, requirements: sourceLines(source.requirements),
      expectedDeliverables: source.expected_deliverables,
      evaluationCriteria: sourceLines(source.evaluation_criteria).filter(line => !/^Measures of success:\s*$/i.test(line)),
      resources: source.resources, links: sourceLinks(source),
      recipe: existing?.recipe ?? 'workflow' as RecipeId, related: existing?.related ?? [],
      dataNeeds: existing?.dataNeeds ?? [], sourceUrl: `${norfolkCatalogUrl}/${source.id}`,
      sourceScope: 'detail' as const, capturedOn: snapshot.fetchedAt.slice(0, 10), pilot: existing?.pilot ?? false
    };
  });
}

/** Fetch only the published event index and its detail records; no account data is retained. */
export async function fetchNorfolkSnapshot(fetcher: typeof fetch = fetch): Promise<NorfolkSnapshot> {
  async function json(url: string): Promise<any> {
    const response = await fetcher(url, { signal: AbortSignal.timeout(20_000), redirect: 'error', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Norfolk could not be refreshed (HTTP ${response.status}). The saved catalog is still available.`);
    const body = await response.text();
    if (body.length > 4_000_000) throw new Error('The Norfolk response exceeds the import limit.');
    try { return JSON.parse(body); } catch { throw new Error('Norfolk returned an unreadable catalog. The saved catalog is still available.'); }
  }
  const index = await json(norfolkIndexApi);
  if (!Number.isSafeInteger(index?.event?.id) || !Array.isArray(index.use_cases) || !index.use_cases.length || index.use_cases.length > 200) throw new Error('Norfolk returned an invalid challenge index.');
  const ids: number[] = index.use_cases.map((entry: any) => entry?.id);
  if (ids.some(id => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length) throw new Error('Norfolk returned invalid or duplicate challenge IDs.');
  const useCases: NorfolkSource[] = new Array(ids.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, ids.length) }, async () => {
    while (next < ids.length) {
      const position = next++, id = ids[position];
      const entry = await json(`${norfolkOrigin}/api/use-cases/${id}/`);
      if (entry.id !== id || entry.event_id !== index.event.id || entry.is_active !== true || typeof entry.name !== 'string' || !entry.name.trim()) throw new Error(`Norfolk challenge #${id} could not be verified. The saved catalog is still available.`);
      const field = (key: string): string => {
        if (entry[key] == null) return '';
        if (typeof entry[key] !== 'string' || entry[key].length > 100_000) throw new Error(`Invalid ${key} on Norfolk challenge #${id}.`);
        return entry[key].trim();
      };
      if (entry.category != null && typeof entry.category.name !== 'string') throw new Error(`Invalid category on Norfolk challenge #${id}.`);
      useCases[position] = { id, name: entry.name.trim(), description: field('description'), requirements: field('requirements'),
        expected_deliverables: field('expected_deliverables'), evaluation_criteria: field('evaluation_criteria'), resources: field('resources'),
        example_project_url: field('example_project_url') || null, category: entry.category ? { name: entry.category.name } : null };
    }
  }));
  return { fetchedAt: new Date().toISOString(), sourceUrl: norfolkCatalogUrl, useCases };
}

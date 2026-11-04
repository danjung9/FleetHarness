import type { BriefDataInput, NewProject } from './types.js';

export const MAX_DATA_INPUTS = 10;
export const MAX_DATA_INPUT_BYTES = 256 * 1024;
export const MAX_TOTAL_DATA_INPUT_BYTES = 1024 * 1024;
export const DATA_FILE_EXTENSIONS = ['csv', 'tsv', 'json', 'ndjson', 'geojson', 'txt', 'md', 'xml', 'yaml', 'yml', 'log'];

/** Validate actual supplied content; descriptive resources and links are not datasets. */
export function normalizeDataInputs(value: unknown): BriefDataInput[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_DATA_INPUTS) {
    throw new Error(`Attach or paste up to ${MAX_DATA_INPUTS} data inputs.`);
  }
  let totalBytes = 0;
  return value.map((input): BriefDataInput => {
    if (!input || typeof input !== 'object' || typeof input.name !== 'string' ||
        typeof input.content !== 'string' || (input.kind !== 'file' && input.kind !== 'text')) {
      throw new Error('Each data input needs a name, a file or text type, and text content.');
    }
    const name = input.name.trim();
    if (!name || name.length > 120 || /[\\/\u0000-\u001f\u007f]/.test(name) || name === '.' || name === '..') {
      throw new Error('Give each data input a name of up to 120 characters, without folders or control characters.');
    }
    if (input.kind === 'file' && !DATA_FILE_EXTENSIONS.includes(name.split('.').at(-1)!.toLowerCase())) {
      throw new Error('Attach a CSV, TSV, JSON, NDJSON, GeoJSON, TXT, Markdown, XML, YAML, or log file.');
    }
    if (!input.content.trim()) throw new Error(`“${name}” is empty. Add content or remove it to use synthetic data.`);
    if (input.content.includes('\u0000')) throw new Error(`“${name}” contains binary data. Use a UTF-8 text file.`);
    const bytes = new TextEncoder().encode(input.content).byteLength;
    if (bytes > MAX_DATA_INPUT_BYTES) throw new Error(`“${name}” exceeds 256 KB. Attach a smaller sample.`);
    totalBytes += bytes;
    if (totalBytes > MAX_TOTAL_DATA_INPUT_BYTES) throw new Error('Keep all data inputs together within 1 MB.');
    return { name, kind: input.kind, content: input.content };
  });
}

/** Shared by the renderer and desktop boundary so both accept the same brief. */
export function normalizeProjectInput(input: NewProject): NewProject {
  if (!input || typeof input.title !== 'string' || typeof input.description !== 'string' ||
      !Array.isArray(input.criteria) || input.criteria.some(c => typeof c !== 'string') ||
      (input.inputs !== undefined && typeof input.inputs !== 'string') ||
      (input.outputs !== undefined && typeof input.outputs !== 'string') ||
      (input.resources !== undefined && typeof input.resources !== 'string') ||
      (input.links !== undefined && (!Array.isArray(input.links) || input.links.some(link => typeof link !== 'string')))) {
    throw new Error('Invalid challenge.');
  }
  const title = input.title.trim(), description = input.description.trim();
  const criteria = input.criteria.map(c => c.trim()).filter(Boolean);
  const inputs = input.inputs?.trim() ?? '', outputs = input.outputs?.trim() ?? '';
  const resources = input.resources?.trim() ?? '';
  const links = (input.links ?? []).map(link => link.trim()).filter(Boolean);
  const dataInputs = normalizeDataInputs(input.dataInputs);
  if (!title || title.length > 120 || description.length < 20 || description.length > 16000) {
    throw new Error('Add a title (up to 120 characters) and a problem statement (20–16,000 characters).');
  }
  if (criteria.length > 100 || criteria.some(c => c.length > 2000)) {
    throw new Error('Use up to 100 evaluation criteria, with no more than 2,000 characters per line.');
  }
  if (inputs.length > 16000 || outputs.length > 16000) throw new Error('Keep inputs and outputs to 16,000 characters or fewer each.');
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
  return { title, description, criteria, inputs, outputs, resources, links, dataInputs, challengeId: input.challengeId };
}

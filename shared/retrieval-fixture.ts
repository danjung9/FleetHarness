const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Validate host retrieval fixtures before freezing them and again when scoring. */
export function retrievalFixtureProblem(input: unknown, expected: unknown): string | undefined {
  if (!record(input) || !Array.isArray(input.documents)) return 'input.documents must be an array of source documents.';
  if (!record(expected) || !Array.isArray(expected.ids) || !expected.ids.every(id => typeof id === 'string') || new Set(expected.ids).size !== expected.ids.length) {
    return 'expected.ids must be an array of unique string document IDs.';
  }
  const documents = new Map<string, Record<string, unknown>>();
  for (const [index, document] of input.documents.entries()) {
    if (!record(document) || typeof document.id !== 'string' || typeof document.text !== 'string') {
      return `input.documents[${index}] must be an object with string id and text fields.`;
    }
    if (document.source !== undefined && typeof document.source !== 'string') {
      return `input.documents[${index}].source must be a string locator when supplied.`;
    }
    if (documents.has(document.id)) return `input.documents[${index}].id duplicates another document ID; use unique source IDs.`;
    documents.set(document.id, document);
  }
  for (const [index, id] of expected.ids.entries()) {
    if (!documents.has(id) || documents.get(id)!.approved === false) {
      return `expected.ids[${index}] references an absent or excluded document; use an ID present in input.documents with approved !== false.`;
    }
    if (documents.get(id)!.text === '') {
      return `expected.ids[${index}] references a document with empty text; a required citation needs a nonempty source span.`;
    }
  }
}

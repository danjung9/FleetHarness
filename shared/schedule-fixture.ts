const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const minute = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

function windowsProblem(value: unknown, name: string): string | undefined {
  if (!Array.isArray(value)) return `${name} must be an array of availability windows.`;
  for (const [index, window] of value.entries()) {
    const path = `${name}[${index}]`;
    if (!record(window)) return `${path} must be an object with start and end minutes.`;
    if (!minute(window.start)) return `${path}.start must be a nonnegative safe integer minute.`;
    if (!minute(window.end)) return `${path}.end must be a nonnegative safe integer minute.`;
    if (window.end <= window.start) return `${path}.end must be greater than start.`;
  }
}

function stringsProblem(value: unknown, name: string): string | undefined {
  if (!Array.isArray(value)) return `${name} must be an array of unique strings.`;
  const seen = new Set<string>();
  for (const [index, item] of value.entries()) {
    if (typeof item !== 'string') return `${name}[${index}] must be a string.`;
    if (seen.has(item)) return `${name}[${index}] duplicates another value; use unique strings.`;
    seen.add(item);
  }
}

/** Validate fixture structure for either answer status; this does not solve or prove feasibility. */
export function scheduleFixtureProblem(input: unknown, expected: unknown): string | undefined {
  if (!record(expected) || (expected.status !== 'feasible' && expected.status !== 'infeasible')) {
    return 'expected.status must be feasible or infeasible; budget exhaustion is never a success answer.';
  }
  if (!record(input)) return 'input must be a schedule object with windows, people and requests arrays.';
  const operationalProblem = windowsProblem(input.windows, 'input.windows');
  if (operationalProblem) return operationalProblem;
  if (!Array.isArray(input.people)) return 'input.people must be an array of personnel records.';
  const roster = new Set<string>();
  for (const [index, person] of input.people.entries()) {
    const path = `input.people[${index}]`;
    if (!record(person)) return `${path} must be a personnel object.`;
    if (typeof person.id !== 'string') return `${path}.id must be a string.`;
    if (roster.has(person.id)) return `${path}.id duplicates another person ID; use unique IDs.`;
    roster.add(person.id);
    const problem = stringsProblem(person.qualifications, `${path}.qualifications`) ?? windowsProblem(person.windows, `${path}.windows`);
    if (problem) return problem;
    if (!minute(person.maxMinutes)) return `${path}.maxMinutes must be a nonnegative safe integer minute budget.`;
    if (!minute(person.restMinutes)) return `${path}.restMinutes must be a nonnegative safe integer minute interval.`;
  }
  if (!Array.isArray(input.requests)) return 'input.requests must be an array of work requests.';
  const requests = new Set<string>();
  for (const [index, request] of input.requests.entries()) {
    const path = `input.requests[${index}]`;
    if (!record(request)) return `${path} must be a work request object.`;
    if (typeof request.id !== 'string') return `${path}.id must be a string.`;
    if (requests.has(request.id)) return `${path}.id duplicates another request ID; use unique IDs.`;
    requests.add(request.id);
    if (!minute(request.duration) || request.duration === 0) return `${path}.duration must be a positive safe integer minute duration.`;
    if (!Array.isArray(request.starts)) return `${path}.starts must be an array of candidate start minutes.`;
    for (const [startIndex, start] of request.starts.entries()) {
      if (!minute(start)) return `${path}.starts[${startIndex}] must be a nonnegative safe integer minute.`;
    }
    for (const field of ['people', 'resources', 'qualifications'] as const) {
      const problem = stringsProblem(request[field], `${path}.${field}`);
      if (problem) return problem;
    }
    for (const [personIndex, id] of (request.people as string[]).entries()) {
      if (!roster.has(id)) return `${path}.people[${personIndex}] references an unknown person; use an ID present in input.people.`;
    }
  }
}

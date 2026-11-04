export class HttpError extends Error {
  constructor(public status: number, message: string, public code = 'request_failed') {
    super(message);
    this.name = 'HttpError';
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  } });
}

export async function readJson<T = Record<string, unknown>>(request: Request, maxBytes = 40_000): Promise<T> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'Send JSON with Content-Type: application/json.');
  }
  const declared = request.headers.get('content-length');
  if (declared && Number(declared) > maxBytes) throw new HttpError(413, 'Request is too large.');
  if (!request.body) throw new HttpError(400, 'A JSON body is required.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new HttpError(413, 'Request is too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as T;
  } catch { throw new HttpError(400, 'Invalid JSON object.'); }
}

export function requireUuid(value: string, label = 'ID'): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(400, `Invalid ${label}.`);
  }
  return value;
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) return json({ error: error.message, code: error.code }, error.status);
  // Upstream requests can contain account credentials. Never echo their raw errors.
  console.error('Hosted request failed', error instanceof Error ? error.name : 'UnknownError');
  return json({ error: 'The service could not complete this request. Please retry.', code: 'internal_error' }, 500);
}

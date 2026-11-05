# Python service foundation — version 1

This checked-in foundation supplies standard-library HTTP transport, a browser form, and the runtime contract. The bare starter's `compute.py` deliberately returns HTTP 501 until the agent implements the requested capability. A successful health check means the service started; it does not prove application correctness.

## Start

Requires Python 3.10 or newer. No installation or third-party packages are needed.

```sh
HOST=127.0.0.1 PORT=3000 python3 -B server.py
```

Open `http://127.0.0.1:3000/`. The host assigns `HOST` and `PORT` during clean evaluation. Respect both values: verification uses loopback and container delivery uses `HOST=0.0.0.0` with a port published on host loopback. `SIGINT` and `SIGTERM` stop accepting requests and close the server. Unfinished computation threads are daemon threads and do not prevent process exit.

## Extension contract

- Implement `compute(input_value)` in `compute.py`. It accepts a JSON value and returns a JSON value. Import the required backend modules and keep domain computation on the server.
- `POST /api/invoke` accepts the **raw JSON input**, not an extra envelope. It returns the **raw computed JSON value**, not `{ result: ... }`. This is the protocol used by `prepareSolutionRuntime.invoke`.
- Invalid JSON receives HTTP 400. Raise `ValueError` or `TypeError` for invalid domain input (HTTP 422), or `NotImplementedError` for unsupported capabilities (HTTP 501). Unexpected failures return HTTP 500. Failures use `{ "error": { "message": "..." } }`; the browser displays the message. Never silently fall back to canned outputs or hidden external services.
- Return only `None`, booleans, finite numbers, strings, lists, and dictionaries with string keys. Convert custom numerical or data-library objects to JSON values explicitly.
- `GET /health` returns `{ "status": "ok" }`. Keep this route independent of expensive computations and external service credentials.
- Replace the generic form in `public/index.html`, `public/app.js`, and `public/styles.css` with the required application interface. The form must invoke the backend. Add routes explicitly when adding static assets; arbitrary source files are not served.
- Write application tests and a domain `README.md`, including input schema, startup steps, dependencies, assumptions, and capability limits. Foundation transport checks cannot establish domain correctness.
- Start with the catalog’s `recommendedRuntime` when using the recommended selection. If selecting a different foundation, retain every selected template file plus the host-generated `foundation-lock.json`. Selected Node packs also require `lib/validation.js`, `lib/<pack module>.js`, and `example-input.json`. Keep all runtime source and assets in the solution manifest file allowlist. Add every imported module. The minimal manifest is below; `requiredEnv` must name actual required integration credentials. A solution contract must still provide the objective and required capabilities.

```json
{
  "profile": "service",
  "files": ["server.py", "compute.py", "public/index.html", "public/app.js", "public/styles.css", "FOUNDATION.md", "foundation-lock.json"],
  "requiredEnv": [],
  "command": { "runtime": "python", "entrypoint": "server.py", "args": [] },
  "healthPath": "/health",
  "invokePath": "/api/invoke"
}
```

Requests require a single `Content-Length` header and `Content-Type: application/json`; chunked or compressed bodies are rejected. The service accepts up to 1 MB of UTF-8 JSON, a depth of 64, 100,000 JSON values, and 2 MB of output. Four computations may be active, with up to 32 HTTP request handlers. Reading a body and awaiting computation each have a 10-second deadline. A timeout stops waiting, but Python threads cannot forcibly stop domain computation; the host runtime enforces a process deadline. Timed-out work retains its concurrency slot until it stops. Use explicit deadlines inside external API clients and bounded algorithms. This is a local application foundation, not a public deployment sandbox.

`create_server(port=0, computation=callable)` supports transport tests using an ephemeral loopback listener. Call `serve_forever()` in a separate thread, then `shutdown()` and `server_close()`. Preserve the Host, Origin, Fetch Metadata, and explicit static route checks. Preview iframe navigation is supported without granting cross-origin computation access.

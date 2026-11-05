# Node service foundation, version 1

This checked-in foundation supplies HTTP transport, a browser form, and the runtime contract. The bare starter's `compute.mjs` deliberately returns HTTP 501 until the agent implements the requested capability. When a bundled Node computation pack is selected, the host replaces this stub with an adapter to real calculation primitives in `lib/`; the agent must still implement the complete planned capability. A successful health check means the service started; it does not prove application correctness.

## Start

Requires Node.js 22.19 or newer. No installation or third-party packages are needed.

```sh
HOST=127.0.0.1 PORT=3000 node server.mjs
```

Open `http://127.0.0.1:3000/`. The host assigns `HOST` and `PORT` during clean evaluation. Bind only to that loopback host, respect the assigned port, and retain `package.json` for ES module imports from `.js` library files. `SIGINT` and `SIGTERM` close the HTTP server, allowing up to one second for requests to drain.

## Extension contract

- Implement the named `compute(input, { signal })` export in `compute.mjs`. It accepts a JSON value and returns, or resolves to, a JSON value. Check `signal` during cancellable work. Import the selected reusable backend modules and keep domain computation on the server.
- `POST /api/invoke` accepts the **raw JSON input**, not an extra envelope. It returns the **raw computed JSON value**, not `{ result: ... }`. This is the protocol used by `prepareSolutionRuntime.invoke`.
- Invalid JSON receives HTTP 400. Throw `TypeError` or `RangeError` for invalid domain input (HTTP 422), or attach `statusCode` to an `Error` for an explicit 400 to 599 status. Failures return `{ "error": { "message": "..." } }`; the browser displays the message. Never silently fall back to canned outputs or hidden external services.
- `GET /health` returns `{ "status": "ok" }`. Keep the route independent of external service credentials and expensive computations.
- Replace the generic form in `public/index.html`, `public/app.js`, and `public/styles.css` with the required application interface. The form must invoke the backend. Add routes explicitly when adding static assets; the server never exposes arbitrary files.
- Write application tests and a domain `README.md`, including input schema, startup steps, dependencies, assumptions, and capability limits. Foundation transport checks cannot establish domain correctness.
- Start with the catalog’s `recommendedRuntime` when using the recommended selection. If selecting a different foundation, retain every selected template file plus the host-generated `foundation-lock.json`. Selected Node packs also require `lib/validation.js`, `lib/<pack module>.js`, and `example-input.json`. Keep all runtime source and assets in the solution manifest file allowlist. Add every imported `lib/` module. The minimal service manifest is below; `requiredEnv` must name any actual required integration credentials. A solution contract must still provide the objective and required capabilities.

```json
{
  "profile": "service",
  "files": ["server.mjs", "compute.mjs", "package.json", "public/index.html", "public/app.js", "public/styles.css", "FOUNDATION.md", "foundation-lock.json"],
  "requiredEnv": [],
  "command": { "runtime": "node", "entrypoint": "server.mjs", "args": [] },
  "healthPath": "/health",
  "invokePath": "/api/invoke"
}
```

The local service accepts up to 1 MB of UTF-8 JSON, a depth of 64, 100,000 JSON values, and 2 MB of output. Four computations may be active. Reading a request body and awaiting computation each have a 10-second deadline. Computations receive an aborted signal on timeout or disconnect. A timeout stops waiting but cannot interrupt synchronous JavaScript or force an ignored cancellation signal; the host runtime enforces a process deadline. Timed-out work retains its concurrency slot until it settles. This is a local application foundation, not a public deployment sandbox.

For transport tests, `createApplication({ compute, ...limits })` returns an unbound HTTP server; `start({ compute, port: 0 })` returns `{ server, url, close }` for an ephemeral loopback listener. The browser uses the same raw-input protocol as clean host evaluation. Preserve the Host, Origin, Fetch Metadata, and explicit static route checks. Preview iframe navigation is supported without granting cross-origin computation access.

# AppYard runtime bridge

The Node and Python adapters run the same application functions during isolated comparisons and after source export.

Node modules export `invoke(input, context)` and optionally `handleHttp(request, context)`. Python modules export `invoke(input, context)` and optionally `handle_http(request, context)`. A one-argument Python function is also accepted. HTTP requests contain `method`, `path`, `headers`, and a UTF-8 `body`; responses contain `status`, `headers`, and a UTF-8 `body`. Request header names are lowercase in both host HTTP previews and exported services, so handlers use keys such as `content-type` and `accept` regardless of client casing. Header values retain their case. Without a custom HTTP handler, the adapter provides `GET /health` and `POST /api/invoke`.

Call a configured integration with `await context.integrations.invoke('operation-id', {body: value})` in Node, or `context['integrations']['invoke']('operation-id', {'body': value})` in Python. Only configured operation identifiers and query keys are available. Application functions must use this interface rather than opening sockets during an AppYard comparison. Do not log credentials. Standard output belongs to the protocol; use standard error for logs.

For local source delivery, run:

```sh
node runtime-broker/node.mjs --serve app.mjs integration-config.json
python3 -I -B runtime-broker/python.py --serve app.py integration-config.json
```

Set `HOST` and `PORT` for the local HTTP listener; defaults are `127.0.0.1:3000`. Use `--invoke` instead of `--serve` for one JSON input on standard input. Set the environment variable named by each integration's `auth.envName` before invoking that operation. Exported configuration contains fixed HTTPS origins, paths, methods, response types, optional query keys, and optional bearer/header-key authentication metadata. It contains no secret values or AppYard vault references.

Custom HTTP handlers receive `HEAD` and `OPTIONS` in both host previews and exported Node/Python services. `HEAD` preserves the handler's response status and headers but sends no response body; `OPTIONS` returns the handler's response normally. The application defines the route behavior and any method-discovery or CORS headers.

Exported Python HTTP services accept both `Content-Length` and chunked request bodies, including UTF-8 characters split across chunks. The adapter waits for complete framing before calling application code and rejects malformed, incomplete or ambiguous bodies. The decoded body limit is 2 MB; chunk metadata is limited to 8 KiB per line and 64 KiB per request, with a 30-second socket inactivity timeout while reading. Valid chunk extensions and trailers are consumed without adding them to application headers.

The configuration can be an operation array, or an object with `operations` and an optional `static` object. For example, `{"operations":[],"static":{"root":"public","files":["index.html","app.js"],"index":"index.html"}}` serves only those assets. The static root is relative to the configuration file. Application code and its browser assets stay identical in both modes; the adapter owns the local HTTP listener after export.

External connectors accept JSON request bodies and JSON/text responses, reject redirects, and cap requests at 100 calls per candidate during comparisons (100 per standalone process after export), 2 MB per message, and 30 seconds per operation. OAuth, WebSockets, arbitrary URL forwarding, and browser-side credentials are not supported. Browser applications using authenticated integrations require this local service companion. The isolated mode relies on the host broker for credential encryption, DNS address checks, cancellation and durable quota; standalone applications use their own environment credentials.

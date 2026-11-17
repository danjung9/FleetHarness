# Deploy AppYard: Vercel frontend and a persistent build worker

The frontend is a Vite/React application. OpenCode and the FleetHarness build engine
run on a separate Node worker with a persistent volume. The worker keeps projects,
sessions, source, tests and encrypted provider credentials across restarts. Frontend
requests do not own build lifetimes. The original desktop application is retained.

This release is a **private, single-workspace MVP**. The access token grants access
to the entire workspace. It is not a public multi-tenant SaaS: do not give strangers
access to this worker. Agents and generated code execute with the worker user's host
and network access. Use a dedicated machine/container with no unrelated credentials.
Tenant identities, per-build VM isolation, billing, durable queues across worker
replicas and collaborative editing are future work. One worker owns one data volume;
do not run multiple worker replicas against the same volume.

## 1. Provision the worker

Use a Linux server with Docker, persistent disk, at least 4 GB RAM, outbound model
and package-registry access, and wildcard DNS/TLS for previews. Route these hosts:

| Host | Upstream |
| --- | --- |
| worker.example.com | 127.0.0.1:3000 |
| *.preview.example.com | 127.0.0.1:3001 |

The worker API and generated apps must have different origins. Each opened preview
gets a random hostname and an independent browser origin. Preview URLs are bearer
capabilities: anyone with one can access that generated app until the preview is
closed or the worker restarts. They never expose the worker API. Configure your TLS
proxy for wildcard certificates, streaming responses and a request timeout of at
least 60 seconds. Do not buffer /api/events. Port 3001 accepts only active random
preview hostnames. Do not expose agent runtimes or their dynamic loopback ports.

Create a **local, untracked** .env containing:

```dotenv
APPYARD_WORKER_TOKEN=<random secret, at least 32 characters>
APPYARD_ENCRYPTION_KEY=<32 random bytes encoded as 64 hex characters>
APPYARD_FRONTEND_ORIGINS=https://your-app.vercel.app
APPYARD_PREVIEW_DOMAIN=preview.example.com
```

Generate the token and encryption key with `openssl rand -hex 32` separately. Keep
the encryption key stable and back it up separately from the persistent volume.
Then run:

```sh
docker compose -f compose.worker.yaml up -d --build
curl https://worker.example.com/health
```

The health endpoint returns only a status. All API, state streams and downloads
require the workspace token. Exact frontend origins are checked; wildcards are not
accepted. API keys are configured in model settings after login and encrypted with
AES-256-GCM when remembered. No worker secret belongs in a VITE_ variable.

## 2. Deploy the frontend to Vercel

Create a **new Vercel project** from this checkout/branch; do not overwrite the
repository's existing production application. The existing vercel.json builds only
the frontend with `npm run build:web` and serves `dist-web`. Set:

```dotenv
VITE_APPYARD_WORKER_URL=https://worker.example.com
VITE_APPYARD_PREVIEW_ORIGIN=https://*.preview.example.com
```

These are public origin addresses, not secrets. The build validates both and injects
them into the content security policy; arbitrary external scripts remain blocked. Use Node 22 or newer in the Vercel
project. Deploy after setting the variable, then set APPYARD_FRONTEND_ORIGINS on
the worker to the exact assigned Vercel URL and restart the worker. Preview builds
need their exact origin explicitly allowed; do not allow every vercel.app origin.
Vercel's install command intentionally skips native postinstall scripts; only the
worker image installs and executes OpenCode.

Open the frontend, enter the workspace access token, connect an OpenCode model in
Settings, and submit an app prompt. The build runs in the worker; state streams to
the frontend. Open the preview, request changes through chat, apply the proposed
change, and review verification evidence before exporting source as a ZIP.

The token is kept in browser sessionStorage and is never a provider API key.
Closing the browser tab clears it. HTTPS is required in production. To rotate the
token, update the worker secret and restart; saved projects remain intact.

## 3. Verify deployment

- Unauthenticated POST /api/rpc returns 401; an unlisted browser Origin returns 403.
- Login succeeds from the deployed frontend; create a project and reload to verify
  persistence. A bad token must return to login with a recoverable error.
- Connect a model and perform a real build; browser checks and a passing preview
  do not establish production readiness by themselves.
- Confirm previews use the wildcard preview domain and the builder stays on Vercel.
- Send a chat change, apply the proposal and verify the changed app.
- Review evidence, approve and download the source ZIP.
- Restart the worker and confirm projects and remembered keys recover. Interrupted
  builds retain their checkpoints; they are not silently marked successful.

## Local development

Requires Node >=22.19. Install with `npm ci`, set the worker variables in your shell,
use APPYARD_FRONTEND_ORIGINS=http://127.0.0.1:5173,
APPYARD_PREVIEW_DOMAIN=localhost:3001 and APPYARD_PREVIEW_SCHEME=http. Start
`npm run dev:worker`. In a second shell set
VITE_APPYARD_WORKER_URL=http://127.0.0.1:3000 and
VITE_APPYARD_PREVIEW_ORIGIN=http://*.localhost:3001 and run `npm run dev:web -- --port 5173`.
Local previews use random *.localhost hostnames; production requires wildcard DNS.

The worker intentionally exposes OpenCode builds, chat, artifact browsing, review,
source export and preview. Desktop-only connectors, storage management, candidate
comparisons, ChatGPT account login and native application packaging are not exposed
by the hosted API. They must not appear as functioning hosted features.

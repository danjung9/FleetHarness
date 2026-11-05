# Hosted demo

The hosted build uses Vite/React, Nitro API routes and Vercel Workflow. OpenAI agents and verification run in Vercel Sandbox. Supabase provides email/password authentication, Postgres state and a private artifact bucket. Desktop and browser-preview builds remain available through their existing commands.

Each account owns its projects and encrypted OpenAI connection. Signing out or closing a tab leaves the durable workflow running. Pause saves the last completed stage; Resume restores that checkpoint in a new sandbox and may rerun the interrupted stage. A process crash follows the same recovery path. A run cannot resume with a different model.

## Application updates and demos

The hosted UI includes the application development from `codex/main-update`. Authentication, account storage, encryption, workflows and build APIs remain hosted. The production engine and skills are preserved in `worker/runtime/` so existing checkpoints and verification reports keep their original contracts. Desktop-only connectors, attached data files, conversation tools and local storage management are not exposed on the hosted site.

All 39 refined Norfolk demos are available at `/demos/index.html`, with a link from Home. These standalone demos use synthetic data and browser-local state; they do not create or replace account builds.

## Deployment

Keep hosted changes on branches based on `prod` and test staging before merging into `prod`. The production GitHub Actions workflow deploys only pushes to `prod` to `fleetharness-studio`. The `main` branch retains the local Electron application and static browser preview. On `prod`, `vercel.json` runs `npm run build:hosted`; Nitro produces the Vercel Build Output API directory automatically.

The production repository is public. A successful build alone does not confirm deployment: check the production workflow result and the live application after each push to `prod`.

Staging is a separate Vercel project, `fleetharness-staging`, at `https://fleetharness-staging.vercel.app`. Its public address is needed so sandbox workers can reach the authenticated model proxy. Do not use a Vercel-authentication-protected deployment URL as `APP_ORIGIN`.

```sh
npm ci --ignore-scripts
npm run test:hosted
npm run build:hosted
vercel link --project fleetharness-staging
vercel deploy --prod
```

Here `--prod` selects the staging project's stable URL. Confirm the linked project before using it. To promote to the existing live site, merge the reviewed hosted changes into `prod`. Production and staging currently share one Supabase backend for the private demo, so database/schema changes affect both sites.

## Configuration

Apply `supabase/migrations/202611040001_hosted.sql` once in a dedicated Supabase project. It creates private tables, restricted database functions and the `fleet-artifacts` bucket. All table and storage requests pass through the server; browser roles have no table access. Service-role grants are explicit, so automatic exposure of new tables is unnecessary.

| Variable | Purpose | Visibility |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL for sign-in | Public |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable/anon key for sign-in | Public |
| `SUPABASE_URL` | Same project URL on the server | Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Authenticated storage and database operations | Server secret |
| `CREDENTIAL_ENCRYPTION_KEY` | Base64 encoding of 32 random bytes, for account key encryption | Server secret |
| `APP_ORIGIN` | Stable HTTPS application origin | Server |

Vercel supplies OIDC credentials for Sandbox and Workflow at runtime. For local Sandbox integration tests, `vercel link`/`vercel env pull` refreshes a short-lived OIDC credential in the ignored `.env.local`. Never commit an environment file.

Back up the credential-encryption key privately. Changing it without re-encrypting records makes saved OpenAI keys unreadable; accounts can reconnect their keys in Settings. Never give the service-role key a `VITE_` prefix.

Create demo accounts through Supabase admin controls and disable public signups. Manually created, confirmed demo accounts do not require email invitations. Users enter their own OpenAI API keys in Settings, select a supported model and run the connection test. The test checks model access and makes a small real Responses request. ChatGPT subscriptions are not used by this hosted build.

## Execution and publication

- Atomic database transitions allow one active build per account and per project. Resume increments an epoch; stale workflows cannot overwrite current state.
- OpenAI keys stay encrypted in Postgres and are decrypted only by the backend. Sandboxes receive a temporary capability for one run and model. The proxy limits requests/output tokens and disables provider-side response storage.
- Checkpoints and artifact versions are immutable, owner-scoped objects with content hashes. The latest complete checkpoint survives sandbox expiry.
- Independent verification restores files in a fresh sandbox. Generated Node tests run as a separate unprivileged Linux user without access to verifier control files. Source/evidence hashes are checked before approval.
- Approval is tied to the exact verified version. Download creates a source/evidence ZIP; hosted native executable packaging is deferred.
- Previews serve static files on a separate HTTPS sandbox origin, one origin per artifact version. Generated apps cannot access FleetHarness login storage. Share explicitly publishes an immutable approved snapshot through an unguessable link; account details and API keys are excluded.
- Preview processes expire after 30 minutes. Opening the app preview or stable share link starts one again from saved artifacts. Direct sandbox URLs are temporary.

Long build sessions request a checkpoint pause before Sandbox Hobby expiry. Model calls are limited to 120 per run, including resumes. API quotas, credits and model access depend on the user's OpenAI project. These are demo guardrails, not a public billing system.

## Release checks

Run unit and PostgreSQL tests, then exercise the deployed app:

1. Account A connects its key, saves a brief and starts a build.
2. Sign out and sign in as B. A's project and credentials are absent.
3. Sign back in as A. The build has progressed or has a recoverable checkpoint.
4. Pause during a stage, wait for Paused, then resume. Completed stages are retained.
5. Verify, approve, download the ZIP and open the share link without a FleetHarness session.
6. Check invalid credentials, expired sessions and provider limits produce actionable errors without secrets.

Automated hosted tests use fixtures and do not spend OpenAI credits. The final deployed generation check must use a real account key entered by its owner.

`npm run build:hosted` also cold-starts the emitted Workflow handler and checks workflow/step registration without network access. For a provisioned staging account, `scripts/smoke-hosted-live.mjs --check` checks readiness without starting a build. Run it with `--execute` only when ready to spend real provider usage: it demonstrates sign-out continuity, checkpoint pause/resume, verification, approval, export and an unauthenticated share. It requires the public Supabase key and an ignored mode-600 `output/hosted-demo-accounts.json` login file, and leaves its demo project available for inspection.

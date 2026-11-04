# Hosted browser application

Production: https://fleetharness-studio.vercel.app

The `Deploy production to Vercel` GitHub Actions workflow publishes every push to
`main`, including merged pull requests. It builds the browser application from
the repository root and deploys to the existing `fleetharness-studio` project in
the `george-vekios-projects` Vercel team. The URL stays the same after updates.
Local edits must be committed and pushed to `main` before they appear online.

The workflow uses `vercel pull`, `vercel build --prod`, and
`vercel deploy --prebuilt --prod`. A failed build does not replace production.
Deployments run serially, and the workflow can also be run manually from Actions
with `main` selected. Other branches do not deploy to production.

`vercel.json` selects `npm ci --ignore-scripts`, `npm run build:web`, and
`dist-web`. This skips Electron's install hook and desktop packaging. To check
the web build locally, run:

```sh
npm ci --ignore-scripts
npm run build:web
```

Required repository Actions secrets:

- `VERCEL_TOKEN`: a Vercel access token scoped to `fleetharness-studio`.
- `VERCEL_ORG_ID`: the Vercel team ID.
- `VERCEL_PROJECT_ID`: the existing Vercel project ID.

The token is stored only as an encrypted GitHub secret. Replace that secret if
the token is revoked or rotated. Never commit credentials or `.vercel/`.

GitHub Actions is used because the repository belongs to a different personal
GitHub account, whose owner must configure Vercel's native Git integration.
Do not enable a second automatic deployment mechanism for this project while
the Actions workflow is active.

The hosted app remains a browser preview. Agent execution, local file access,
tests, and generated app previews require the Electron backend. Browser data
stays in each visitor's local storage.

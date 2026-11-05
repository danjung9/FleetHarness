# Application foundations

AppYard starts application builds from versioned local templates so agents can extend an existing interface and backend. The host copies the selected foundation after planning and before implementation. It does not call a remote scaffolding service or ask the model to write the foundation files.

The implementation lives in `harness/foundations.ts`; bundled assets and their SHA-256 registry live in `templates/`. These are original AppYard templates. Vite, Fastify, and FastAPI are researched references, not installed dependencies or vendored starter code. See [the research and selection rationale](application-foundations-research.md).

Run `npm run test:foundations` to verify bundled hashes, reproducible copies, backend computation, browser invocation and Python customization. After reviewing an intentional template or calculation-module edit and its version, run `npm run build:electron`, then regenerate registry hashes with `node scripts/check-foundations.mjs --update`; the default invocation checks without modifying files.

## Start a foundation locally

From the repository, list the templates and challenge catalog:

```sh
npm run harness -- foundations
npm run harness -- catalog
```

Create a new directory for the message-extraction challenge, then start its service:

```sh
npm run harness -- scaffold 24 --out /tmp/appyard-messages
cd /tmp/appyard-messages
node server.mjs
```

Open the printed `http://127.0.0.1:3000/` address. Use `127.0.0.1` rather than `localhost`: the adapters enforce the assigned loopback address. Set `PORT` when another service is already using port 3000. Stop with Ctrl+C.

The CLI syntax is:

```text
npm run harness -- scaffold <challenge-id> --out <new-dir> [--template node-service|python-service]
```

Without an override, the challenge recipe determines the recommendation. To choose a Python boundary explicitly:

```sh
npm run harness -- scaffold 17 --out /tmp/appyard-physics --template python-service
cd /tmp/appyard-physics
python3 server.py
```

`node-service` requires Node 22.19 or newer. `python-service` requires installed Python 3.10 or newer; the desktop application does not bundle Python. Both foundations use only their runtime's standard library and need no package installation. The Python foundation always uses a custom compute pack and reports unimplemented computation until the agent or developer supplies `compute.py`.

Scaffolding creates a starting application, not a finished challenge solution or a passing acceptance report. The CLI writes `foundation-plan.json`, `foundation-lock.json`, and `runtime-manifest.json`; it does not run the agent planning workflow or generate its acceptance artifacts. Use a new output directory: the CLI refuses every existing destination, and materialization rejects conflicting files rather than overwriting work.

## How agents choose

The domain specialist's recipe and the required runtime determine the foundation. Pi and Codex receive the same catalog. Research may recommend a different listed foundation, but planning must explain the choice and make the solution runtime agree with it.

| Recipe | Default template | Compute pack |
| --- | --- | --- |
| `messages` | `node-service` | `messages` — extraction with source evidence |
| `scheduling` | `node-service` | `scheduling` — bounded feasibility solver |
| `offline`, `workflow` | `node-service` | `offline` — revision reconciliation only |
| `knowledge`, `cyber` | `node-service` | `evidence` — supplied-corpus search |
| `readiness` | `node-service` | `readiness` — dependency analysis |
| `governance`, `fielding` | `node-service` | `custom` — implementation required |
| `physics` | `python-service` | `custom` — authoritative equations and implementation required |

`computePack: custom` keeps the service foundation and leaves its domain function unimplemented. `templateId: custom` is different: it copies no application source. Planning can use this escape hatch for a browser-only offline application, a CLI deliverable, or an existing owner-supplied application whose runtime does not fit either service. It requires a concrete incompatibility and an independently declared runtime. It should not be used merely to recreate an equivalent service.

## Planning and provenance artifacts

| File | Purpose |
| --- | --- |
| `.fleet/foundation-catalog.json` | Host-provided templates, compute packs, recipe recommendation, and recommended runtime manifest. |
| `.fleet/foundation-guide.md` | Compact instructions for selection and extension. |
| `foundation-plan.json` | Planning agent's template/version, compute pack, and reason. Validated against the solution contract. |
| `solution-contract.json` | Application runtime, package file allowlist, and computational requirements; it must include the selected foundation's required files. |
| `runtime-manifest.json` | CLI scaffold's standalone runtime declaration; agent runs declare this runtime inside `solution-contract.json`. |
| `foundation-lock.json` | Host-written selection, original file hashes, aggregate template fingerprint, and copied file/byte counts. |
| `FOUNDATION.md` | Materialized template's entry points, extension guidance, and limitations. |
| `example-input.json` | Synthetic toolkit input included with a bundled Node compute pack. |

A plan has this shape:

```json
{
  "schemaVersion": 1,
  "templateId": "node-service",
  "version": "1.0.0",
  "computePack": "messages",
  "reason": "Reuse the existing source-preserving parser and extend its review interface."
}
```

The host materializes the foundation only after planning succeeds. Agents must not generate those source files during planning. The selected runtime uses `profile: service`, `server.mjs` with Node or `server.py` with Python, empty command arguments, `/health` for health, and `/api/invoke` for computation. Copy the complete manifest from the catalog and add application-specific files or dependency locks as needed.

After materialization, edit the application source freely. Keep `foundation-plan.json` and `foundation-lock.json` unchanged: they identify the starting point, not the final application contents. The lock's copied file count and bytes measure reuse; they do not measure token reductions or certify application quality. Re-running materialization over edited files fails instead of resetting those files.

The generic input/result client does not constrain the output to one page. New UI builds follow a planned [screen structure](ui-structure.md), using separate HTML pages, service routes or client-side views as appropriate. Replace the sample form with those layouts, declare all added pages/assets in `runtime.files`, and explicitly add service routes while preserving the file allowlist. Build navigation and screen containers before feature controls. Static browser packages use relative links so they also work beneath the preview mount.

## Extend the actual backend

Both templates serve `public/index.html`, `public/app.js`, and `public/styles.css`, with request validation and error handling already connected. The browser sends raw input JSON to `POST /api/invoke`. The service calls `compute.mjs` or `compute.py` and returns its JSON result. The host service evaluator invokes that same endpoint. Application tests should import the same computation module rather than maintaining a second implementation.

Node compute packs copy their domain module and validation helper into `lib/`, then connect `compute.mjs` to those files. The exported application therefore does not depend on `.fleet` or a live harness tool. Extend that adapter and its modules to meet the accepted application contract, then build a domain-specific interface on the existing client.

`example-input.json` demonstrates toolkit transport with synthetic data. It is not brief data, an independently derived answer key, or evidence that the challenge is solved. Use the prepared brief inputs and agreed acceptance cases for application behavior and verification.

The offline/workflow pack computes revision reconciliation; it supplies no durable storage, synchronization transport, or workflow transition enforcement. Cyber receives evidence search, not remediation. Physics and governance require their missing domain implementation. A running `/health` endpoint means the service is reachable, not that those computations exist. These loopback foundations are local prototypes; authentication, production hosting, databases, OCR, and model inference require explicit additions. Python's standard-library server is not a production hosting stack.

## Add or update a foundation

1. Add reviewed assets under `templates/<template-id>/` with an explicit backend compute boundary and a short `FOUNDATION.md`. Keep assets deterministic and independent of the agent provider. If copying upstream code, retain its license notices and record its immutable source revision.
2. Add the template ID, version, required files, runtime requirements, and references to the catalog and validation in `harness/foundations.ts`. Update runtime generation, recommendation rules, and agent guidance together. A new runtime beyond Node/Python also needs runtime-provider support.
3. Pin every template asset's SHA-256 in `templates/registry.json`, matching the catalog's exact file list. Treat a released asset change as a new template version; update version validation deliberately instead of silently changing an existing release. Compute-pack source comes from the compiled `harness/tools` modules; their hashes and version are also pinned in the registry's `computation` section. The CLI and desktop compiler outputs must agree. Each application's foundation lock records the actual copied bytes.
4. Include the assets in the desktop release and exercise clean materialization, mismatched asset hashes, selection/runtime mismatch, and overwrite protection. Test the real browser-to-backend call and independent results in a fresh package. Ensure custom/unimplemented computations fail clearly and do not substitute sample output.
5. Run the foundation tests after compiling the host:

   ```sh
   npm run build:electron
   node --test tests/foundations.test.mjs
   ```

For dependencies added to a foundation, retain exact package versions and complete supported locks. Current clean execution supports registry npm locks and hash-pinned pip wheels; it does not build arbitrary frontend source or orchestrate multiple services. Keep package assets within the declared runtime file allowlist and verify the packaged application, not just the development workspace. Full application quality gates still run after foundation reuse.

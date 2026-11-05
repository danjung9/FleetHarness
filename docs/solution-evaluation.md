# Computational solutions and evidence

New factory runs plan a callable computational core, freeze its acceptance criteria and evaluate the actual delivered runtime before finishing the application. The same path supports algorithms, optimization, prediction, retrieval, generation, workflows and stateful capabilities. Capability kinds describe the problem; they do not select an arbitrary generated grading script.

The sequence is:

1. Define the objective, mandatory capabilities, runtime, independent reference cases and thresholds during planning.
2. Validate and hash the contracts. Move evaluation answers outside the implementation workspace.
3. Build the core and execute host-owned evaluators against a clean package. Repair implementation within the run's repair budget.
4. Complete the interface using that core. Run computational checks, each browser journey at each viewport, and developer tests in separate fresh runtime instances, closing each before the next begins. Each instance must have the same declared-file hash.
5. Permit review only when mandatory capabilities and package evidence pass. Optional deferred requirements remain visible and prevent a claim of complete requirement coverage.

All contract objects reject unknown fields. Expected answers, thresholds, criteria and runtime declarations cannot be rewritten during repair. Evaluation answer keys are restored for the delivered source package after verification.

## Required files

- `solution-contract.json`: objective, required capabilities, public invocation protocol, runtime and file allowlist.
- `evaluation-plan.json`: versioned reference datasets, input/expected pairs and host evaluators.
- `acceptance-plan.json`, version 2: every canonical acceptance criterion mapped to capability and/or browser evidence.
- `ux-spec.json`, version 1: audience, user task, states, recovery and interaction design.

The exact authoring guide is exported as `solutionContractGuide` from `harness/solution-contract.ts` and copied into each workspace at `.fleet/solution-contract.md`. `harness/quality-contract.ts` defines the companion acceptance/UX schemas. The project's recorded `qualityVersion` is the minimum report version for review, approval, source export and executable packaging. Version 1 reports remain valid for legacy version 1 projects; they cannot satisfy a version 2 project without computational and clean-package evidence. Version 3 and 4 projects likewise require their newer evidence, including the existing visual-review and experiment checks where applicable. A newer report must still pass every check for its own version.

Verification also binds the approved source to a versioned SHA-256 encoding with explicit byte lengths for every artifact path and contents. Moving bytes between files or between a filename and its contents changes that hash, including for binary artifacts. Existing metadata exclusions and evidence options remain unchanged. Reports and approvals made with the earlier unframed encoding remain readable but cannot authorize approval, export, packaging or candidate selection under the new encoding. Run verification again through the normal build flow; reviewed revision checkpoints bound to an old source hash require a new build. Saved evidence is never automatically rehashed, and legacy hashes are not accepted as a fallback.

Standalone packaging checks the complete copied payload against that approved source fingerprint, including the exact contract and acceptance metadata used to choose its files. A source edit restored after copying cannot authorize different downloaded bytes or a changed deployment allowlist. Missing, extra or symlinked payload files fail staging, and failed staging is removed without deleting existing caller files. Legacy single-page apps retain the same check for their copied entrypoint. The trusted Electron wrapper is added only after payload verification; generated dependency manifests and main scripts remain application data.

Declared runtime files must belong to the verified source and export inventory. Paths containing `.pi`, `.DS_Store`, `.git` or `node_modules` as any segment are rejected during planning, runtime preparation, visual fingerprinting and delivery validation, including case aliases and saved manifests. These names remain excluded from the artifact inventory; move application-owned code or data to an included path and create a new plan. Ordinary names such as `data/review.json`, `.config/settings.json` and `.pi-data/value.json` remain supported. Existing saved reports and exported bundles are not rewritten.

Every `runtime.files` entry names a file, so a manifest cannot declare both `assets` and `assets/data.json`. Ordinary and experiment planning reject file/parent conflicts before freezing, regardless of entry order or letter case. The same check rejects duplicates and conflicts in saved manifests at runtime, visual fingerprinting and export boundaries. Shared directories such as `assets/a.json` and `assets/b.json`, and distinct prefixes such as `assets` and `assets-data.json`, remain valid. Correct an invalid manifest by creating a new plan; frozen expectations are not rewritten.

Standalone browser apps serve declared data files, including CSV, text and binary assets, with the same content types and `application/octet-stream` fallback as the ordinary preview. Responses disable MIME sniffing. CommonJS (`.cjs`, case-insensitive) files remain unavailable through the renderer protocol, and undeclared files remain inaccessible. The wrapper retains its existing sandbox and content security policy.

Isolated browser and service previews also serve declared data and assets without an extension allowlist, including CSV, text, JPEG and WebAssembly files. JPEG and WebAssembly retain their ordinary-preview content types; unknown extensions use `application/octet-stream` with MIME sniffing disabled. CommonJS (`.cjs`, case-insensitive) files remain excluded from static serving. The host still requires the preview lease, serves only declared files within the frozen package and enforces the existing origin, size and content-security boundaries. Requests outside static serving continue through the application's HTTP handler. Newly planned experiment exports include these declared assets in their standalone service configuration, retaining the CommonJS and host `runtime-broker/` source exclusions. Existing frozen configurations and adapters are not rewritten; create a new candidate to receive the expanded export configuration.

The exported Node adapter collects stdin and HTTP request bytes before decoding UTF-8, preserving Unicode characters split across stream chunks. Both paths enforce the existing 2,000,000-byte input limit on received bytes. New candidates receive this adapter; previously frozen or exported adapters remain unchanged.

The separate runtime-file fingerprint also uses one versioned, length-framed SHA-256 encoding across ordinary execution, isolated execution and visual review. Each declared path is bound to its exact bytes, including binary data and empty files, so moving data between declared files cannot preserve the fingerprint. Runtime integrity checks and visual evidence revalidation use this encoding; earlier visual fingerprints require fresh captures and reviews when revalidated. Saved reports and approvals are not rewritten or automatically revoked by this runtime-encoding change; their existing source-hash and report gates still apply.

## Minimal CLI contract

Replace `R1` with a canonical criterion ID from the challenge packet.

```json
{
  "schemaVersion": 1,
  "objective": "Sum supplied task durations",
  "invocation": {
    "input": "Object with values: an array of finite numbers.",
    "output": "Object with exactly total: a finite number.",
    "rules": ["Sum all values, including negative values; an empty array totals zero. Reject malformed inputs with a runtime error."]
  },
  "capabilities": [{
    "id": "total",
    "kind": "algorithm",
    "description": "Calculate a total including empty and corrected inputs",
    "criterionIds": ["R1"],
    "required": true,
    "evaluationIds": ["sum-cases"]
  }],
  "runtime": {
    "profile": "cli",
    "files": ["core.mjs", "engine.mjs"],
    "requiredEnv": [],
    "command": {"runtime":"node","entrypoint":"engine.mjs","args":[]}
  }
}
```

New plans must include `invocation` with nonempty `input` and `output` descriptions (up to 12,000 characters each) and 1–64 `rules` (up to 2,000 characters each). This public protocol stays available after answer keys are sealed. Specify every action, field type, optional/default/null behavior, exact status/error string, error precedence and array ordering. The builder must not need the sealed cases to discover the interface. Keep held-out input/answer pairs in the evaluation plan; describe general rules in the public protocol. It is frozen with the solution contract. Older saved contracts without this field remain readable.

`kind` is one of `algorithm`, `optimization`, `prediction`, `retrieval`, `generation`, `workflow`, `stateful`. At least one capability must be required. Required capabilities need evaluation IDs and cannot map to deferred criteria. Every evaluation has exactly one owning capability; both directions of the references are checked.

The corresponding `acceptance-plan.json` can contain no browser journeys for a CLI:

```json
{
  "schemaVersion": 2,
  "criteria": [{
    "criterionId": "R1",
    "disposition": "implemented",
    "expectedOutcome": "Supplied durations produce the independently calculated total",
    "journeyIds": [],
    "capabilityIds": ["total"]
  }],
  "journeys": []
}
```

Browser and service profiles require primary and recovery browser journeys. A criterion may reference both a core capability and browser journeys, so a working engine cannot compensate for a disconnected UI.

## Runtime profiles

| Profile | Configuration | Invocation |
| --- | --- | --- |
| `cli` | `command: {runtime,entrypoint,args}` | One JSON value on stdin; exactly one JSON value on stdout; diagnostics on stderr |
| `browser` | `entrypoint: "index.html"`, `requiredEnv: []`, `evaluator: {runtime:"node",entrypoint,args}` | HTML served from the clean package; evaluator is required to invoke the same browser-compatible JavaScript/WASM module as the UI |
| `service` | `command`, `healthPath`, `invokePath` | Bind to `HOST=127.0.0.1` and host-assigned `PORT`; health returns success; POST invocation receives/returns JSON; serve UI on the same origin |

Commands use `runtime: "node"` or `"python"`, a relative entrypoint and an explicit argument array. The host invokes executable arguments without a shell. CLI/browser evaluator processes restart for each case; the package directory remains available for the run. A service persists across case requests. Tests involving state should explicitly establish their starting state and verify the intended boundaries.

Node entrypoints are invoked as explicit relative file paths. A declared name such as `-e`, `--eval` or `-` runs that allowlisted file; it cannot select a Node option or execute stdin. The argument array reaches the application in its original order, including arguments that begin with a hyphen. This applies to CLI commands, browser evaluators and service commands. Existing saved reports are not rescored by this launch correction.

Static browser profiles only support a Node evaluator and no required environment variables. They have no Python or credential-bearing inference runtime in the delivered browser. Use a service or CLI profile when the actual delivered engine requires Python, an inference API key or other runtime environment settings.

Host preview and downloaded browser-app policies allow WebAssembly compilation with the CSP `wasm-unsafe-eval` permission. Declare fetched `.wasm` modules in `runtime.files` and use the same computational module in the UI and Node evaluator. JavaScript string evaluation (`eval` and `new Function`) stays blocked; existing script, connection and renderer restrictions still apply. Browser checks must execute the computation and assert its visible result: fetching valid WASM bytes alone does not prove the module can run.

Downloaded browser apps support navigation between declared `.html` pages on their own `fleet-app://app` origin, including query strings and fragments. Every destination page must appear in `runtime.files`. External destinations, undeclared files, non-HTML resources, subframe navigation and new windows remain blocked; the renderer retains its sandbox and has no Node access. Include page transitions in acceptance journeys so verification exercises the complete user flow before delivery.

`files` is a complete deployment allowlist: source, imported modules, static assets, data and dependency manifests. Entry points and dependency manifests must be listed. Paths cannot be absolute, traverse directories, use symlinks or collide under case folding. Host contracts/answer keys, `inputs/manifest.json` host metadata, `.fleet`, `.git`, evidence directories, `.env*`, `node_modules` and `.venv` cannot be included. Ordinary supplied data files may be listed. Runtime dependencies are installed freshly. Developer test files are copied into their own clean runtime; helper modules and test data they import must be declared files. Host evaluations never receive these copied tests or their temporary state. Browser verification starts a fresh service/package after evaluation, so a successful inference or test setup cannot silently initialize a broken first-run user flow.

Every discovered `.test.js`, `.test.cjs`, `.test.mjs`, `.spec.js`, `.spec.cjs` or `.spec.mjs` file must complete at least one `node:test` case. Zero-byte files are included in discovery and clean-runtime copying, so an empty placeholder blocks verification even when another file passes. Fill unfinished test files with executable cases before requesting review. This rule applies to ordinary and isolated verification.

The root paths `test-report.json`, `review.json` and `DELIVERY.md` are reserved for host-written evidence and delivery notes, including case variants and directories at those paths. They cannot be runtime dependencies: the host rewrites them after verification and excludes them from the source fingerprint. Planning, ordinary and isolated execution, and delivery reject these conflicts, including in older saved manifests. Move application data to a separate path and create a new plan; existing contracts and reports are not rewritten. Nested application data such as `data/review.json` remains supported.

Each browser journey at each viewport starts its own clean package and browser context. Service memory and local files therefore cannot leak from the desktop attempt into the narrow attempt, or between primary and recovery journeys. Steps within one journey, including reloads, retain their state so persistence remains testable. Every attempt must match the core evaluation's runtime-file hash and pass its integrity check before cleanup. Runtime preparation shares the original browser verification deadline. This applies to ordinary and isolated final verification and independent factory browser holdouts; external integration state is not reset.

Declared deployment files are checked for changes before/after invocation and after browser execution. Put mutable state in new files outside the allowlist or operating-system temporary storage; never overwrite packaged source or seed data to save runtime state.

`requiredEnv` contains uppercase configuration names such as `MODEL_API_KEY` and `MODEL_NAME`, never values. Only declared values are passed through alongside sanitized runtime basics. Host settings (`PATH`, `HOME`, `PORT`, `NODE_OPTIONS`, `PYTHONPATH`, package-manager settings and similar controls) are reserved. Missing configuration fails visibly. A model-dependent implementation must make actual inference calls; sample responses do not establish inference availability. Known configured secret values are redacted from evaluation output; environment evidence records names only.

Optional locked dependencies:

```json
{"manager":"npm","manifest":"package.json","lockfile":"package-lock.json"}
```

```json
{"manager":"pip","manifest":"requirements.in","lockfile":"requirements.txt"}
```

The manager must match the command runtime; both files must be distinct allowlisted files. npm supports version 2/3 lockfiles with exact package versions, HTTP(S) archive URLs and integrity hashes, and installs production dependencies with lifecycle scripts disabled. Git/local/file dependencies and workspaces are unsupported. pip installs in a new virtual environment with pinned `name==version`, SHA256 hashes and binary wheels only. Recursive includes, local links, index flags and environment markers are unsupported. Dependency installation may need network access; the default offline benchmark has no external dependencies.

Host defaults bound the total runtime to 5 minutes, startup and each invocation to 15 seconds, dependency installation to 2 minutes, output to 2 MB and package contents to 100 MB. Failures, timeouts and malformed JSON are failed evidence. The clean directory and sanitized environment are reproducibility controls, **not an operating-system security sandbox**. Generated code still executes with the host user's operating-system privileges.

Engine JSON output must be valid UTF-8. The host validates complete command output and HTTP response bodies before decoding or scoring, including expected HTTP rejections. Isolated worker frames receive the same check; an invalid frame closes the worker and rejects pending requests. Malformed bytes cannot become replacement characters that match a frozen answer. Valid Unicode, literal replacement characters and multibyte characters split across chunks remain supported. Process diagnostics keep their existing handling, and saved reports are not rescored.

Isolated experiment runtimes enforce a separate startup deadline from sandbox launch preparation until the adapter confirms that the application module has loaded. Dependency installation retains its own budget. Readiness clears the startup timer; each later invocation uses its invocation limit, while the total runtime budget and cancellation remain active throughout. Failed startup closes the process, revokes its integration lease and removes the temporary package.

Service evaluations can test intentional HTTP rejection with an `exact` case containing `expectedStatus` (an integer from 400 to 499) and the exact JSON response in `expected`:

```json
{"id":"invalid","input":{"values":null},"expectedStatus":422,"expected":{"error":"values must be an array"}}
```

Both status and body must match in every trial. Include a corrected-input case to prove recovery, and document status/error vocabulary in the public invocation rules before freezing. The host records the observed `httpStatus` and applies the same response-size, JSON, timeout, package-integrity and credential-redaction checks as successful requests. Only input reaches the service. Unexpected success, wrong status/body, 5xx, redirects, malformed JSON and execution failures do not count as expected rejection. Cases without `expectedStatus` and health checks retain their success requirement.

This extension applies to direct service HTTP evaluation. CLI/browser process errors and architecture-neutral experiment plans cannot declare `expectedStatus`; they are rejected before freezing. Use ordinary JSON error results in those protocols, or application tests for process-exit behavior. An adapter without HTTP observation cannot satisfy a status-bearing case. Existing plans remain unchanged.

## Evaluator contract

```json
{
  "schemaVersion": 1,
  "evaluations": [{
    "id": "sum-cases",
    "capabilityId": "total",
    "description": "Independent ordinary, empty and correction examples",
    "dataset": {
      "name": "sum-reference",
      "version": "1",
      "provenance": "synthetic",
      "description": "Expected totals calculated from the specified rule before implementation"
    },
    "evaluator": "numeric",
    "threshold": 1,
    "trials": 1,
    "baseline": 0.5,
    "tolerance": 0,
    "cases": [
      {"id":"ordinary","input":{"values":[1,2]},"expected":{"total":3}},
      {"id":"empty","input":{"values":[]},"expected":{"total":0}},
      {"id":"correction","input":{"values":[1.5,-2,4]},"expected":{"total":3.5}}
    ]
  }]
}
```

Dataset `name`, `version` and `provenance` are required; `description` is optional. Provenance is `synthetic`, `supplied` or `reviewed`. It records a declaration rather than proving a human reviewed the data. Candidate processes receive inputs only. Expected values and scoring run in the host.

Every required evaluation needs at least two distinct inputs; reordering object keys does not count. Thresholds are in `(0,1]`. An optional baseline is in `[0,1]`, and the threshold must meet or exceed it. `trials` repeats every case and records per-case timing and scores. The `exact`, `numeric` and `schedule` evaluators require threshold `1`, with every case passing in every trial. Planning, execution and saved-report approval enforce this rule, so a constant answer matching only one reference case cannot pass by lowering the threshold. Classification and retrieval retain fractional aggregate thresholds with domain justification; aggregate accuracy cannot excuse a runtime error, malformed output or invalid citation/constraint result.

Existing deterministic plans with thresholds below `1` fail revalidation, and their saved reports cannot authorize delivery under the current gate. Frozen thresholds are never silently rewritten. Create a new plan and build with the required threshold to obtain current evidence.

| Evaluator | Output and expected value | Score / limits |
| --- | --- | --- |
| `exact` | Arbitrary finite JSON | Exact structural equality; object order ignored, array order significant |
| `numeric` | Matching JSON containing numbers | All shapes and nonnumeric values match; absolute numeric `tolerance`, default `0` |
| `classification` | Scalar string/finite number/boolean or nonempty array of those labels | Label accuracy; shape/length and label validity must match the contract |
| `schedule` | Expected `{status:"feasible"}` or `{status:"infeasible"}`; output `{status,assignments}` | Independent feasibility checks; infeasible compared to frozen answer key |
| `retrieval` | Expected `{ids:[...]}`; output `{results:[{id,source?,excerpt:{start,end,text}}]}` | Relevant-ID F1, plus mandatory exact source-span and permitted-document checks |

Schedule input is `{windows,people,requests}`. Windows are `{start,end}`. People are `{id,qualifications,windows,maxMinutes,restMinutes}`. Requests are `{id,duration,starts,people,resources,qualifications}`. Assignments are `{id,start,end,people,resources}`. All minute values must be nonnegative safe integers, with positive durations and window ends greater than starts. Before freezing either feasible or infeasible cases, the host validates these fields, unique string person/request IDs, string collections and references to known personnel. Invalid fixtures remain available for planning correction, with diagnostics identifying the case and field. The scorer applies the same validation before accepting any status, so malformed inputs cannot pass by returning `infeasible`. Empty availability or candidate starts remain valid inputs, and an empty workload may have an empty feasible assignment list.

The checker verifies coverage, durations, candidate starts, qualifications, availability, shared resources, personnel overlap, rest and duty limits. It does not measure a general optimization objective or prove infeasibility; infeasible results still rely on the frozen answer key. Search exhaustion cannot pass as infeasible.

Retrieval input contains `documents: [{id,text,source?,approved?}]` plus query/context. Excluded documents (`approved: false`) cannot appear. Each result's nonempty span must reproduce the exact input substring. If its document supplies a source locator, the result must include that exact string, including an empty string; if the document omits the locator, the result must omit it too. Invented, missing, changed or non-string locators fail the evaluation even when the aggregate relevance score meets its threshold. Locators and excerpt text are not trimmed or normalized. Empty expected IDs represent abstention. This checks evidence grounding and relevance against labels, not open-ended answer truth or semantic completeness.

Planning rejects retrieval fixtures with a missing document array, malformed or duplicate source documents, non-string locators, or expected IDs naming absent, explicitly excluded or empty-text documents. A required empty-text document cannot supply a nonempty citation, and object or array locators cannot match across the JSON runtime boundary. The same validation runs during scoring, including direct evaluation calls. Errors identify the case and field without including document values so the planner can correct its fixtures before contracts freeze and implementation starts. Empty document arrays with empty expected IDs, empty text on documents not named in expected IDs, omitted locators and empty-string locators remain valid. This checks fixture consistency; it does not establish that relevance labels are correct.

Classification rejects nulls, objects, nested arrays and other malformed labels before calculating accuracy. Any such output fails the evaluation even if other cases or trials meet its aggregate threshold. Valid but incorrect string, finite-number and boolean labels still receive ordinary accuracy scoring; fractional thresholds remain supported.

Bounds are 32 capabilities, 64 evaluations, 100 cases per evaluation, 10 trials per case and 1,000 total invocations. Finite JSON only: 20 levels deep, 20,000 nodes and 100,000 serialized UTF-8 bytes per input/expected value; 2,000,000 UTF-8 bytes for the plan. The host's file read limit for the evaluation plan is also 2 MB.

The full runtime output is scored before evidence retention or credential redaction. Retained JSON outputs are limited to 64 KiB per case and 8 MiB across the evaluation report. Outputs exceeding either budget are omitted with an explicit case detail; the score, timing, dataset and other provenance remain. Omission does not change a pass or failure. These retention limits prevent many repeated trials from producing an unbounded report, independently of the 2 MB execution-output limit.

## What passing establishes

Evidence includes the frozen contract hash, delivered-file hash, runtime version, declared environment names, datasets, thresholds, actual scores, per-case outputs/timing, required-capability status, developer-test output and browser evidence. A report must agree across those parts; a self-reported agent success message is insufficient.

Saved evaluation reports are checked again before review and delivery. Every evaluation must contain finite scores in `[0,1]`, a valid threshold and baseline, and exactly one observation for each recorded case in every declared trial. The recorded aggregate must equal the mean recomputed with the execution scorer's rounding; duplicate trials, missing observations and inconsistent summaries cannot authorize delivery. Valid fractional classification and retrieval scores remain supported, including individual cases below a perfect score. Comparisons use the frozen thresholds without an epsilon. Older reports whose aggregates disagree with this calculation need verification again; saved evidence is never silently rewritten. This checks retained evidence consistency, not the original answer keys or outputs, which may have been redacted or omitted.

Passing establishes behavior on the declared cases and a successful clean startup. It does not certify generality, production readiness, independent expert review or learned-model performance on representative data. Builder-authored fixtures can encode a mistaken objective even when perfectly executed. Training and preprocessing leakage, fairness, calibration, semantic generative quality, adversarial robustness and actual operational acceptance require independently reviewed evaluations appropriate to the domain. There is no automatic LLM judge or generic semantic-quality score in this implementation.

Browser checks and runtime checks independently enforce planned outcomes. The builder is instructed to use a shared implementation, but these checks cannot automatically prove structural identity between the UI and engine or correctness for unseen UI inputs. The disconnected-interface mutation verifies a concrete observable failure; it is not a blanket proof against all possible test-only duplicate logic.

The workflow fixture below checks idempotency and state transitions within a transcript. Cross-process persistence, restart recovery, synchronization and real external side effects need explicit scenarios and independent state inspection. An optimization implementation should supply objective-quality evidence in addition to the current feasibility scorer. A declared baseline is a reference score, not an automatically executed competing algorithm.

## Auditing the harness

Build first, then run the offline regression benchmark:

```sh
npm run build:electron
node scripts/benchmark-factory.mjs
```

To retain each candidate, answer key and actual report, use a new output directory:

```sh
node scripts/benchmark-factory.mjs --output /tmp/appyard-benchmark-run
```

The suite executes six working candidates and six deliberately broken candidates through actual contract loading/sealing, clean package preparation, host evaluators, developer tests and final quality gates:

| Scenario | Deliberate failure |
| --- | --- |
| Calculation | Hardcoded first-case answer |
| Scheduling | Double-booked personnel/resources and ignored rest |
| Classification | Constant majority-class predictions |
| Retrieval | Fabricated supporting excerpts |
| Stateful workflow | Lost state and repeated application of duplicate operations |
| Browser integration | Correct evaluated core behind a disconnected hardcoded UI |

Every candidate's weak smoke test passes intentionally. The independent checks must still reject each broken candidate. The report records correct acceptances, false rejections, broken rejections and false acceptances. The command exits nonzero on any false acceptance or false rejection. Tests in `tests/factory-benchmark.test.mjs` also verify that the disconnected UI passes core scoring yet fails browser acceptance. Chromium must be installed (`npm run setup:browser`) for the browser scenario.

This default suite measures evaluator and delivery-path regression behavior. It does not call a model or measure the factory's ability to generate new solutions.

## Opt-in generation benchmark

Run actual generation with a Pi provider/model that already has configured authentication:

```sh
node scripts/benchmark-factory.mjs --live --provider PROVIDER --model MODEL_ID --runs 1 --output /tmp/appyard-live-results
```

`--live` is mandatory for provider/model/repeat options. The script does not accept or print API keys. It uses the existing Pi model/auth configuration and creates a fresh Store and isolated workspaces. It generates all six briefs sequentially and waits for each full factory run to settle; `--runs` supports 1–10 repetitions per brief. Each generation has a single 30-minute deadline covering backend startup and execution. Expiry cancels preparation or active work, waits for cleanup before the next brief, and records a failed timeout even if completion delays the timer callback. Cleanup and the separate host-held evaluation can extend the recorded duration beyond that generation budget. Artifacts and reports are preserved. No delivery approval or deployment is performed.

Each fully graded result separates `generationDurationMs` from `gradingDurationMs`. Generation starts immediately before backend startup and ends after the full factory pipeline and any awaited timeout cleanup; it includes the pipeline's own verification and is not model-only latency. Grading covers repair-checkpoint lookup, independent core/browser holdouts and their runtime cleanup, source/host identity checks, and the final acceptance decision. The rounded components sum exactly to the existing per-result `durationMs`; grading does not consume or reset the generation deadline. Aggregate component durations sum only fully graded rows, including rejected and timed-out results. Aggregate `durationMs` remains total benchmark wall time, including setup, persistence, final cleanup and unfinished work, so it can exceed their sum. Running or failed reports exclude an unfinished generation from component sums, just as they exclude it from acceptance counts; never compare partial sums as complete-run timings. The report's `timingNote` retains these definitions. Older reports without the component fields remain unchanged and cannot establish generation-only timings.

Only the first synthetic example is attached as development data. After the generated application's own quality gate passes, the benchmark runs its declared runtime against the remaining independently authored cases retained by the benchmark host. The result distinguishes `pipelineAccepted`, `holdoutAccepted`, `browserHoldoutAccepted`, `requirementsMet`, `runtimeProfileMatched` and combined `accepted`. Success requires every applicable condition and completion within the generation deadline. All reported criteria must pass; a useful prototype with deferred requirements does not count as completing the benchmark task. The five CLI briefs require a CLI delivery. The browser brief requires a browser or service delivery with passing independent browser evidence; a correct CLI core alone cannot satisfy it. The parsed delivery profile must also match the verified package profile.

The browser brief discloses three `data-testid` attributes (`factory-input`, `factory-submit`, `factory-result`) and compact JSON result/error serialization. These provide a stable test interface without prescribing a visual layout. Host-authored browser inputs are kept outside the generated workspace: changed fractional, negative and empty inputs, plus valid → malformed → corrected input in one interaction. The same visible result region must replace prior success with an error, then replace the error with the corrected result. The host runs each journey at each viewport in its own fresh clean runtime, separate from the core evaluation. All copies must have the same runtime file hash. Planner-authored browser checks remain part of the normal pipeline, but cannot substitute for these independent checks.

Live reports use `schemaVersion: 7` and retain `expectedProfiles`, `deliveredProfile`, `browserHoldoutRequired`, `browserHoldoutAccepted`, `browserHoldoutEvidence` and `failureReasons`, alongside repair attempts, completed status and elapsed time. Browser acceptance is `null` for CLI tasks. Missing, incomplete or failed browser evidence blocks the browser task with `browser-holdout-not-passed`; the exact journey/viewport grid is required. A separate report saves the host plan, plan hash, runtime provenance, observations, screenshots and traces outside the generated app. The command exits nonzero if any generation is not accepted. These are small public behavior fixtures, not a secret production holdout or proof that the UI and evaluator share implementation code.

Pipeline verification and external core holdouts must have the same nonempty declared-file fingerprint; browser holdouts must also match the core fingerprint. Each result retains `pipelineFilesHash`, `holdoutFilesHash` and `runtimeFilesMatched`. Missing or differing pipeline/core fingerprints block acceptance with `runtime-files-mismatch`, even if both checks passed independently. This prevents combining tests of one source version with holdouts of a changed version. The fingerprint covers declared file names and contents, not every runtime setting or dependency installation. Schema 4 and earlier did not enforce pipeline/core file identity, so their acceptance counts are not directly comparable; existing reports are not rewritten.

Schema 7 also binds external holdouts to the pipeline report’s full verified source identity. Each result retains `pipelineSourceHash`, `holdoutSourceHashBefore`, `holdoutSourceHashAfter` and `sourceMatched`. The first holdout digest includes the exact `solution-contract.json` bytes used to select command arguments, entrypoints and service routes, even if that file is subsequently restored; the second checks the workspace after both core and browser holdouts. Missing, unreadable or changed identities block acceptance with `verified-source-mismatch`. This prevents passing file checks from masking a changed invocation contract. Existing source-hash exclusions for host reports and delivery notes remain; installed dependencies and external environment values are outside this identity. Earlier reports are retained and do not establish this stronger guarantee.

`repairAttempts` comes from the private host checkpoint, so log truncation or repair-like agent text cannot change it. It sums the persisted host reservations across the core, workflow and final-verification gates (up to three per gate), including an attempt interrupted before the repair completes. Reservations and active-time budgets survive ordinary resume; final verification has an independent repair allowance. The count excludes internal agent edits, artifact completion, planning revisions and visual iterations. Legacy checkpoints without the new gate state retain their original shared-slot count (`0` or `1`). Missing, invalid or mismatched checkpoint evidence produces `repairAttempts: null` and `repairEvidence: "unavailable"`; an accepted run then has `repaired: null`. The summary's `repaired` counts only accepted runs with a known repair, and `repairEvidenceMissing` counts all generations without usable repair evidence. Acceptance remains independent of this telemetry. Prior reports are not rewritten: schema 3's log-derived repair counts may undercount, whereas schemas 4 and later use checkpoint evidence. Comparing counts across policies requires the accompanying host manifest, because older builds allowed only the shared repair slot.

The aggregate `benchmark-report.json` is atomically replaced before setup, before each generation, and after every fully graded result. Schema 6 adds `status` (`running`, `completed` or `failed`), `plannedGenerations` and `activeGeneration` (scenario, trial and project ID, or `null`). `generations` and acceptance/repair counts include only fully graded results; an active generation is ungraded. A completed report means every planned generation was graded and backend cleanup and state persistence succeeded; it does not mean every application passed. A caught setup, execution or cleanup failure retains earlier results, marks the report failed and rejects the command with its report path and a generic diagnostic. Report-write failure stops further generation and preserves the last successfully replaced report. An abruptly terminated process may leave `running`; that is incomplete evidence, not a completed benchmark or a resumable run. Do not compare partial acceptance counts as if all planned trials finished. Existing per-project evidence remains separate, and prior reports are not rewritten.

Before starting model work, each live benchmark saves `benchmark-inputs.json` with the exact task briefs, development attachments, independent core evaluation plans, browser holdout plan and execution settings, including the generation deadline. Generation and core grading use an immutable copy captured at invocation, so changing exported fixtures during a run cannot alter its planned tasks or expected answers. Every aggregate report references this file through `benchmarkInputs.path` and the SHA-256 of its exact bytes, and records `generationTimeoutMs`. The manifest also has separate task, development and core-holdout digests per scenario; only development attachments enter generated projects. The host checks the saved manifest bytes before progress and completion; missing or changed evidence stops further generation and prevents completion. Keep the manifest with the report when comparing runs. Its identity excludes output paths, generated project IDs and timing measurements. It identifies benchmark inputs and configured execution settings, not the complete grader, installed dependencies, provider model revision or execution environment; equal inputs alone do not establish a controlled comparison. Older reports without this evidence remain unchanged.

Live reports also reference `benchmark-host.json` through `benchmarkHost.path` and the SHA-256 of its exact bytes. Before backend initialization, this manifest records the local artifacts observed when the benchmark module was imported: compiled host files, participating benchmark scripts, skills, templates, package declarations, repository and installed dependency locks, plus Node component versions, platform and architecture. Each file has a relative path, byte digest, size and permissions; output paths, timestamps and environment values are excluded. Progress and completion check the saved manifest and current artifact inventory against the original capture. Missing, added, deleted or changed artifacts, unavailable capture, or evidence-write failures stop further generation and prevent completion while retaining earlier results and the original identity. Compare individual file entries to distinguish intended agent changes from unintended grader changes; equal task hashes alone are insufficient. This is observed on-disk artifact identity, not proof of previously cached ESM bytes, transient changed-and-restored files, installed dependency contents, browser/Python binaries, environment values or provider model revisions. It does not establish a hermetic or statistically controlled comparison. Older reports remain unchanged.

Cost is reported as `null` because the backend does not expose trustworthy provider usage cost. Consult provider billing rather than interpreting missing telemetry as zero. This mode may consume paid model calls and runtime inference calls; it runs only when explicitly invoked. Automated tests exercise the benchmark loop with a stubbed model backend and known local engines; they never invoke configured model providers.

## Diagnosing a failed core

Open `.quality-evidence/core-report.json` in the saved build workspace. Each evaluation identifies its failing cases and actual output. Exact and numeric mismatch details include a bounded path to the first differing field or array element, without revealing expected values. Compare that path with the public invocation protocol. A correct calculation can still fail if response keys, status strings, error messages or array order violate the planned interface. Repair the shared implementation and test complete responses on new inputs; do not weaken the evaluator or frozen cases.

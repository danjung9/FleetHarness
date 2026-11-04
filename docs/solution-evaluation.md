# Computational solutions and evidence

New factory runs plan a callable computational core, freeze its acceptance criteria and evaluate the actual delivered runtime before finishing the application. The same path supports algorithms, optimization, prediction, retrieval, generation, workflows and stateful capabilities. Capability kinds describe the problem; they do not select an arbitrary generated grading script.

The sequence is:

1. Define the objective, mandatory capabilities, runtime, independent reference cases and thresholds during planning.
2. Validate and hash the contracts. Move evaluation answers outside the implementation workspace.
3. Build the core and execute host-owned evaluators against a clean package. Repair implementation within the run's repair budget.
4. Complete the interface using that core. Run computational checks, browser journeys and developer tests in separate fresh runtime instances, closing each before the next begins. Each instance must have the same declared-file hash.
5. Permit review only when mandatory capabilities and package evidence pass. Optional deferred requirements remain visible and prevent a claim of complete requirement coverage.

All contract objects reject unknown fields. Expected answers, thresholds, criteria and runtime declarations cannot be rewritten during repair. Evaluation answer keys are restored for the delivered source package after verification.

## Required files

- `solution-contract.json`: objective, required capabilities, runtime and file allowlist.
- `evaluation-plan.json`: versioned reference datasets, input/expected pairs and host evaluators.
- `acceptance-plan.json`, version 2: every canonical acceptance criterion mapped to capability and/or browser evidence.
- `ux-spec.json`, version 1: audience, user task, states, recovery and interaction design.

The exact authoring guide is exported as `solutionContractGuide` from `harness/solution-contract.ts` and copied into each workspace at `.fleet/solution-contract.md`. `harness/quality-contract.ts` defines the companion acceptance/UX schemas. A legacy version 1 quality report retains its legacy semantics; new runs require version 2 computational evidence.

## Minimal CLI contract

Replace `R1` with a canonical criterion ID from the challenge packet.

```json
{
  "schemaVersion": 1,
  "objective": "Sum supplied task durations",
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

Static browser profiles only support a Node evaluator and no required environment variables. They have no Python or credential-bearing inference runtime in the delivered browser. Use a service or CLI profile when the actual delivered engine requires Python, an inference API key or other runtime environment settings.

`files` is a complete deployment allowlist: source, imported modules, static assets, data and dependency manifests. Entry points and dependency manifests must be listed. Paths cannot be absolute, traverse directories, use symlinks or collide under case folding. Host contracts/answer keys, `inputs/manifest.json` host metadata, `.fleet`, `.git`, evidence directories, `.env*`, `node_modules` and `.venv` cannot be included. Ordinary supplied data files may be listed. Runtime dependencies are installed freshly. Developer test files are copied into their own clean runtime; helper modules and test data they import must be declared files. Host evaluations never receive these copied tests or their temporary state. Browser verification starts a fresh service/package after evaluation, so a successful inference or test setup cannot silently initialize a broken first-run user flow.

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

Every required evaluation needs at least two distinct inputs; reordering object keys does not count. Thresholds are in `(0,1]`. An optional baseline is in `[0,1]`, and the threshold must meet or exceed it. `trials` repeats every case and records per-case timing and scores. Use threshold `1` for deterministic correctness and constraint checks. Lower thresholds need domain justification; aggregate accuracy cannot excuse a runtime error or invalid citation/constraint result.

| Evaluator | Output and expected value | Score / limits |
| --- | --- | --- |
| `exact` | Arbitrary finite JSON | Exact structural equality; object order ignored, array order significant |
| `numeric` | Matching JSON containing numbers | All shapes and nonnumeric values match; absolute numeric `tolerance`, default `0` |
| `classification` | Scalar string/number/boolean or nonempty array of those labels | Label accuracy; output shape/length must match |
| `schedule` | Expected `{status:"feasible"}` or `{status:"infeasible"}`; output `{status,assignments}` | Independent feasibility checks; infeasible compared to frozen answer key |
| `retrieval` | Expected `{ids:[...]}`; output `{results:[{id,source?,excerpt:{start,end,text}}]}` | Relevant-ID F1, plus mandatory exact source-span and permitted-document checks |

Schedule input is `{windows,people,requests}`. Windows are `{start,end}`. People are `{id,qualifications,windows,maxMinutes,restMinutes}`. Requests are `{id,duration,starts,people,resources,qualifications}`. Assignments are `{id,start,end,people,resources}`. Minutes and candidate starts are explicit; the checker verifies coverage, durations, candidate starts, qualifications, availability, shared resources, personnel overlap, rest and duty limits. It does not measure a general optimization objective or prove infeasibility. Search exhaustion cannot pass as infeasible.

Retrieval input contains `documents: [{id,text,source?,approved?}]` plus query/context. Excluded documents (`approved: false`) cannot appear. Each result's span must reproduce the exact input substring; when a source locator is supplied, it must match. Empty expected IDs represent abstention. This checks evidence grounding and relevance against labels, not open-ended answer truth or semantic completeness.

Bounds are 32 capabilities, 64 evaluations, 100 cases per evaluation, 10 trials per case and 1,000 total invocations. Finite JSON only: 20 levels deep, 20,000 nodes and 100,000 serialized UTF-8 bytes per input/expected value; 2,000,000 UTF-8 bytes for the plan. The host's file read limit for the evaluation plan is also 2 MB.

The full runtime output is scored before evidence retention or credential redaction. Retained JSON outputs are limited to 64 KiB per case and 8 MiB across the evaluation report. Outputs exceeding either budget are omitted with an explicit case detail; the score, timing, dataset and other provenance remain. Omission does not change a pass or failure. These retention limits prevent many repeated trials from producing an unbounded report, independently of the 2 MB execution-output limit.

## What passing establishes

Evidence includes the frozen contract hash, delivered-file hash, runtime version, declared environment names, datasets, thresholds, actual scores, per-case outputs/timing, required-capability status, developer-test output and browser evidence. A report must agree across those parts; a self-reported agent success message is insufficient.

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

`--live` is mandatory for provider/model/repeat options. The script does not accept or print API keys. It uses the existing Pi model/auth configuration and creates a fresh Store and isolated workspaces. It generates all six briefs sequentially and waits for each full factory run to settle; `--runs` supports 1–10 repetitions per brief. Each generation has a 30-minute deadline and preserves its artifacts and reports. No delivery approval or deployment is performed.

Only the first synthetic example is attached as development data. After the generated application's own quality gate passes, the benchmark runs its declared runtime against the remaining independently authored cases retained by the benchmark host. The result distinguishes `pipelineAccepted`, `holdoutAccepted` and combined `accepted`; it also records requirement coverage, repair attempts, completed status and elapsed time. These are small public fixtures, not a secret production holdout. They still provide a check separate from the generated planner's answer keys.

Cost is reported as `null` because the backend does not expose trustworthy provider usage cost. Consult provider billing rather than interpreting missing telemetry as zero. This mode may consume paid model calls and runtime inference calls; it runs only when explicitly invoked. The implementation's automated tests never execute this live mode.

---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Small ranked pull requests for trusted evidence, controlled execution, simple officer intake and proven offline delivery."
---

# Architecture optimizations

## Bottom line

[R] Keep Electron, Pi, the existing catalog, skills, state store and preview boundary. [R] Spend the remaining time on one complete officer workflow with trusted acceptance examples, controlled execution, a stable delivery artifact and a simple first screen. [R] Make live generation conditional on proving its local access and Stop controls; an honestly labeled previously generated app is the fallback. [A] The effort ranges below are planning estimates for a teammate familiar with this code, including focused checks, not measured implementation times.

## Deadline and scoring

[P] The downselect is Thursday, November 5, 2026 at 2:00 PM EST. Judging weights are impact 30%, Speed to Fleet 20%, Fleet scalability 20%, barrier removal 15% and judges' discretion 15%, per [[Event/Judging]]. [P] Rules 4, 6 and 9 concern data boundaries, human authority and Fleet conditions; rules 5, 7 and 10 require tooling, prior-work and friction disclosure, per [[Event/Rules]].

[R] `must` means required for the proposed live-generation demonstration or its explicitly stated fallback. `should` means implement after the must proofs pass. `cut` means leave out of the Thursday scope. Each numbered change is one reviewable PR unless it explicitly identifies two independently reviewable slices. Proposed new paths below do not exist at the reviewed commit.

[E] Late version note: the clone advanced to `0f175a8` during final checking. It already adds phase-specific tool/skill selection, a shared settings component and another session adapter. [R] Reuse those changes, as mapped in [[Research/Architecture/Target-Architecture]], rather than reimplementing the filtering portion of change 8. The new five-session sequence needs fresh usage measurements; estimates here concern the proposed changes, not measured performance of either revision.

## Ranked changes

### 1. Must: make the acceptance examples belong to the team

- [R] Change: choose one recipe and record a small fixed set of normal, boundary and failure examples before generation. Add stable acceptance IDs and expected outputs. Store canonical checks outside the agent workspace. Keep agent tests as development feedback; do not let them alone authorize review/export.
- [R] Files: new `harness/acceptance/<recipe>.json`, new trusted `scripts/acceptance-browser.mjs`, `electron/verification.ts`, `electron/pi-backend.ts`, `shared/types.ts`, and focused `tests/verification.test.mjs` cases. Reuse the project's existing browser-test tooling rather than adopt an orchestration platform.
- [R] Small Thursday scope: a trusted driver loads the exact frozen index.html in a separate browser context, exercises actual controls and compares input/output/exported data against the external fixture. Never import candidate Node code into the process owning the verdict. Generated Node tests may run only in a separately proven execution boundary; otherwise retain them as unexecuted development artifacts.
- [A] Effort: 3 to 5 hours for one narrow workflow. Breakage risk: medium, because the release gate becomes stricter and the browser fixture needs an explicit app interaction contract. Browser runtime availability is not verified.
- [R] Helps rule 3's observable proof, rule 6's accountable approval, impact 30% and technical execution within discretion 15%.
- [R] Proof: a constant assertion, removed test, empty suite and deliberately broken UI all fail the mandatory external check; the correct app passes. Every required criterion is passed, failed or not run, with expected and actual values. Missing driver/browser blocks verification instead of counting as success.
- [R] Origin: independent evidence and durable work records from [[Research/Projects/SuperPlane/FleetHarness-Fit]]; contract/holdout design from [[Research/Build-Patterns/Specs-and-Acceptance-Tests]]. The existing Pi runner remains.

### 2. Must: export the exact verified snapshot

- [R] Change: after candidate generation settles, copy to a controller-owned staging snapshot and hash it. Run final acceptance on that snapshot. Bind approval to run ID, contract digest, snapshot digest and verification ID. Export from it, under a project lifecycle lock, and verify destination contents before setting delivered. Ignore only explicitly controller-generated metadata in content hashes.
- [R] Files: `electron/main.ts:40,78`, `electron/storage.ts`, `electron/pi-backend.ts`, `shared/types.ts`; extend `scripts/smoke-electron.mjs`. Add a small snapshot helper rather than restructure Store.
- [A] Effort: 1 to 2 hours. Breakage risk: low to medium, mainly path handling, cleanup after failed copies and interaction with new runs.
- [R] Helps rule 6, Speed to Fleet 20% and discretion 15% by making the approved package reproducible.
- [R] Proof: pause the destination dialog, change workspace source, and attempt a concurrent restart. Export must use the approved snapshot or fail clearly. Verify the delivered app's digest and included evidence. A partial copy never acquires delivered status.
- [R] Origin: exact-version authority from [[Research/Build-Patterns/Human-Review-UX]] and the explicit artifact-state distinction in [[Research/Projects/SuperPlane/FleetHarness-Fit]].

### 3. Must for live generation: remove arbitrary host execution from the narrow browser recipe

- [R] Change: add an explicit restricted browser mode. Replace built-in read/write/edit/bash with reviewed workspace file tools and selected pure domain tools. Reject absolute/escaping paths, symlinks, controller state, credentials, acceptance files and reserved metadata. Keep requirements and `.fleet` read-only. Let the controller execute the trusted acceptance driver. An agent may propose tests but cannot run arbitrary generated code on the host.
- [R] Files: new `electron/workspace-tools.ts`, `electron/pi-backend.ts:101`, `harness/pi-tools.ts`, `harness/planner.ts`, `tests/pi-sdk.test.mjs` and new boundary tests. Keep the existing backend behind an engineer-only mode pending isolation proof; do not expose unrestricted mode as an officer choice.
- [A] Effort: 3 to 4 hours. Breakage risk: medium to high. Existing model prompts expect bash and Node testing; adjust them and verify the exact Pi tool-selection contract. This is a restricted capability set, not a claim of general OS sandboxing.
- [R] Helps rules 4 and 6, barrier removal 15% and technical execution within discretion 15%.
- [R] Proof: use the actual SDK to attempt outside reads/writes, symlink escape, execution, network access via tools and canonical-test edits. Each must be unavailable or denied. The selected app must still build with file tools. Verify no built-in bash/read/write/edit remains accidentally enabled. Candidate code executes only in the constrained browser during trusted acceptance.
- [R] Fallback: if these checks cannot be made reliable, cut live arbitrary generation from the officer demonstration. Show a previously generated, separately tested synthetic app and identify that limitation. A disposable machine reduces exposure but does not alone make tests independent.
- [R] Origin: boundary separation from [[Research/Build-Patterns/Isolated-Execution]] and [[Research/Build-Patterns/Security]]. SWE-AF worktree ideas inform workspace organization only, per [[Research/Projects/SWE-AF/FleetHarness-Fit]]; a worktree is not the access control.

### 4. Must for live generation: give Stop a process it can terminate

- [R] Change: wrap the existing per-stage Pi session in a supervised child, retaining PiBackend as the state machine. Pass typed events and artifact/progress proposals to the controller. Revoke dispatch on Stop, terminate the child/process group and browser verification worker, wait for exit with escalation, then persist stopped. The UI must expose incomplete termination instead of clearing the run slot optimistically. Main must validate progress proposals before mutating Project.
- [R] Files: new `electron/pi-worker.ts`, a small worker transport module, `electron/agent-runner.ts`, `electron/pi-backend.ts`, `electron/main.ts:152`, `electron/verification.ts`, `tests/agent-runner.test.mjs`, `tests/pi-sdk.test.mjs`. First PR slice: worker transport and one successful stage; second slice: stop/quit/crash lifecycle tests. Do not build a distributed queue.
- [A] Effort: 3 to 5 hours across those two PRs. Breakage risk: high relative to the other changes because SDK initialization, credentials, session files and design tools cross a process boundary. Preserve existing event and stage contracts. Worker-process separation alone does not restrict filesystem access, so change 3 remains necessary.
- [R] Helps rule 6's monitoring, escalation and shutdown; discretion 15%.
- [R] Proof: stop during session startup, provider wait, tool action and verification. A synthetic descendant heartbeat ends, all tracked local workers exit, no new dispatch occurs and restart leaves the job stopped. Proposed thresholds: acknowledgment within one second and local termination within five seconds. Already submitted remote provider work is reported separately; it cannot be undone locally.
- [R] Fallback: use the same restricted demonstration fallback as change 3 if shutdown cannot be proven. Do not label SDK abort acknowledgment as process-termination proof.
- [R] Origin: bounded worker and reconciliation lessons from [[Research/Projects/Symphony/FleetHarness-Fit]], plus [[Research/Build-Patterns/Test-and-Repair-Loops]]. Borrow the lifecycle pattern, not Symphony's daemon or tracker dependencies.

### 5. Must: let the officer start with the task and approve examples

- [R] Change: use the team's chosen existing renderer. Technical setup preselects one authorized provider/model through the owner's own credential entry. First screen shows a task template and synthetic example, then input, expected output, exclusions and Start. Hide infrastructure choices under technical settings. If unavailable, say that setup needs the technical owner and preserve the brief. Add a short allowed-actions disclosure to both start paths and persist acceptance of the example contract.
- [R] Files: the chosen `src/App.tsx` or `src/studio/Studio.tsx`, shared intake/review helpers as needed, `electron/main.ts`, `shared/types.ts`. Do not redesign both interfaces or remove the existing engineering views.
- [A] Effort: 1 to 2 hours for one renderer and one template. Breakage risk: low to medium. A backend contract-approval check must accompany the UI flag.
- [R] Helps impact 30%, barrier removal 15%, discretion 15% and rule 6. These changes create a measurable usability hypothesis, not proof of saved labor.
- [R] Proof: a fresh officer profile shows zero provider, model or key choices on its first screen. A non-coder approves the synthetic behavior, detects one incorrect expected result, starts, stops and reviews without reading code. Technical setup is timed separately. The same backend rejects a start without the approved contract.
- [R] Origin: [[Research/Naval-User/Simplicity-Requirements]], [[Research/Build-Patterns/Human-Review-UX]], and the specification artifact idea in [[Research/Projects/Aperant/FleetHarness-Fit]]. Do not copy Aperant engine code.

### 6. Must: prove the exported app works disconnected

- [R] Change: constrain the chosen recipe to local assets and deterministic core behavior. Test the delivered package, not just the preview. Include a short offline demonstration and recovery procedure in its delivery evidence. Add an exportable data backup where browser storage is the only persistence. Keep connected software generation and disconnected application use as separate claims.
- [R] Files: `skills/fleet-delivery/SKILL.md`, `skills/fleet-offline/SKILL.md`, `harness/recipes.ts`, `electron/main.ts` delivery metadata and the change-1 browser acceptance driver. Generated application fixes belong to its own workspace, not the factory source.
- [A] Effort: 1 to 2 hours after change 1, for one supported browser and one workflow. Breakage risk: low to medium; file-origin behavior and save/reopen semantics can reveal application defects needing extra work.
- [R] Helps Speed to Fleet 20%, impact 30% and rule 9.
- [R] Proof: cold-open the exported index.html with all network interfaces disabled, use a fresh synthetic input, edit, validate, save, close/reopen and export; compare actual records. Record supported browser/version and functions not run. Include attempted-network evidence where available. Preview CSP alone is not offline proof.
- [R] Origin: [[Research/Build-Patterns/Offline-Local-Models]] and [[Research/Naval-User/Simplicity-Requirements]]. Local model installation is outside this change.

### 7. Should: record usage and enforce a whole-run budget

- [R] Change: add stage start/end time, session/prompt/turn counts, retry counts and provider-reported usage with an explicit unknown state when absent. Set one active run for the demo and a single elapsed-time limit covering setup, roles, tests and repair. Keep one repair attempt. Report input/output/cache tokens separately; never fabricate a dollar cost from missing pricing.
- [R] Files: `electron/agent-runner.ts`, `electron/pi-backend.ts`, `shared/types.ts`, and a small elapsed/progress display in the chosen renderer.
- [A] Effort: 1 to 2 hours. Breakage risk: low for recording; medium for deadline cancellation. SDK usage event fields require verification. An initial 20-minute run budget is a proposed policy, not a performance prediction.
- [R] Helps discretion 15%, barrier removal 15% and rule 6 monitoring.
- [R] Proof: a stalled run stops at the total limit, including repair; usage totals do not double-count retried events, and unavailable cost displays unknown. Record all attempted runs, not only the accepted one.
- [R] Origin: bounded work contract from [[Research/Projects/Symphony/FleetHarness-Fit]] and [[Research/Build-Patterns/Harness-Engineering]].

### 8. Should: route templates correctly and send only relevant context

- [R] Change: use catalog challenge 12 or 11 when the user actually selects that source; otherwise give custom templates a separate recipe field. Filter registered tools, fixture payloads and selected skills by recipe and stage. Remove the duplicated Studio JSON brief from model-facing text while retaining it for editing. Put compact structured handoff facts beside the existing documents so each session knows what to read.
- [R] Files: `shared/types.ts` starter/template data, `src/studio/brief.ts`, `harness/integration.ts`, `planner.ts`, `pi-tools.ts`, `electron/pi-backend.ts`, `tests/harness-integration.test.ts`.
- [A] Effort: 1 to 2 hours; split routing and context filtering if review becomes broad. Breakage risk: medium, because some existing sessions may rely on incidental tools or full packets. Disk packaging can retain modules for reproducibility without exposing every schema to each model.
- [R] Helps scalability 20%, barrier removal 15% and reusable execution within discretion 15%.
- [R] Proof: parser and scheduling templates receive the intended skills without invented source provenance; tool lists match the allowlist. Compare recorded input tokens and accepted results on the same fixture. Set no percentage savings claim until measured.
- [R] Origin: selected task context from [[Research/Projects/SWE-AF/FleetHarness-Fit]] and reuse records from [[Research/Projects/Aperant/FleetHarness-Fit]].

### 9. Should: make credential and run records explicit

- [R] Change: configure app-scoped Pi authentication/model paths if supported by the pinned SDK, keep credential setup outside officer flow, redact tool/error events before persistence and export only approved file classes. Add `runs/<runId>.json` with contract, model, timing, snapshot and terminal status; retain an interrupted reason and previous accepted artifact. A backup of last valid state and simple run index are sufficient before considering a database.
- [R] Files: `electron/main.ts`, `electron/pi-backend.ts`, `electron/storage.ts`, `docs/desktop.md`, targeted runtime tests. Split credential isolation/redaction and run history into separate PRs.
- [A] Effort: 2 to 4 hours total. Breakage risk: medium for migration from existing Pi configuration, low to medium for additive run records. Do not silently copy personal auth into event storage.
- [R] Helps rules 4, 5, 6, 7 and 10, barrier removal 15% and maintainable Fleet scalability 20%.
- [R] Proof: a synthetic canary never appears in activity or delivery; an interrupted run retains its identity and source references; corrupt state is preserved and a recovery path offered. Explicitly check SDK session logging, which may require separate redaction controls.
- [R] Origin: durable work-order records from [[Research/Projects/SuperPlane/FleetHarness-Fit]] and [[Research/Build-Patterns/Security]].

### 10. Cut: add orchestrators, model fleets or generic deployment before Thursday

- [R] Defer full SWE-AF, SuperPlane, Symphony or Aperant integration; a multi-agent coding DAG; local model downloads; a database migration; general framework/dev-server support; automatic deployment; and a second UI rewrite. Keep the current one-repair loop. Consider skipping a model verification role only after the external acceptance gate exists and recorded comparisons show no quality loss.
- [R] Files: none for Thursday. Later work belongs behind adapters and feature flags in `electron/pi-backend.ts`, `harness/recipes.ts` and separate execution modules, not a replacement of the whole application.
- [A] Effort: not responsibly estimable as one PR without a spike. Budget each later spike at 2 to 4 hours with a specific go/no-go proof; implementations can exceed the remaining event window. Breakage risk: high if undertaken now.
- [R] Helps preserve delivery time for impact 30% and Speed to Fleet 20%; document deferred gaps under rules 10 and 11.
- [R] Proof for reconsideration: same task/fixtures, demonstrated access boundaries, shutdown and acceptance, measured total time/cost, and one clean offline app delivery. Feature lists alone do not satisfy this proof.

## Sequencing and feasibility

[A] Changes 1 through 6 total roughly 12 to 20 engineering hours, excluding unforeseen SDK/browser integration failures. Changes 1, 3 and 4 carry most uncertainty; this estimate is not a commitment that one person can finish every item before the deadline. [R] Reserve the last 3 to 4 hours for integration, a disconnected rehearsal and submission. Stop speculative integration at that buffer. Use the explicit fallback if live-generation controls are not ready.

[R] Merge acceptance fixtures and snapshot export first. Then integrate restricted tools and supervised termination as separately reviewed changes before claiming the live worker is controlled. Add the officer flow and offline proof to the chosen renderer. Usage and context improvements follow only if the evidence still passes. No parallel-agent implementation run is proposed or performed here.

## Sources

- [E] Baseline implementation: https://github.com/danjung9/FleetHarness/tree/f72c5dc15aa6c34d2b9080c1c0b87742230cc16e (private reference, not fetched).
- [E] Borrowed patterns were read in the linked team fit notes, not independently re-audited upstream in this seat. Their pinned references: SWE-AF https://github.com/Agent-Field/SWE-AF/tree/ef26ffbf61496387d7ba554e83799cb5385804d0 ; SuperPlane https://github.com/superplanehq/superplane/tree/7d755d16b8ae836ecebf61639efc6266d74a4b0b ; Symphony https://github.com/openai/symphony/tree/be10a1b79df723d6d7612b5651c8522704dafb2e ; Aperant https://github.com/AndyMik90/Aperant/tree/20250db069a849ab001ac6ab9e3e9779886ab9e2 .
- [P] [[Event/Judging]], [[Event/Rules]], [[Research/00-Brief]].
- [E] Supporting team notes: [[Research/Build-Patterns/Harness-Engineering]], [[Research/Build-Patterns/Specs-and-Acceptance-Tests]], [[Research/Build-Patterns/Isolated-Execution]], [[Research/Build-Patterns/Test-and-Repair-Loops]], [[Research/Build-Patterns/Human-Review-UX]], [[Research/Build-Patterns/Offline-Local-Models]], [[Research/Build-Patterns/Security]].

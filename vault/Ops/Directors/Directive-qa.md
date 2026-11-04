---
type: directive
status: active
owner: mukul
updated: 2026-11-04
summary: "Retire redundant audits, finish existing judgments and adapt exact-revision runtime evidence to the new frontend."
---

# QA instructions

[P, current direction] [[Research/Agentic/Flow-Goals]] and [[Ops/Directors/Memo-overseer]] govern: ten satisfactory catalog-card builds, without human help during generation. [[Research/Plan/Review]] supersedes the older Plan/Findings where identified; the ten-build order supersedes their one-app allocation. Keep Thursday November 5 noon code freeze and the 2 PM EST submission deadline. This directive replaces the previous QA allocation.

## Decisions and current evidence

[E, meeting 118 reads] [[Research/QA/Ten/Scoreboard]] has ten finished, nine automatic passes, nine negative judgments and zero satisfactory. Baseline ID 36 failed verification. [[Research/QA/Ten/Exp1/Scoreboard]] has four of five finished, four automatic passes and zero satisfactory. IDs 12, 11 and 36 are NOT; ID 8 is pending. The experiment uses 1d9eeee plus disclosed scratch changes, not unmodified shipped code.

[R] Main owns scoreboard refresh and routes each distinct failure once. Keep rounds, artifacts and patches separate. R101 artifacts are under Research/QA/Ten/Exp1/R101; scoreboard links omitting Exp1 do not identify an absent build. Use the actual existing directory, record the correction and preserve the historical receipt.

[E, feed-118 at 16:38:47] The earlier ID 32 runner assignment was held by the queue. [E, [[Research/QA/Ten/QA-Lead-Notes]]] Main now covers all ten baseline artifacts, including ID 32. [R] Retire the held ID 32 task and completed historical crosswalk tasks. Do not claim they ran. Replace only unstarted duplicate work; retain any useful already-running work until its owner hands off. The proposed ID 36 technical audit is also withdrawn: its officer judgment arrived during the meeting and already resolves its main evidence questions. The task JSON is intentionally empty. No new seat turn is justified by these completed reviews.

## qa-officer

[R] Continue the existing automatic judgment queue, including R101 ID 8 and any remaining unique experiment result. R101 ID 36 is complete. No new director task duplicates it. Coalesce repeated round/challenge/artifact entries. Finish one judgment per artifact, then idle until new evidence arrives. Do not spend turns rewording completed negatives or polling status.

[R] Read the original card and narrative before the reduced plan. A positive verdict requires autonomous review, meaningful tests, all planned browser journeys, identified offline-open evidence and independently satisfactory task behavior. A decisive missing primary outcome supports NOT without another browser run. Missing receipts alone mean incomplete evidence, not an observed software failure. Keep human acceptance and unaided Sailor usability separate.

[E, [[Research/QA/Officer/JUDGE-R101-id12-optask]]] The parser still replaces the requested format. [E, [[Research/QA/Officer/JUDGE-R101-id11-training]]] Preset alternatives cannot supply the available qualified substitute; first-feasible search does not establish optimization despite requirementsMet true. [R] Return these to the existing factory repair, retaining both rounds. Genuine missing authority remains incomplete; never invent a format, operational rule, model or approval to make a card pass.

## qa-runner

[R] Idle after the completed d0f4c69 crosswalk. Retire the unstarted R1 ID 32 task. Do not dispatch the proposed R101 ID 36 audit: [[Research/QA/Officer/JUDGE-R101-id36-paperless]] already records simulated extraction/delivery, missing backup restore, fragment-only download assertions and the final receipt superseding stale guide language. Main's baseline audit already isolates the original native option defect.

[R] No periodic status turn, new source sweep or historical receipt reconstruction. Resume only for a distinct assigned evidence gap after checking current main/officer coverage. Main's existing Auto/runtime work covers the new teammate revision below; no parallel browser owner or implementation task is added. Never execute candidate code, archived scripts or repository programs under a read-only assignment. Keep officer judgment, technical evidence and human acceptance distinct.

## Main QA lead coverage and existing owners

| Evidence and owner [E] | Next proof or decision [R] |
| --- | --- |
| Main's all-ten baseline source/test audit and independent officer judgments | Baseline coverage is complete at the reported scope. Prioritize experiment failures and exact current outputs, not another ten-artifact audit. Main retains benchmark execution and failure routing. |
| Main's coordinator statement in QA-Lead-Notes | Exact output and first-open now use frozen copies outside normalized vault prose. STOP/3.5-hour driver cancellation is reported for round two onward. Do not carry the old round-one watcher defect forward as if unchanged; implementation claims still need matching execution evidence. Preserve round-one identity limits. |
| Main and Engineering, Ten-Benchmark-Audit | At c6ce52d, the temporary verifier replacement no longer matches and was silently skipped in the inspected preparation path. Require an integrated mandatory verifier or a verified compatible preparation patch that fails closed before using that head. Preserve process markers. This is not evidence an unsafe run occurred. |
| Main runtime, detached-Stop runbook | Historical detached Pi work continued after Stop. c6ce52d and 27 reviewed focused checks do not close native discovery. Require owned identity, stopped heartbeats/processes, no later work and a verdict before separate cleanup on the landed revision. Other engine/packaging paths remain separate. |
| Engineering and assigned reviewers, Review-Queue-Notes/feed-118 | e93a877 has 49 passing recovery checks, including the prior late-write/Resume regressions. Remaining hold is combined sandbox/test-evidence integration, not those old defects unchanged. Dev-1 keeps integration; dev-3's verifier stays separate from smoke changes. Require one bounded generated-test execution and trustworthy registered cases. |
| Existing dev-2/builder review returns | Prove real Start/Resume preflight and Stop after readiness entry. Fix delayed usage attribution by turn ID and terminal persistence despite report-write failure; retain failed-attempt metrics on resume. No duplicate QA implementation. |
| Main Auto and Engineering smoke owner, Auto/c6ce52d | Latest receipt reports 125 unit/51 harness passes and eight of ten smokes passing. Electron waits for the stale catalog-count label; Norfolk waits for removed Build flow. Preserve downstream assertions and Dan's new journey, then rerun at the combined revision. These tests do not establish native Stop or live inference. |
| Separate acceptance-tooling owner and main | Keep Acceptance/** exclusive. Reuse Review-Candidates and Review-Run2, preserving the frozen key, corrected CLI import and form limitations. Curated candidate acceptance is distinct from catalog completion and exact-byte human approval. |

[R] Runtime receipts need exact commit/patch/build identity, command, environment, named cases, counts and retained failure/output evidence. No blanket environmental pass. The prior crosswalk's request for missing retained receipts stands once; do not rebuild historical revisions merely to fill a table.

## Team answers and teammate changes

[E, feed-118] Neither QA seat submitted a literal QUESTIONS line. [R] Officer: use the corrected experiment path and independently assess behavior even when all criteria are labeled implemented. Runner: the crosswalk is done and the held ID 32 task is superseded and the proposed ID 36 audit is withdrawn. Missing runtime execution belongs to main. No duplicate queue entry is needed.

[R] Engineering/Agentic: retain dev-5 as primary-task correction owner; the older proposed builder allocation and native-select dispatch are superseded by the current engineering memo. Require narrative coverage, requested-format examples and independently chosen changed inputs. Do not relax tests, rewrite the key or hand-edit generated outputs to create success. Hosted scope filtering must not weaken the catalog measure.

[E, relays at meeting 118] deployment-infra f579651/c1fb845 adds bounded Sandbox waiting, final-progress reread and requested-demo verification across five non-frontend files. The smoke may proceed to scripted approval/export while supplemental criteria remain deferred and requirementsMet is false. Integration into mvp is unverified. [R] Preserve this teammate change and report requested-demo success separately. Main/Engineering owns any authorized integrated checks of delayed exit, final-write races and transport failure. No hosted execution, credentials, sharing or deployment is allocated here.

[R] Protect Dan's current 7a4c6cc frontend, src/, studio/, index.html and CSS. The supplied 1d9eeee remains the experiment's base, not current mvp. Preserve Windows 4c49e85 intended-step failures and functional allowances, plus 0aa19c1's built-in .NET ZIP extraction change. Windows execution remains unverified. Findings for Dan use the existing For-Dan owner, never a message.

[E, closing relay and selected patch sections] mvp advanced to 7a4c6cc. Settings replaces Model settings; Developer mode defaults off, gates Design navigation/diagrams and persists in desktop/browser state. Architecture generation and verification remain required. Main/preload/storage/types add the API contract, boolean validation, save-failure rollback and provider-save preservation. Five existing smoke scripts change.

[R] Engineering retains serial integration: dev-1's electron/main.ts, electron/preload.cts, electron/storage.ts and shared/types.ts overlap; builder's shared/types.ts follows file release. Preserve both runtime fixes and the new handler/defaults; update required FleetAPI implementations/mocks without reverting Dan. This is an existing-owner integration requirement, not another allocation.

[R] Main's next Auto run must identify the exact integrated commit and preserve the revised five smokes. Obtain default-off and old-settings migration, desktop/browser reload, provider-save preservation, toggle-during-build with model lock, Design-to-Build fallback, stale-design clearing, and failed-save rollback evidence. Missing cases stay explicitly unverified. Carry forward the separate catalog-count and Norfolk-heading failures until full downstream reruns pass. The c6ce52d receipt cannot establish any new 7a4c6cc behavior. Engineering's existing documentation owner should correct docs/system-design.md's unconditional diagram statement to reflect Developer mode. Do not add a frontend control or restyle.

[E, final relay reread] LATEST.md now records Windows 98b8334 merging hosted work across 65 files; LATEST-analysis.md still covers 7a4c6cc/0aa19c1. Treat these as different branch updates. The new relay reports electron/pi-backend.ts and shared/types.ts overlap with dev-1, dev-2 and builder. [R] Keep those existing writers serialized through Engineering, preserve hosted/desktop contracts and require exact merged-source review. No full 65-file review, merge result on mvp, Windows runtime or hosted deployment is established here. Do not turn the larger relay into a new QA sweep ahead of unfinished catalog judgments.

[R] RandE's trial protocol, evidence card and Fleet-Ready mapping remain references. Research/connector proposals and older interface instructions are not new allocations. No measured Sailor benefit or synchronization claim without evidence. Human acceptance, category/form decisions and submission approval stay on Product's morning list.

[R] Use synthetic/public data only. Keep contract, execution, artifact and submission approval points explicit. Monitor failures, changed bytes, usage and owned processes. On prohibited data, lost traceability or failed shutdown, stop and escalate through main's existing operator procedure; verify cleanup separately. No real-person assignment, official writes or outward actions. Write only in the seat folder, maintain .tmp/JOURNAL.md and stage central disclosure/session/status handoffs locally without invoking denied tools.

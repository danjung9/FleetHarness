---
type: directive
status: active
owner: mukul
updated: 2026-11-04
summary: "Close current review defects with exclusive file ownership and exact integrated runtime evidence."
---

# Development instructions

## Current decision

[P] [[Research/Agentic/Flow-Goals]] governs allocation. This directive replaces the previous one. [E, snapshot-158 at 17:25:48] Code seats are enabled; dev-1, dev-2, dev-4, dev-5 and agentic-architect are running. Builder is absent from both running and queued lists. The feed repeatedly records unresolved merges. [R] Preserve current overseer assignments and coalesce repeated returns rather than dispatching equivalent work again.

[E, current QA] [[Research/QA/Ten/Scoreboard]] now describes round 3 at f662d81 plus disclosed scratch patches: three finished, zero automatic passes, all stopped at review because cleanup could not be confirmed. [[Research/QA/Ten/Exp1/Scoreboard]] has five automatic passes; the five officer judgments, including [[Research/QA/Officer/JUDGE-R101-id20-contact-brief]], establish zero satisfactory. Its pending ID 20 cell is stale. Historical round-one results are not the current board.

[R] The task JSON contains one continuation of builder's existing df9ff1d review return, limited to electron/agent-runner.ts and tests/agent-runner.test.mjs. Runner checks current locks and coalesces any equivalent return before dispatch. No other seat receives new work from this meeting.

## Owners, review returns and completion evidence

| Owner | Current instruction and testable closure |
| --- | --- |
| dev-1 | Retain recovery and mandatory verifier integration. Review e6b5000 independently passes 65 focused and 35 verifier checks but returns a real hash compatibility defect. Coordinate through main with the existing hosted owner: desktop sourceHash, worker bundleSourceHash and server hashSourceFiles must agree on the same artifact. Reproduce the six-file false checkpoint rejection first, then prove unchanged collection/restore succeeds, changed bytes and stale approvals fail, and export ambiguity/race regressions remain. Preserve cleanup wrappers and current fixtures. Submit the exact combined revision, including required platform and legacy-checkpoint handling, for review. |
| dev-2 | Close all three 85df897 returns. Start refusal and Stop must stay within the stated two-second bound even with slow or never-settling persistence, with zero model work and no stale save overwriting newer state. Mutating a message passed through an existing fail(message) helper must fail the error inventory test. Connected account plus empty saved selection must reach the advertised default through the real entry flow, preserving explicit selection and confirmation. Backend-only fixtures and a separate Settings save do not prove that condition. |
| dev-3 | 0da7ce9 already contains the Electron/Home smoke changes. Do not reapply them. Supply the verifier reapplication and process-ownership regression to dev-1 as integration input, then retire the duplicate verifier branch once equivalent behavior is present. Its reported 29 focused passes do not erase three additional full-gate failures. Resolve those with explicit trusted fixture injection where appropriate or matching host receipts; never expand the baseline or disable production containment to pass. |
| dev-4 | Finish the existing independent-judge assignment, not another judge implementation. Local journal reports 17 focused passes and a 206/20 gate, still awaiting independent exact-commit review. Keep the judge read-only, source-bound, fresh per attempt and unable to approve delivery. Reconcile its at-most-two repairs with dev-1's persisted budget so nested loops cannot multiply repairs or reset limits on resume. Main obtains one real judge/repair receipt after integration. |
| dev-5 | Close 84bc6b6's concrete smoke return first: derive the reopen selector from the created title or stable project identity. A create/save/reload regression must fail on the old selector and reach unchanged persistence, approval and export assertions after the fix. Preserve fc97f36's synthetic fixtures and 0da7ce9's catalog selector. Then continue the existing canonical source-coverage correction under Directive-agentic, with one reviewed implementation. |
| agentic-builder | Continue df9ff1d's interrupted-usage correction in the two JSON-listed files. Before terminal metrics are captured, a follow-up with no receipt must make the aggregate unknown on both Stop and timeout. Preserve measured current-turn usage, event-order checks, terminal persistence despite report-write failure and all existing note/effort coverage. Require saved project/report assertions as well as callback values. Do not reapply a second verifier or competing primary-task schema. |

[R] dev-2 resolves defaults in the existing backend/settings contract where possible. Dan retains src/, studio/, index.html and CSS. If the actual entry flow still requires a frontend change, document the smallest required control behavior for main and [[Research/QA/For-Dan]]; no frontend file is allocated here. Preserve consent, explicit choices, Settings persistence, default-off Developer mode, active-build locks and rollback.

## Exclusive ownership and integration

[R] The runner's actual locks and newer explicit overseer assignments control dispatch. This table specifies serial handoffs, not concurrent permission:

| File group | Current integration owner | Later consumers, only after release |
| --- | --- | --- |
| electron/pi-backend.ts, shared/types.ts, tests/pi-backend.test.mjs, tests/pi-sdk.test.mjs | dev-1 | dev-2 preflight, dev-4 judge call site, dev-5 fixtures and builder telemetry, one at a time |
| electron/verification.ts, electron/quality.ts, tests/verification.test.mjs, tests/runtime.test.mjs | dev-1 | dev-3 supplies existing delta; dev-5 source coverage later; builder reuses integrated executor |
| electron/storage.ts and tests/source-export.test.mjs | dev-1 | Main coordinates existing hosted owner without assigning that owner's files to a second seat |
| electron/codex-rpc.ts, electron/codex-session.ts, tests/codex.test.mjs | dev-2 | Builder telemetry and dev-4 judge compatibility, serially |
| scripts/quality-fixture.mjs, remaining smoke callers, tests/smoke-fixture-contract.test.mjs | dev-5 | No second smoke writer; preserve landed dev-3 changes |
| harness/quality-contract.ts, shared/quality.ts, tests/harness-quality.test.ts and primary-task skill wording | dev-5 | Builder contributes retained evidence, without another schema or overlapping edit |
| electron/agent-runner.ts, tests/agent-runner.test.mjs | agentic-builder | Sole new dispatch, only the interrupted-usage return |
| electron/independent-judge.ts, tests/independent-judge.test.mjs, skills/fleet-judge/SKILL.md | dev-4 | Shared call-site and fixture edits wait for the above transfers |

[R] Finish dev-1's combined prerequisite and hash coordination first. Integrate preflight, judge, canonical coverage and telemetry through explicit shared-file transfers, reviewing each resolved tree. Nonoverlapping correction files may progress now. Preserve saved conflicting diffs and valid tests; stop repeated blind merge/reapply attempts. A pending review gets no unrelated assignment. No seat may claim success by testing an older isolated parent while reporting the integrated revision.

## Runtime evidence and immediate escalation

[R] Main owns the round-three cleanup investigation and the existing native Stop rerun. Distinguish denied inspection, matching surviving processes and deadline exhaustion using exact revision/patch identities and redacted owned-process evidence. The current error establishes unconfirmed cleanup, not proof of a survivor or permission to ignore it. Follow the existing operator shutdown procedure before starting another run in an affected workspace. Route any proved process-sweep defect to its existing owner after current work and file handoff; do not create a competing cleanup implementation.

[R] Keep the measured d0f4c69 detached-child failure open until the corrected native case passes: advancing heartbeat before Stop, stable heartbeat and matching PIDs absent afterward, unrelated process survives, terminal state agrees, verdict recorded before separate cleanup. Pi, Codex, Windows and Quit are separate claims. Injected process discovery does not close them.

[R] Main obtains containment and affected browser smoke receipts on the exact landed tree. Allowed workspace/tool use must succeed, outside access and network must fail, and launcher refusal must never fall back to direct generated-test execution. Auto/f662d81 still records smoke-electron and smoke-norfolk failures; later source fixes require their own runtime receipt. Hosted requested-demo checks do not replace catalog acceptance.

[E, opening relay comparison] LATEST.md names mvp 0da7ce9; LATEST-analysis.md names Windows 5a9d7d1. Its native-path checkpoint fix is relevant to the hash return but is not proof of desktop, server or cross-platform compatibility. [R] Preserve native ordering, portable manifest paths, junction protections and export hardening together. Do not bypass a mismatch or silently reuse old approvals.


## Closing teammate change: e27ad6a

[E, closing relays and targeted patch inspection] Dan's dan/backend-improvements branch adds Data & inputs, host-protected attached data and a conditional synthetic-data session after intake. e27ad6a adds version 2 capability mappings. This is separate from mvp 0da7ce9. The relay comparison includes branch divergence: apparent deletion of process-sweep and its tests is not evidence that Dan deliberately removed them. Integrate his commits onto the current base; do not replace the newer tree with the older branch.

[E, relay source review] shared/solution.ts is reported missing from the committed tree. The patch imports its SolutionContract, rejects a version 2 plan without that contract and permits capability-only evidence. The relay reports that electron/quality.ts still omits the contract and emits version 1 reports. No successful compile or runtime receipt was supplied.

[R] Keep the existing owner split. Main coordinates Dan's committed dependency and integration; dev-5 owns the single quality-contract/shared-quality reconciliation, with electron/quality.ts transferred from dev-1 only after prerequisite integration. Do not invent a competing solution schema or discard either capability mappings or original source obligations. Closure requires both type checks, actual load/validate/freeze/hash/evaluate/report wiring, retained version 1 behavior, missing or stale capability evidence rejection and no pass when required browser journeys or required capabilities are omitted. A capability ID or a zero-journey plan alone is not execution proof.

[R] Dev-1 preserves prepared-input hashes across recovery and rejects changed inputs on resume. Dev-2 adapts Start/default readiness to Dan's current App.tsx without overwriting it. Dev-4's judge reads prepared-data provenance and original obligations. Dev-5 retains the mock-provider's conditional data-session protocol and updates fixture session counts without weakening assertions. Builder's inherited note/effort changes must preserve the extra session and measure its actual work after shared-file transfer. The sole two-file telemetry correction does not overlap Dan's listed changes.

[R] Main/QA prove attachment and paste persistence, removal, input limits, links-only fallback, invalid synthetic-data rejection, completion retry, tamper refusal and cancellation on both engines. Preserve Dan's five frontend files, existing process markers and sweep tests, mandatory verifier, deferral constraints and approval invalidation. Only public/synthetic inputs are permitted; attached text remains data, not instructions. This is local input support, not connector authorization. Report any unresolved contract dependency through main; do not message Dan or claim integration from patch inspection.

## Finish and boundaries

[R] Use synthetic/public data only. Keep human build consent and final-byte review, prohibited external actions, progress/time/usage monitoring, escalation and shutdown. No credentials, generated-app hand edits, new connectors, deployment, messages, pushes or publication are authorized. No new full benchmark follows from this directive; main controls the current run and next bounded experiment. Thursday noon is the scope freeze; acceptance names one commit and final artifact manifest.

[R] Report exact revision, files, every done condition, failing-first command, passing evidence and unverified runtime cases. Keep each seat's outcome, verification and next action in its journal. Central logs require authorized transfer where the sandbox limits writes. Feed-158 has no literal QUESTIONS line; the owner rows answer its actionable review requests and blockers.

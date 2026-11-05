---
type: research
status: complete
owner: mukul
updated: 2026-11-05
summary: "R7 ID 08 stopped before the advisory audit; sequential mapping diagnostics are confirmed, but absent original contracts prevent proof that both faults coexisted before completion."
---

# R7 plan completion

[E] ID 08 exhausted its one structural completion attempt before the advisory planning audit. The host first rejected a missing reciprocal capability mapping, then rejected the unmapped `new-user-report` journey. The retained contracts confirm the second fault and the repaired capability links. **Whether both faults coexisted before the completion attempt is not verified: pre-repair contract bytes are absent from the inspected evidence.** [R] Make one generic correction: collect independent mapping diagnostics together before issuing the existing completion prompt, while preserving strict rejection and the attempt ceiling. This is a proposed regression design, not an implemented or reproduced improvement.

## Evidence identity and limits

[E] Read [Round-7.md](../QA/Ten/Round-7.md), ID 08's retained final/tail, contracts and manifest, and pinned source through local Git. R7 records baseline `4a57562ea232c08bbfda21f638f65d6b7cce5793` plus scratch changes described in `codex-rpc.ts` and `codex-session.ts`. Current `mvp` resolved to `ed9089479ab380f0a33009065cca0148e41cf612` at both source checks. This does not identify R7 as a clean run of either commit; the running compiled files and scratch patch were not independently hashed here.

[E] The two JSON contracts match their entries in ID 08's retained `MANIFEST.json`, measured with Python standard-library SHA-256. The manifest describes final output, not a snapshot before completion. Its warning about normalized Markdown does not affect these matching JSON files.

| Retained file | SHA-256 measured in this review |
| --- | --- |
| `acceptance-plan.json` | `ce8c6d0707faea963e819ee54cb07944ab2f16aa2554602ddc2558d7870a13a9` |
| `solution-contract.json` | `f9e237fb23d7086299773b426159bb45a4aa8c4c008ad3b27935b8ca84dd26f7` |
| `log-tail.txt` | `5f5a823fe0bef0b71d261e4f88745427129214d8a83651ab8048d46d17ca2b5f` |
| `final.json` | `c3fb50dedb7299155ac1fbe7b250280fc7f83d1bd1d8bce128d7aea68d57e339` |

[E] The tail and final receipt are not entries in that manifest; their hashes identify the copies inspected here, without claiming independent runtime provenance. Hidden-file inventory of the supplied ID 08 folder and searches of the supplied reports found no pre-completion acceptance/solution pair, full planning session or before/after write diff. The tail truncates the planning and repair commands. The external frozen/workspace paths mentioned in the receipts were not accessed. Missing historical bytes remain missing, rather than being reconstructed from the final files.

## What the sequence establishes

[E] All references in this table are to the retained [ID 08 tail](../QA/Ten/R7/id08-casrep/log-tail.txt), with final-state checks against its [acceptance plan](../QA/Ten/R7/id08-casrep/acceptance-plan.json) and [solution contract](../QA/Ten/R7/id08-casrep/solution-contract.json).

| Order | Observation | Evidentiary limit |
| --- | --- | --- |
| Before the host rejection, tail lines 31 and 41 | Tool output lists seven journeys, including `new-user-report` with 12 steps. | Proves the journey existed then. It does not show whether any criterion referenced it. |
| First host rejection, line 54 | `criteria[4]` references `review-route`, whose reciprocal criterion list omits that criterion. The host starts one completion attempt. | The retained final criterion at index 4 is `DELIVERABLE8-1`; the following mapping check also names it. No full original array is retained. |
| Completion inspection, lines 58 to 60 | The logged check reports `SCOPE8-4` missing from `casrep-format`; `DELIVERABLE8-1`, `SCOPE8-4` and `SCOPE8-6` missing from `review-route`; no missing links for `revision-lineage`. | This is pre-fix diagnostic output within the completion response, not a full pre-attempt contract snapshot. |
| Completion response, lines 63 to 68 | The response claims four links fixed and seven journeys retained. The visible command reads several planning files, but its write operations are truncated. | A statement that only the solution contract was fixed does not prove every acceptance-plan byte stayed unchanged. The response's structural PASS is not a host validation result. |
| Second host rejection, line 69 | The host identifies `new-user-report` as unmapped and refuses after the one completion attempt. | Establishes the fault after completion. It cannot establish when the reference went missing. |
| Final files and receipt | All final criterion-to-capability references have reciprocal links; all three required capabilities also map back to implemented criteria. Of seven journeys, only `new-user-report` is unreferenced. Plan failed; build, verify, review and delivery remain queued; `report` is null. | No completed app, host verification or human acceptance follows from these files. |

[E] A read-only JSON inventory found 17 criteria. Implemented criteria's `journeyIds` plus the deferred criterion's `syntheticCoverage.journeyIds` reference six distinct journeys. The only deferred criterion, `DESC8-2`, names `synthetic-primary` in synthetic coverage. None references `new-user-report`, which is declared at acceptance-plan line 473. Its final 12 steps cover edited report fields, submission, literal output and reload recovery. Mentioning it in prose or declaring it in the journey list does not satisfy the host's criterion mapping rule.

[A] Both faults may have existed together originally: the journey predates completion, and the response reports capability-only repairs. An alternative remains possible: completion changed or removed a journey reference while retaining the journey and counts. The truncated commands and absent original bytes cannot distinguish those histories. **Sequential rejection is established; simultaneous pre-attempt faults and a guaranteed rescue by combined diagnostics are not.**

## Validator trace in both revisions

[E] `git rev-parse <revision>:<path>` returned identical blob IDs at `4a57562` and `ed90894` for all six files below. Thus these source locations and behavior are unchanged between the two committed trees. R7's two host messages match these predicates, subject to the runtime identity limit above.

| Source and location | Role in the failure | Common Git blob |
| --- | --- | --- |
| `harness/solution-contract.ts:153`, especially 163 to 164 | Parses capability criterion IDs against the host inventory. It cannot check the acceptance plan's reciprocal references by itself. | `91c232cd7937bdccdc86b0e3cfbd198834916420` |
| `harness/quality-contract.ts:148` | Parses journeys, then criteria. Line 180 throws immediately for a missing reciprocal capability link. Lines 192 and 198 collect implemented/synthetic journey references; lines 210 to 211 reject unused journeys only after the criterion loop finishes. Lines 212 to 216 enforce required-capability reverse mappings. | `5ddb182a410653d9a65b3b16550b2120a37ce0d4` |
| `electron/quality.ts:68` | `loadQualityContract` parses solution and evaluation first, then acceptance and UX. It propagates the first exception; it does not collect all cross-reference faults. | `1f82788d199af59aec003ec19ef32662abfa6244` |
| `electron/pi-backend.ts:763` and `:690` | `missingFiles` calls the loader at 776 and wraps its error at 780. `complete` validates after the initial response, prompts once at 697, validates again at 700 and throws at 702 if still invalid. Existing artifact aggregation therefore contains only the first quality-contract exception. | `22530294070420dce26780ff340d3921536c07c1` |
| `electron/independent-judge.ts:271` | Separate advisory planning audit, described below. | `f6bc893a9648a95e935eb26c702b45433967d2e0` |
| `electron/agent-runner.ts:30` and `:69` | Separate phase/session deadline and model-idle watchdog, relevant to IDs 36/12. | `357b730f3f891e2397a7e04df7fde087f7cb30e0` |

[E] This ordering explains why a reciprocal failure can conceal an independent orphan journey from the initial completion prompt. If both exist in one otherwise valid contract pair, line 180 exits before line 211. It also explains the second rejection on the retained final pair. This is a source-level deduction, not execution of either parser on R7 artifacts.

## Structural completion and advisory audit

[E] In both revisions, `electron/pi-backend.ts:954` awaits the initial planning agent, including structural validation and its sole completion prompt. Only after that returns does line 956 call `auditPlan`; line 958 then reloads the strict contract, and later code materializes the foundation and seals the plan. ID 08 throws within the first call and never reaches that audit in the recorded attempt. Its tail has no host audit-start/result event. Its final null report alone would not prove this, but the tail and call ordering establish the boundary. A later Resume is not evidenced here.

[E] The landed audit evaluates original obligations against an immutable planning snapshot. `electron/independent-judge.ts:271` returns approved, corrections or unavailable, preserving uncertainty; cancellation propagates. `electron/pi-backend.ts:875` permits one separate correction turn, records that turn before starting it, and may inspect again. The correction uses `singleTurn`, which bypasses extra artifact completion at line 693. Audit status is advisory, while the following strict contract load still rejects malformed planning artifacts. Audit results are saved in private checkpoints and included in passing review evidence. Audit approval is planning-coverage evidence, not app acceptance.

[E] Existing `tests/pi-backend.test.mjs:216` through the audit cases at 343 cover approval, unresolved/unavailable results, correction limits, Stop, Resume and the separate engine lifecycle. Existing structural cases at 2145 and 2193 cover invalid acceptance coverage and one artifact completion prompt. `tests/harness-quality.test.ts:407` and `:422` reject required-capability omissions and nonreciprocal mappings. These tests were read, not run here.

[R] Keep the advisory policy. The superseded builder audit assignment is not a remedy for a failure that occurs before audit entry. This report adds no audit, officer judgment or assessment of ID 11's acceptance.

## One minimal generic correction

[R] **Collect independent mapping faults in one strict parser rejection.** In `parseQualityPlan`, retain all shape, inventory, duplicate-ID, deferral and evidence checks. Once the relevant entries are structurally valid, collect missing reciprocal capability links, unused journeys and required reverse-mapping faults using the existing predicates. Throw one deterministic diagnostic containing the criterion/capability pairs and orphan journey IDs before returning any plan. Do not return a partially valid contract, silently add links, delete journeys, change dispositions or expose evaluation answers. Malformed prerequisites can still fail immediately; this is not an exhaustive diagnostic rewrite across every contract file.

[R] Limit implementation ownership to `harness/quality-contract.ts`, with regressions in `tests/harness-quality.test.ts` and `tests/pi-backend.test.mjs`. The existing loader and `missingFiles` already forward an error message into the sole completion prompt, so no production change is proposed in `electron/quality.ts`, `electron/pi-backend.ts` or the audit. Verify that forwarding through the actual host path rather than testing a disconnected helper. Keep the current attempt ceiling, final refusal, Stop, writer shutdown, frozen-plan restoration, test baselines, Resume, final judging and accounting behavior.

[R] Falsifiable synthetic design, **not executed**: use an invented item-summary task with criteria `R-A`, `R-B`, `R-C`; one required capability `summarize`; and primary journeys `create-item`, `edit-item` plus recovery journey `recover-input`. All criteria are implemented and reference `summarize`. The valid capability lists all three criterion IDs. Map `R-A` to `create-item`, `R-B` to `recover-input`, and `R-C` to `edit-item`. Supply otherwise valid browser runtime, public invocation, UX, foundation and synthetic evaluation fixtures. No challenge IDs, R7 outputs or sealed historical answers enter these tests.

| Control | Mutation from the same valid pair | Required observation |
| --- | --- | --- |
| Combined negative | Remove `R-A` and `R-B` from the capability's criterion list, retaining `R-C`; clear only `R-C`'s journey list. | Parser rejects with both missing reciprocal pairs and `edit-item` together. All inputs remain unchanged. On today's source, an assertion requiring all three diagnostics should fail because the first reciprocal error throws immediately. |
| Capability-only negative | Restore `R-C`'s journey mapping but leave the two reciprocal omissions. | Both reciprocal faults remain in the rejection; no orphan journey is reported. |
| Journey-only negative | Restore both reciprocal links but leave `edit-item` unmapped. | The orphan still rejects. Aggregation has not accepted a partly repaired plan. |
| Unchanged valid control | Use the original pair without mutations. | Parsing succeeds with the same parsed value and unchanged serialized inputs. No diagnostic or completion prompt is added. |
| Host refuses incomplete completion | Initial synthetic planner writes the combined negative; its one completion response fixes only the reciprocal links, or fixes nothing. | The initial completion prompt contains all three faults; the second validation refuses remaining faults. Exactly two planner prompts, zero audit sessions and no build entry or frozen quality hash. No transport retry or third completion prompt. |
| Host accepts complete structural repair | Initial planner writes the combined negative; the sole completion response restores exactly the valid pair. | Exactly two planner prompts; the audit is entered once and receives the restored pair. Stop at that boundary with the fixture callback so this proves sequencing without a real build. With valid input from the outset, require one planner prompt and one audit entry. |

[R] Extend the existing harness near `tests/pi-backend.test.mjs:2145` using its synthetic session and `auditSessions` instrumentation at lines 105 to 125. In that host fixture, bind the three synthetic criterion roles to IDs from its actual packet and keep any remaining criteria valid; do not rewrite the host inventory. Keep unknown/duplicate IDs, required-capability deferral and invalid synthetic-coverage controls rejecting. Preserve existing Stop/Resume audit tests. An implementation owner must first capture the combined-diagnostic assertion failing on the named baseline, then passing with the correction and all negative/valid controls. No such failure/pass run is claimed here.

[A] The likely benefit is that one completion response can address independent visible mapping errors together. Neither fewer real-run failures nor time/token savings is established, and missing pre-repair bytes prevent attributing this specific R7 outcome to hidden simultaneous errors. The confirmed diagnostic ordering supports the generic regression without claiming a historical rescue.

## IDs 36 and 12

[E] [ID 36's tail](../QA/Ten/R7/id36-paperless/log-tail.txt), line 71, reports a 300-second absence of model progress during plan. [ID 12's tail](../QA/Ten/R7/id12-optask/log-tail.txt), line 79, reports the same condition during verify. Both final receipts have `report: null`. Their broad user-facing timeout summaries do not identify the cause more precisely than those tails.

[E] In both source revisions, `electron/agent-runner.ts:30` defaults to five minutes idle and 30 minutes per agent session. The heartbeat timer at 69 to 72 emits the observed idle error; the independent session deadline at 82 emits a different error. Progress events reset the heartbeat. The observed 300 seconds are therefore idle-watchdog expiries, not evidence of a whole-run budget expiring or the provider's internal state.

[E] Provider latency, transport interruption, a missing event or another cause cannot be distinguished from these tails. The reduced final receipts omit writer/process cleanup state. Source contains shutdown safeguards in `electron/pi-backend.ts:501` to 549 and final process cleanup at 135 to 145, but that is not independent confirmation that these particular workers ended. Neither successful cleanup nor surviving work is demonstrated here. [R] Main retains runtime diagnosis and cleanup evidence; preserve Stop and escalation for unconfirmed shutdown. No timer increase or additional repair loop is recommended.

## Verification and turn handoff

[E] Outcome: this single report diagnoses the recorded rejection sequence, identifies the missing historical evidence, traces both pinned validators, separates audit entry, and provides one bounded future correction. Verification consisted of local source reads, Git blob comparisons, JSON relationship inspection and SHA-256 checks. No repository program, generated app, test suite, model build or independent officer review was executed. The controls above are designs. Both relay notes were reread before completion; their current delivery changes do not alter the six traced source files.

[E] Prior work used: [[Ops/Directors/Directive-agentic]], [[Ops/Dev-Pattern]], [[Research/Plan/Plan]], [[Research/Plan/Findings]], [[Research/Plan/Review]], [[Research/Plan/Test-Results]], R7 retained evidence and the named repository revisions. The historical plan/test notes do not certify these later artifacts. The supplied `reports/mvp-gate.md` reports a sandbox gate failure at `ed90894`; this review neither reran it nor interprets those aggregate failures as the cause of R7.

| Local disclosure | Use | Provider/version |
| --- | --- | --- |
| Command runner and file patch tool | Read permitted evidence and write this report | Session environment; versions not exposed |
| Git | Inspect pinned source and compare blob identities | Git project / Apple, 2.50.1 (Apple Git-155) |
| zsh, ripgrep and system text readers | Local command execution, file inventory and bounded text reads | zsh 5.9; ripgrep 15.2.0; system-reader versions not recorded |
| Python standard library | Read JSON, enumerate relationships and compute SHA-256 | Python Software Foundation, Python 3.9.6 |
| R7 contracts/receipts and repository source | Existing project evidence, including synthetic planning data | Project benchmark and local Git, identities above |

[E] Friction: some broad reads were truncated; decisive passages were reread in bounded sections. Apple tool launchers emitted denied cache-write warnings but source/hash commands completed. A shell heredoc could not create a temporary file, so the same read-only JSON inspection used an inline command without temporary files. Pre-repair bytes remain unavailable in the inspected evidence.

[E] The task's single-file restriction takes precedence over the general journal/README routine. `.tmp/JOURNAL.md` and central Sprint, Sessions and Team/Now notes were not written; the prescribed ledger helper is also outside permitted access. This section retains outcome, verification, next action and disclosure for an authorized coordinating session to transfer. [R] Next action: main may allocate the three-file diagnostic correction with the failing-first controls above. Preserve this report as a source diagnosis; stop here without implementation or another audit.

## Source locations

- [E] R7 evidence: [ID 08 final](../QA/Ten/R7/id08-casrep/final.json), [tail](../QA/Ten/R7/id08-casrep/log-tail.txt), [acceptance plan](../QA/Ten/R7/id08-casrep/acceptance-plan.json), [solution contract](../QA/Ten/R7/id08-casrep/solution-contract.json), [manifest](../QA/Ten/R7/id08-casrep/MANIFEST.json); [ID 36 final](../QA/Ten/R7/id36-paperless/final.json), [ID 12 final](../QA/Ten/R7/id12-optask/final.json).
- [E] Local repository `~/Documents/CDAO/FleetHarness`, pinned commits above: [quality parser](~/Documents/CDAO/FleetHarness/harness/quality-contract.ts:148), [solution parser](~/Documents/CDAO/FleetHarness/harness/solution-contract.ts:153), [loader](~/Documents/CDAO/FleetHarness/electron/quality.ts:68), [completion](~/Documents/CDAO/FleetHarness/electron/pi-backend.ts:690), [audit](~/Documents/CDAO/FleetHarness/electron/independent-judge.ts:271), [watchdog](~/Documents/CDAO/FleetHarness/electron/agent-runner.ts:69), [parser tests](~/Documents/CDAO/FleetHarness/tests/harness-quality.test.ts:407), [host tests](~/Documents/CDAO/FleetHarness/tests/pi-backend.test.mjs:2145). Links open the local checkout; commit/blob identities above pin the reviewed content.
- [E] `~/.local/share/fleethacker-context/org/CHARTER.md`, `relay/LATEST.md`, `relay/LATEST-analysis.md`, `reports/mvp-gate.md`; [[Research/00-Brief]], [[Team/Now]], [[Reference/Open-Questions]]. No external web source was needed for this local evidence diagnosis.

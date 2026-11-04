---
type: research
status: proposed
owner: mukul
updated: 2026-11-04
summary: "Group rejected challenges 11 and 12 under primary-task deferral; enforce source-task coverage and independently checked synthetic demonstrations."
---

# Primary-task deferral, round 1

## Bottom line

[R] Assign **agentic-builder** one factory correction after its current verifier consolidation and exact-commit review: preserve the original card task through intake and planning, then reject a plan that defers its defining outcomes. Require an independently checked synthetic demonstration of every defining behavior before counting the build satisfactory. Implement the coverage rule in existing skills and host gates; keep independent outcome judgment outside builder authority. This is one shared cause group for rejected challenges 11 and 12, a proposed allocation rather than a dispatched task or implemented fix.

## Cause and retained evidence

[E, retained evidence] Challenge 12, round 1, `id12-optask`, used `d0f4c69` plus the benchmark's disclosed scratch runtime patch. `final.json.report` equals `test-report.json`. The receipt at `2026-11-04T21:05:16.064Z` reports review, 12/12 Node tests, 8/8 browser journeys, three passed criteria and four unverified. `quality.status` is passed and `requirementsMet` is false. The independent verdict is NOT in [[Research/QA/Officer/JUDGE-R1-id12-optask]]. These are inspected records, not newly executed tests.

[E, generated scope and plan] Intake still describes extraction of all three event types and says the user supplied no narrower scope. Planning then substitutes generic EVENT/TASK parsing and manual category selection. `acceptance-plan.json` defers `UC12-1` and `DELIVERABLE12-1`, with no journeys for either. Its primary journey selects the frequency category itself after parsing a radio-check record. Thus the frozen test supplies a result the requested extractor was supposed to produce. The builder follows that reduced contract; the first decisive failure is planning, before application repair.

[E, source inspection at integration `1d9eeee`] `harness/quality-contract.ts:87` validates criterion inventory and journey syntax but requires only one implemented criterion, regardless of provenance. `electron/quality.ts:44` retains deferrals as unverified, yet its passed status excludes only failed criteria. `shared/verification.ts:4` accepts that combination. `electron/pi-backend.ts:237` through `:257` therefore advances to prototype review. The existing factory correctly distinguishes prototype checks from `requirementsMet`; the benchmark mission needs a stronger completion boundary.

[E, skill inspection] There is no separate acceptance skill in the inspected skill directory. Acceptance guidance lives in `fleet-planning` and `fleet-evidence`; `fleet-messages` supplies the generic grammar and asks for a reviewed category mapping. Neither the guide nor the current structural gate prevents deferring the whole original task. The relevant files are unchanged between `d0f4c69` and supplied mvp `1d9eeee`, checked with pinned Git comparison.

### Challenge 11 evidence

[E, retained scope and plan] The same mechanism starts in intake: `id11-training/scope.md` records that user scope repeats the complete card, then recommends a smaller deterministic scheduling demonstration. `plan.md:11` and `acceptance-plan.json` freeze deferral of `UC11-1`, `SCH-04`, `SCH-05` and `DELIVERABLE11-1`. Departmental negotiation, recurrence generation and schedule optimization are absent; only collision avoidance, supplied hard constraints and solver-status handling are implemented. Deferral is disclosed, but no user-authorized scope reduction is recorded. This is observed scope substitution, not evidence about agent intent.

[E, receipt comparison] At `2026-11-04T21:09:29.319Z`, `final.json.report` equals `test-report.json`: review, 15/15 Node checks, 16/16 browser journey runs (eight journeys at two widths), three passed criteria and four unverified. `quality.status` is passed while `requirementsMet` is false. [[Research/QA/Officer/JUDGE-R1-id11-training]] independently returns NOT because the requested weekly planning task cannot be completed. This round-1 card run is separate from the earlier curated Pipeline/CLI training candidates.

[E, scheduling skill at 1d9eeee] `skills/fleet-scheduling/SKILL.md` already requires recurrence expansion and distinguishes feasibility from optimization. Those instructions did not prevent freezing a plan without either capability. [R] Enforce source coverage before freeze, and make the scheduling acceptance examples exercise negotiation, recurrence and a stated objective together. Additional generic solver tests cannot establish those missing behaviors.

[R] Two boundaries must hold. The host structurally rejects missing or deferred defining source criteria; it cannot infer semantic correctness from a criterion ID or an `implemented` label. Independent QA then checks the actual synthetic task and exact artifact before a satisfactory verdict. A passing generated test, self-written verification paragraph or planner-authored literal is not that independent evidence. Retain the benchmark's existing independent-judge requirement rather than adding another verifier or an agent-controlled approval flag.

## Shared cause group

| Entry | Evidence and grouping |
| --- | --- |
| ID 12, confirmed primary-task failure | [E] Both source outcomes deferred; manual labels replace extraction. Independent judge returns NOT. This was the first case in this cause note. |
| ID 11, confirmed same cause and independent rejection | [E] Unchanged card scope; `UC11-1`, `SCH-04` and `DELIVERABLE11-1` deferred, including departmental negotiation, recurrence and optimization. Generic scheduling checks pass with `requirementsMet: false`; independent judge returns NOT. Both rejected builds belong to this factory correction. |
| IDs 8, 20 and 35, related coverage signal | [E] Their retained plans also defer source criteria while `quality.status` passes and `requirementsMet` is false. Reasons include real authorization, evidence and integration gaps. These receipts show the same completion-policy exposure; they do not establish that each deferral is an avoidable application defect. Preserve those limits and require individual judgment. |
| ID 36, separate repair cause | [E] [[Research/Agentic/08-Native-Select-Repair]] covers the malformed native option and unsuccessful label repair. Its deferred scope is an additional coverage gap. This acceptance change cannot repair that DOM defect. |

[R] Keep this as one cause note for source-task deferral. ID 11 also has a separate wrong-oracle defect: a candidate fits availability but conflicts with another event, while the frozen expectation says all candidates are unavailable. `verification.md:52-54` records changing diagnostic priority to satisfy that expectation. It needs a new independently checked planning contract, preserving the failed history. Neither weakening the judge nor fixing that sentence would restore the omitted primary task. See [[Research/QA/Ten/QA-Lead-Notes]].

## Exact implementation allocation

[R] All paths below are repository-relative, verified in `~/Documents/CDAO/fh-org/integration` at `1d9eeee`. **One code owner: agentic-builder.** Keep two reviewable slices under that owner, guidance and enforcement, and do not claim closure until both land and QA supplies new evidence.

| Files | Required change [R] |
| --- | --- |
| `skills/fleet-intake/SKILL.md` | Preserve the full original task when the user has not narrowed it. The smallest complete synthetic workflow must retain every defining behavior. Missing policy authority remains a visible limitation; it does not authorize replacing the task with two explicit requests. Separate a proposed narrower scope from an authorized task. |
| `skills/fleet-planning/SKILL.md`, `skills/fleet-evidence/SKILL.md` | Require a source-task coverage table before freeze: original criterion, defining input-to-output behavior, literal expected result, browser journey and independent checking status. Distinguish a recipe aid from completion of the card. Deferring a defining behavior leaves the run incomplete. Planner-authored expectations alone are not independent correctness evidence. |
| `skills/fleet-messages/SKILL.md` | For challenge 12, require a documented, explicitly synthetic mock-USMTF subset covering frequency plans, crypto change-over windows and flight-quarters times. Extract category and supplied values before human review. Manual category selection cannot stand in for extraction. Keep unsupported-format limits and avoid any real-USMTF compliance claim. |
| `skills/fleet-scheduling/SKILL.md` | For challenge 11, require distinct departmental proposal/negotiation behavior, recurrence expansion from explicitly synthetic rules and history, and one-action optimization against a declared measurable objective. Require independent expected allocations, occurrences and objective scores for a bounded example. Feasibility alone cannot satisfy optimization; department labels cannot satisfy negotiation. Retain no-invented-policy and search-exhaustion safeguards. |
| `harness/planner.ts`, `harness/phases.ts` | Align the existing plan/verify prompts and exit conditions with that rule. Keep the original task binding through the five phases. Missing authoritative facts must produce an incomplete result, not a replacement primary task or fabricated policy. Preserve the existing one-repair limit. |
| `harness/quality-contract.ts` | Add a reusable check using the host-provided acceptance inventory. For the unchanged full-card task, conservatively require every canonical criterion with `requirement` or `deliverable` provenance to be implemented and linked to a primary journey. Reject deferral or recovery-only coverage before freeze, naming offending IDs. Use provenance, including merged provenance, rather than ID-prefix guessing. Update `qualityContractGuide` with the same rule. |
| `electron/quality.ts` | Use that protected source inventory again when deriving the final quality result. Any required source criterion missing, unverified or failed must prevent a passing quality status, even if every recipe journey passes. Preserve exact criterion statuses and reasons, `requirementsMet`, hashes and Node/browser evidence. `reportPassed` already rejects failed quality, so no second verifier or shared-report rewrite is needed. |
| `tests/harness-quality.test.ts`, `tests/quality.test.mjs`, `tests/pi-backend.test.mjs` | Add the failing-first regressions below. Retain existing freeze, browser, cancellation and sandbox tests. Existing prototype fixtures must not silently become evidence of full-card completion. |

[R] This conservative source gate intentionally blocks a full-card success when external prerequisites prevent the requested behavior. Honest deferrals remain in the retained artifacts. Recipe-only limitations can still be recorded as unverified, and all remaining requirements and independent judgment still govern a satisfactory verdict. A separately authorized narrower task needs a new requirement record and run; it earns no completion credit for the original card. Do not add an agent-editable exemption, approve narrower scope on the user's behalf, or relabel an untested outcome implemented.

[E, directive and relay at this turn's start] Verifier consolidation overlaps `harness/phases.ts` and `tests/pi-backend.test.mjs`. Both relays now describe Windows `4c49e85`: its shared Pi test adds a 60-second functional-test allowance, 45-second browser budget, 2.5-second step budget and richer failure diagnostics while retaining deliberately short timeout tests. This supersedes the earlier mismatched relay-analysis observation. Integration of that patch into supplied mvp `1d9eeee` is not established. [R] Runner must serialize ownership after current review and preserve these fixture changes. Keep Dan's frontend, the existing sandboxed execution path, packet integrity, frozen contracts and export controls. No generated app hand edits or new orchestration framework are part of this task.

## Challenge 11 acceptance cases

[R] QA independently checks these cases against the original weekly planning task. Use fictional departmental roles, administrative training, people/resource IDs and explicitly invented demonstration policies. Supply public format/calibration examples through the factory, with evaluator variants and literal answer keys outside builder access. No real roster, schedule or SFTRM values are needed or authorized. A synthetic algorithm demonstration does not establish compliance with actual policy; missing authority remains unverified.

| Case | Required observation [R] |
| --- | --- |
| Competing departmental requests over a week | Distinct departmental agents produce proposals and negotiate an allocation under shared constraints. Retain proposal/counterproposal evidence and verify the final board against an independent allocation. Department labels on a centralized solver or a narrative log without executed proposal behavior fail this case. |
| Mandatory recurrence from rules and history | The app generates every due occurrence with a stable ID and deadline, including a due-date/week boundary. Change completion history or the synthetic interval and verify the expected occurrence set changes. Scheduling only manually entered occurrences fails. |
| Multiple feasible schedules with different objective scores | Define a simple synthetic preference objective and tie-break before generation. Independently enumerate the tiny feasible set, compare the chosen allocation and score with the expected optimum, and change preferences so the optimum changes. A first-feasible result, unchanged sample or optimization label without objective evidence fails. |
| End-to-end weekly task | Through the actual UI, load fresh synthetic requests/rules, negotiate, generate recurring occurrences, optimize, inspect conflicts and numeric personnel loads, review and export. Compare all occurrence IDs, assignments, times, loads and objective values with independent expectations. After an edit, invalidate approval and recompute. |
| Impossible, exhausted or incomplete input | Distinguish proven infeasibility from search exhaustion and missing facts. Preserve requests, report accurate reasons and refuse a complete/accepted schedule when mandatory work is absent. No automatic relaxation of hard constraints or fabricated policy. |
| Three deliberately reduced builds | Remove negotiation, recurrence or objective comparison in turn while preserving generic scheduling checks. Independent acceptance rejects each; a fully deferred source plan is rejected earlier by the host. |

[R] Record the independently checked case revision, literal expected outcomes, actual UI/export observations, source and contract hashes, negative-control failures and verdict in the existing QA evidence workflow. These rows specify required coverage, not a validated answer key or a completed demo. Missing independent evidence leaves the result NOT VERIFIED. Actual operator acceptance under SCH-05 remains person-owned and cannot be manufactured by clicking a review control.

## Challenge 12 acceptance cases

[R] QA independently checks a documented synthetic grammar and calibration examples before a new benchmark round. The builder may receive the supported format and public examples; evaluator variants and their answer key stay outside builder access and edit authority. Do not call two loads of the same parser independent validation. Do not import real messages, frequencies, keys, schedules or operational procedures.

| Case | Required observation [R] |
| --- | --- |
| One example for each of the three requested types, plus a mixed message | From raw mock text, the actual app extracts each correct type, supplied fields and times automatically, and places every expected event on one dated 24-hour timeline. Compare complete records, counts and source spans with independently checked literal answers. |
| Fresh mixed example with changed values, order and times | Results change with the source. Test before any category-edit action. Review may confirm or correct the extracted draft but cannot supply the missing primary transformation. |
| Cross-midnight window and explicit timezone offsets | Independently calculated instants and daily clipping agree; reviewed export retains the complete interval and source evidence. |
| Non-event, unsupported or ambiguous input | No fabricated event, category or timestamp. Explain unresolved input, retain the source and show correct recovery after a valid edit. |
| Review then source edit, followed by export | Prior approval is invalidated. After fresh review, the downloaded records match the current independently expected timeline. |
| Deliberately incomplete extractor | Omitting one event type, requiring manual categories or returning a canned sample fails acceptance, even with passing generic parser tests. |

[R] These are coverage requirements, not a supplied USMTF specification or a claim of validated examples. Missing independent examples leave acceptance NOT VERIFIED. Passing synthetic cases establishes only the documented mock subset; human domain review and operational use remain separate.

## Proof and closure

[R] First retain failures showing: (1) ID 11-style and ID 12-style source deferrals plus passing recipe journeys are rejected; (2) the same defect with different IDs and merged provenance is rejected; (3) one implemented source item cannot hide another deferred source item; (4) recovery-only references cannot satisfy a required primary task; (5) all required outcomes implemented with valid primary/recovery coverage can pass the structural gate; and (6) a genuine recipe-only deferral stays unverified without being mislabeled complete. In particular, SCH-04's recipe provenance cannot exempt recurrence because UC11-1 independently requires it. Test the final report guard separately against missing/unverified source results. The factory integration regression must show the bad plan never reaches build/review and no extra repair session is introduced. A claimed implemented criterion with absent behavior must still fail independent semantic acceptance.

[R] Code-seat checks: `node node_modules/typescript/bin/tsc -p electron/tsconfig.json`; `node node_modules/typescript/bin/tsc -p harness/tsconfig.json`; `node --test tests/quality.test.mjs tests/pi-backend.test.mjs`; `node --test dist-harness/tests/harness*.test.js`. Save failing-before and passing-after receipts. Main's permitted runner performs browser-dependent checks and the full gate on the exact reviewed commit.

[R] Then rerun the unchanged original cards for challenges 11 and 12 without human help during generation. Independently judge the exact new artifacts using the complete task cases and negative controls above. Retain R1 unchanged and record new source/contract hashes and separate verdicts. Close this shared cause only when both pass the automatic bar and receive independently satisfactory judgments. Passing structural tests alone closes neither semantic correctness nor the ten-build mission.

[R] Humans retain scope decisions, final artifact acceptance and submission approval. Monitor source-task coverage, test edits, time and failure status. Stop and escalate prohibited data, uncontrolled work or failed shutdown through the existing operator procedure. No operational actions or publication are authorized by this note.

[E] This turn performed source and receipt review only. No application, generated test, model build or browser ran. The shared ledger tool is in a denied folder and Sprint/Sessions/Team writes are outside this assignment; the local journal holds the handoff.

## Sources

- [E] [[Research/QA/Officer/JUDGE-R1-id11-training]], [[Research/QA/Officer/JUDGE-R1-id12-optask]], [[Research/QA/Ten/QA-Lead-Notes]], [[Research/QA/Ten/Scoreboard]].
- [E] `Research/QA/Ten/R1/id11-training/{requirements.md,scope.md,plan.md,acceptance-plan.json,verification.md,final.json,test-report.json}`. Index SHA-256: `952bde005f4b2d71ba81e7fb42f41df8f97aa27ef8c8f6242e30f4d2dcc7f37f`; report source hash: `0d096deb78643350154e969e33e30edeb7c5f1411028c2552a31f9f4088ddf33`; contract hash: `b84725be9c1159fe429385df20391cc1305a98438d81f1b15943bfd4ec97dc81`.
- [E] `Research/QA/Ten/R1/id12-optask/{requirements.md,scope.md,plan.md,acceptance-plan.json,verification.md,final.json,test-report.json}`; corresponding scope/plan and receipt evidence for the grouped entries above. ID 12 index SHA-256: `7a6267696266b3dae240f8bc324c16f4ec271a360c53dea0e71f03decafcd0df`; report source hash: `94cff89336b5240f3abbab56e47255cee34396e9c24154f2e0c946934f6dfd7d`; contract hash: `ac51203e0a7681459a22663bb6bae2fc845ff003c45b913ba1dd0719241c834a`.
- [E] Local pinned source inspection: https://github.com/danjung9/FleetHarness/tree/1d9eeee. No remote retrieval. File locations and gate behavior are described above.
- [P, retained card capture] https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12. The retained requirement was read locally; the live portal was not rechecked.
- [R] [[Ops/Directors/Directive-agentic]], [[Ops/Dev-Pattern]], [[Research/Agentic/Flow-Goals]]. Earlier single-app scope in [[Research/Plan/Plan]] and [[Research/Plan/Findings]] is superseded for this benchmark; [[Research/Plan/Review]] and current directives govern the later evidence and work allocation.

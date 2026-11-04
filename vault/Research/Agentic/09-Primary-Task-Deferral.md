---
type: research
status: proposed
owner: mukul
updated: 2026-11-04
summary: "Group challenge 12 and 11 under primary-task deferral; require source-task coverage before freezing a plan and passing factory verification."
---

# Primary-task deferral, round 1

## Decision

[R] Assign **agentic-builder** one bounded factory correction after its current verifier consolidation and exact-commit review. Preserve the original card task through planning, require independently checked synthetic examples of its defining outcomes, and reject completion when those outcomes are deferred. Implement this in the existing planning/evidence/message skills and host quality gate. A skill-only warning would leave the observed bypass available. This is a proposed allocation, not a dispatched task or implemented fix.

## Cause and retained evidence

[E, retained evidence] Challenge 12, round 1, `id12-optask`, used `d0f4c69` plus the benchmark's disclosed scratch runtime patch. `final.json.report` equals `test-report.json`. The receipt at `2026-11-04T21:05:16.064Z` reports review, 12/12 Node tests, 8/8 browser journeys, three passed criteria and four unverified. `quality.status` is passed and `requirementsMet` is false. The independent verdict is NOT in [[Research/QA/Officer/JUDGE-R1-id12-optask]]. These are inspected records, not newly executed tests.

[E, generated scope and plan] Intake still describes extraction of all three event types and says the user supplied no narrower scope. Planning then substitutes generic EVENT/TASK parsing and manual category selection. `acceptance-plan.json` defers `UC12-1` and `DELIVERABLE12-1`, with no journeys for either. Its primary journey selects the frequency category itself after parsing a radio-check record. Thus the frozen test supplies a result the requested extractor was supposed to produce. The builder follows that reduced contract; the first decisive failure is planning, before application repair.

[E, source inspection at integration `1d9eeee`] `harness/quality-contract.ts:87` validates criterion inventory and journey syntax but requires only one implemented criterion, regardless of provenance. `electron/quality.ts:44` retains deferrals as unverified, yet its passed status excludes only failed criteria. `shared/verification.ts:4` accepts that combination. `electron/pi-backend.ts:237` through `:257` therefore advances to prototype review. The existing factory correctly distinguishes prototype checks from `requirementsMet`; the benchmark mission needs a stronger completion boundary.

[E, skill inspection] There is no separate acceptance skill in the inspected skill directory. Acceptance guidance lives in `fleet-planning` and `fleet-evidence`; `fleet-messages` supplies the generic grammar and asks for a reviewed category mapping. Neither the guide nor the current structural gate prevents deferring the whole original task. The relevant files are unchanged between `d0f4c69` and supplied mvp `1d9eeee`, checked with pinned Git comparison.

## Shared cause group

| Entry | Evidence and grouping |
| --- | --- |
| ID 12, confirmed primary-task failure | [E] Both source outcomes deferred; manual labels replace extraction. Independent judge rejects it. This is the anchor case. |
| ID 11, confirmed same planning mechanism | [E] `id11-training/scope.md` says the user did not narrow the card. Its plan defers `UC11-1` and `DELIVERABLE11-1`, including departmental negotiation, periodicity and optimization, while generic scheduling checks pass. The retained report has `requirementsMet: false`. Group with ID 12 for source-task deferral; its independent satisfactory verdict remains separate. |
| IDs 8, 20 and 35, related coverage signal | [E] Their retained plans also defer source criteria while `quality.status` passes and `requirementsMet` is false. Reasons include real authorization, evidence and integration gaps. These receipts show the same completion-policy exposure; they do not establish that each deferral is an avoidable application defect. Preserve those limits and require individual judgment. |
| ID 36, separate repair cause | [E] [[Research/Agentic/08-Native-Select-Repair]] covers the malformed native option and unsuccessful label repair. Its deferred scope is an additional coverage gap. This acceptance change cannot repair that DOM defect. |

[R] Keep this as one cause note for source-task deferral. Do not merge ID 11's false universal explanation into this fix: [[Research/QA/Ten/QA-Lead-Notes]] identifies an independently wrong frozen expectation, which needs correction through a new reviewed planning contract.

## Exact implementation allocation

[R] All paths below are repository-relative, verified in `~/Documents/CDAO/fh-org/integration` at `1d9eeee`. **One code owner: agentic-builder.** Keep two reviewable slices under that owner, guidance and enforcement, and do not claim closure until both land and QA supplies new evidence.

| Files | Required change [R] |
| --- | --- |
| `skills/fleet-planning/SKILL.md`, `skills/fleet-evidence/SKILL.md` | Require a source-task coverage table before freeze: original criterion, defining input-to-output behavior, literal expected result, browser journey and independent checking status. Distinguish a recipe aid from completion of the card. Deferring a defining behavior leaves the run incomplete. Planner-authored expectations alone are not independent correctness evidence. |
| `skills/fleet-messages/SKILL.md` | For challenge 12, require a documented, explicitly synthetic mock-USMTF subset covering frequency plans, crypto change-over windows and flight-quarters times. Extract category and supplied values before human review. Manual category selection cannot stand in for extraction. Keep unsupported-format limits and avoid any real-USMTF compliance claim. |
| `harness/planner.ts`, `harness/phases.ts` | Align the existing plan/verify prompts and exit conditions with that rule. Keep the original task binding through the five phases. Missing authoritative facts must produce an incomplete result, not a replacement primary task or fabricated policy. Preserve the existing one-repair limit. |
| `harness/quality-contract.ts` | Add a reusable check using the host-provided acceptance inventory. For the unchanged full-card task, conservatively require every canonical criterion with `requirement` or `deliverable` provenance to be implemented and linked to a primary journey. Reject deferral or recovery-only coverage before freeze, naming offending IDs. Use provenance, including merged provenance, rather than ID-prefix guessing. Update `qualityContractGuide` with the same rule. |
| `electron/quality.ts` | Use that protected source inventory again when deriving the final quality result. Any required source criterion missing, unverified or failed must prevent a passing quality status, even if every recipe journey passes. Preserve exact criterion statuses and reasons, `requirementsMet`, hashes and Node/browser evidence. `reportPassed` already rejects failed quality, so no second verifier or shared-report rewrite is needed. |
| `tests/harness-quality.test.ts`, `tests/quality.test.mjs`, `tests/pi-backend.test.mjs` | Add the failing-first regressions below. Retain existing freeze, browser, cancellation and sandbox tests. Existing prototype fixtures must not silently become evidence of full-card completion. |

[R] This conservative source gate intentionally blocks a full-card success when external prerequisites prevent the requested behavior. Honest deferrals remain in the retained artifacts. Recipe-only limitations can still be recorded as unverified, and all remaining requirements and independent judgment still govern a satisfactory verdict. A separately authorized narrower task needs a new requirement record and run; it earns no completion credit for the original card. Do not add an agent-editable exemption, approve narrower scope on the user's behalf, or relabel an untested outcome implemented.

[E, directive and final relay reread] Verifier consolidation currently overlaps `harness/phases.ts` and `tests/pi-backend.test.mjs`. LATEST.md advanced to Windows `4c49e85`, whose shared Pi test adds a 60-second functional-test allowance, 45-second browser budget, 2.5-second step budget and richer failure diagnostics while retaining deliberately short timeout tests. LATEST-analysis.md describes a different hosted-routing commit, `89874ce`; it is not analysis of the current Windows patch. The shared Pi patch was inspected directly. [R] Runner must serialize ownership after current review and preserve these fixture changes. Keep Dan's frontend, the existing sandboxed execution path, packet integrity, frozen contracts and export controls. No generated app hand edits or new orchestration framework are part of this task.

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

[R] First retain failures showing: (1) ID 12-style source deferrals plus passing recipe journeys are rejected; (2) the same defect with different IDs and merged provenance is rejected; (3) one implemented source item cannot hide another deferred source item; (4) recovery-only references cannot satisfy a required primary task; (5) all required outcomes implemented with valid primary/recovery coverage can pass; and (6) a genuine recipe-only deferral stays unverified without being mislabeled complete. Test the final report guard separately against missing/unverified source results. The factory integration regression must show the bad plan never reaches build/review and no extra repair session is introduced.

[R] Code-seat checks: `node node_modules/typescript/bin/tsc -p electron/tsconfig.json`; `node node_modules/typescript/bin/tsc -p harness/tsconfig.json`; `node --test tests/quality.test.mjs tests/pi-backend.test.mjs`; `node --test dist-harness/tests/harness*.test.js`. Save failing-before and passing-after receipts. Main's permitted runner performs browser-dependent checks and the full gate on the exact reviewed commit.

[R] Then rerun the original challenge 12 card without human help during generation. Independently judge the exact new artifact using all three event types and negative controls above. Retain R1 unchanged and record new source/contract hashes and the verdict. Follow with ID 11 to test cross-recipe generality. Passing structural tests alone closes neither semantic correctness nor the ten-build mission.

[R] Humans retain scope decisions, final artifact acceptance and submission approval. Monitor source-task coverage, test edits, time and failure status. Stop and escalate prohibited data, uncontrolled work or failed shutdown through the existing operator procedure. No operational actions or publication are authorized by this note.

[E] This turn performed source and receipt review only. No application, generated test, model build or browser ran. The shared ledger tool is in a denied folder and Sprint/Sessions/Team writes are outside this assignment; the local journal holds the handoff.

## Sources

- [E] [[Research/QA/Officer/JUDGE-R1-id12-optask]], [[Research/QA/Ten/QA-Lead-Notes]], [[Research/QA/Ten/Scoreboard]].
- [E] `Research/QA/Ten/R1/id12-optask/{requirements.md,scope.md,plan.md,acceptance-plan.json,verification.md,final.json,test-report.json}`; corresponding scope/plan and receipt evidence for the grouped entries above. ID 12 index SHA-256: `7a6267696266b3dae240f8bc324c16f4ec271a360c53dea0e71f03decafcd0df`; report source hash: `94cff89336b5240f3abbab56e47255cee34396e9c24154f2e0c946934f6dfd7d`; contract hash: `ac51203e0a7681459a22663bb6bae2fc845ff003c45b913ba1dd0719241c834a`.
- [E] Local pinned source inspection: https://github.com/danjung9/FleetHarness/tree/1d9eeee. No remote retrieval. File locations and gate behavior are described above.
- [P, retained card capture] https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12. The retained requirement was read locally; the live portal was not rechecked.
- [R] [[Ops/Directors/Directive-agentic]], [[Ops/Dev-Pattern]], [[Research/Agentic/Flow-Goals]]. Earlier single-app scope in [[Research/Plan/Plan]] and [[Research/Plan/Findings]] is superseded for this benchmark; [[Research/Plan/Review]] and current directives govern the later evidence and work allocation.

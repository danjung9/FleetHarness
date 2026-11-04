---
type: acceptance
status: ready-for-review
owner: mukul
updated: 2026-11-04
summary: "Independent arithmetic and an unrun acceptance record for the four-request synthetic training draft at 631849f."
---

# Acceptance for the synthetic training draft

## Bottom line

[E, constraint calculation below] The existing four-request key agrees with the plan: the base and fresh-edit answers are each unique, both people total 120 minutes, and the required rest is satisfied. The deliberately overlapping answer and the answer missing D fail independent checks. [R] Use this record for the retained single interface at `631849f638614735a89a555d487d6b3c777c52e3` and the actual delivered task app. [E] All actual application outcomes are **NOT RUN** here; arithmetic is evidence about the specification, not application acceptance.

## Contract and evidence boundary

[R] Use [[Research/QA/Officer/11-Training-Golden]] as the single input key, cases 11-G01 through 11-G12. This note links that fixture rather than copying its JSON. Its file SHA-256 at this review is `6c0b515006eafbd93751f8e9e292f1668a757fccac3694e1e90e011a86f63c54`. This identifies the expectation document, **not** a delivered application. Freeze the key and [[Research/Plan/Plan]] expectations before inspecting a candidate. A changed key needs an explained contract revision, never an adjustment merely to fit candidate output.

[E, directive and both relay files read before work] `631849f` retains Home, the catalog-to-brief flow, My builds and Flow. Separate Studio/Workbench paths were removed. [R] The older interface instructions in Plan, Findings and Test-Plan are historical; use [[Ops/Directors/Directive-qa]] for current navigation and authority. No replacement interface, second pilot or source change is required. The two-request S smoke cases are supplementary and must not be paired with this four-request answer.

[E, org/reports/mvp-gate.md] The current gate reports 128 passes and zero failures at `631849f`; it supplies no actual task-app acceptance in this record. [[Research/Plan/Test-Results]] reports older revisions and scripted-provider tests. Neither report fills any actual-result cell below. Candidate-authored tests remain separate from independent acceptance.

[R] These shared-vault keys are public to builders, not protected holdouts. A sibling directory or a document hash does not isolate them. Any undisclosed evaluator input must stay outside builder read/write authority. Terminate the builder and stop all writers before independent final-copy acceptance. Use only these synthetic people, rooms and invented rules; they are not training policy or operational schedules.

## Independent paper proof

[E, manual derivation from Plan and the linked key] For every request, `end = start + 60`. Intervals occupy `[start,end)`. Require exactly one assignment per supplied request, an allowed start, the unchanged person and room, qualification coverage, and containment in both operating and person windows. For a shared room, overlap exists when `max(start1,start2) < min(end1,end2)`. For each person, chronological sessions must have `next start - previous end >= required rest`. Sum session durations across both days, not elapsed time or rest.

| Quantity | Base derivation [E] | Fresh-edit derivation [E] |
| --- | --- | --- |
| A | Only start 0, so 0 to 60 | Only start 30, so 30 to 90 |
| B | Start 0 collides with A. Start 90 gives 90 to 150 and gap `90 - 60 = 30`. Only 90 survives. | Start 0 gives 0 to 60, overlapping A from 30 to 60. Start 90 gives gap `90 - 90 = 0`, below 30. Start 120 gives 120 to 180 and gap `120 - 90 = 30`. Only 120 survives. |
| C | Only start 0, so 0 to 60 | Unchanged, 0 to 60 |
| D | Only start 1440, so 1440 to 1500 | Unchanged, 1440 to 1500 |
| P01 minutes | `(60 - 0) + (150 - 90) = 60 + 60 = 120`, equal to maximum 120 | `(90 - 30) + (180 - 120) = 60 + 60 = 120`, equal to maximum 120 |
| P02 minutes | `(60 - 0) + (1500 - 1440) = 60 + 60 = 120`, equal to maximum 120 across both days | Same 120, not a separate 120-minute allowance per day |
| P01 rest | `90 - 60 = 30`, equal to required 30 | `120 - 90 = 30`, equal to required 30 |
| P02 rest | `1440 - 60 = 1380`, greater than or equal to required 0 | Same 1380, with no invented rest rule |
| Windows | A, B and C lie in 0 to 240; D lies in 1440 to 1680. Both operating and assigned-person windows contain them. | Latest day-one end is 180, still at or before 240; D remains contained. |
| Qualifications and rooms | P01 covers Q-A for A/B; P02 covers Q-B for C/D. Each shared room's sessions are separated. A/C may coincide because they share neither person nor room. | Same coverage and separation. No reassignment needed or permitted. |

[E, derivation] A, C and D have fixed starts and exactly one B candidate survives in each case. Therefore each complete answer is unique. This proves feasibility and uniqueness without a candidate scheduler verdict. The fictional clock maps the base A/C to day one 0800 to 0900, B to 0930 to 1030, and D to day two 0800 to 0900. The edit maps A to 0830 to 0930 and B to 1000 to 1100.

### Negative controls must fail

| Deliberately wrong output | Independent rejection proof [E] |
| --- | --- |
| N1: base with B at 0 to 60 | A/B share P01 and Room-1. `max(0,0) = 0 < min(60,60) = 60`, so they overlap for 60 minutes. The chronological person gap is `0 - 60 = -60`, also below required 30. Valid durations and a 120-minute total cannot cure simultaneous occupation. |
| N2: base with D omitted | Required multiset is exactly A, B, C, D, each once. Returned multiset A, B, C has three assignments and D count zero. P02 would total only 60, which is within its maximum but does not satisfy mandatory coverage. Collision-free output is insufficient. |
| N3: base with B at 60 to 120 | Start 60 is not a base candidate. Even in 11-G04, where 60 becomes permitted, the person gap `60 - 60 = 0` fails required rest 30. A room becoming free at 60 is insufficient. |

[R] Present N1 and N2 to the independent reviewer/checker even if the candidate's own tests are green. The evaluator must reject both and record the reason. If the app can import or enter these drafts, also demonstrate app rejection; an absent mechanism is NOT IMPLEMENTED, never an assumed pass. Do not modify production files or add a new control merely to inject them. N3 is the existing key's supplementary rejection control.

### Required variants and boundaries

[R] Reset to the base before each variant. For infeasibility, preserve all four input requests, identify the conflict plainly and expose no accepted complete schedule. A diagnostic partial attempt must remain visibly unaccepted. Invalid input is distinct from infeasibility. The expected status is a contract to test, not an observed application result.

| Key case | Expected result and independent reason |
| --- | --- |
| 11-G01 | Feasible, unique base assignments and totals above; exactly four request IDs, unchanged people/rooms and durations. |
| 11-G02 | Feasible, unique fresh-edit assignments above; old A/B values must not persist. Both totals remain 120. |
| 11-G03 | Infeasible. B restricted to 0 leaves only the N1 collision; every possible complete choice is invalid. |
| 11-G04 | Infeasible. B restricted to 60 leaves zero rest, a 30-minute shortfall. |
| 11-G05 | Feasible. B restricted to 90 supplies exactly 30 rest minutes. Equality is allowed. |
| 11-G06 | Infeasible. P01 maximum 119 is exceeded by `120 - 119 = 1` minute. Dropping/shortening a request is prohibited. Rest does not count as training minutes. |
| 11-G07 | Infeasible. P01 without Q-A cannot cover A or B's required Q-A. Assigned groups have one member, so this example does not settle qualification rules for larger groups. |
| 11-G08 | Invalid input. Changing D's ID to C gives two occurrences of C. Do not overwrite, merge or silently renumber them. |
| 11-G09 | Invalid input. The linked key's quoted `"0900"` is text, not an integer minute. Do not coerce imported text to 900 or 90. Ordinary numeric form entry may serialize a valid integer; test the malformed representation at an actual supported input boundary. |
| 11-G10 | `budget_exhausted` under the linked bounded-search contract with `maxNodes = 1`; no accepted assignments and no claim of proven infeasibility. The base witness above still exists, so a resource cutoff cannot make the mathematical instance infeasible. One partial-assignment expansion cannot complete four requests. Do not infer exact node counts for a different solver: document its equivalent interrupted-search condition and obtain reviewer agreement, or leave this case NOT IMPLEMENTED. No solver was run for this proof. |
| 11-G11 | Infeasible. P02 with only its day-one window cannot attend D at 1440 to 1500, even though the operating window allows it. |
| 11-G12a | Infeasible. Second operating window ending 1499 misses D's fixed end 1500 by one minute. |
| 11-G12b | Feasible when that operating end is restored to 1500. D ends exactly on the permitted boundary and the base assignments fit. |

[E, independent local calculation, Python 3.9.6 standard library] A separate inline calculation parsed the linked key and enumerated its candidate start combinations using the constraints above, without importing or running repository code. It found one base answer, one fresh answer, one rest-boundary answer, no answer for the impossible/rest-short/minutes/qualification/person-window/1499 variants, and the base answer at window end 1500. Duplicate and malformed variants failed input checks. N1 failed person/room checks, N2 failed request membership and N3 failed start/rest checks. This corroborates the paper arithmetic only. Budget status is the contract and logical distinction above; it was not a measured search result.

## Actual application acceptance record

[R] The main QA lead owns execution and acceptance; the organization runner supplies supported launches under existing authorization. This document authorizes no run. Reuse matching evidence rather than repeat an existing check. Required outcomes below must be observed on the actual inline browser app and final delivered copy, not inferred from a helper test. Use PASS only for an observed match, FAIL for an observed mismatch, NOT RUN for an unperformed check, BLOCKED for a documented execution barrier, and NOT IMPLEMENTED for an absent capability.

[R] Fill this header for each run, and attach row-specific observations when the interface or artifact differs. Leave unknowns empty, not guessed. All following actual, evidence and decision cells are intentionally blank.

| Record field | Actual value |
| --- | --- |
| Target source | `631849f638614735a89a555d487d6b3c777c52e3` |
| Observed source commit and any later delta | |
| Actual build route, run ID and artifact ID | |
| Manual edits/repair revision and stopped-writer evidence | |
| Key revision/hash and frozen expectation reference | |
| Interface, delivered path, OS/architecture and browser/runtime versions | |
| Static/fixture/live provenance and case start/end timestamps | |
| Runtime owner and authorization/evidence reference | |
| Reviewer role/decision reference, without personal data | |

[R] For each numeric row, compare input, visible result and any saved/exported representation by ID. Record actual values, not just a green badge. The last column must link concrete screenshots, serialized values, logs or decision records; the evidence descriptions are requirements, not evidence already collected.

| Case | Expected result | Evidence to collect | Actual observation | Status | Evidence path and reviewer decision |
| --- | --- | --- | --- | --- | --- |
| 11-G01 | Unique base answer, 120/120 minutes, rest 30/1380 | All four rendered rows, constraints, personnel totals and saved values | | NOT RUN | |
| 11-G02 | Unique fresh answer, 120/120 minutes, rest 30/1380 | Edited inputs and changed A/B on screen and in saved output | | NOT RUN | |
| 11-G03 | Infeasible, P01/Room-1 collision, inputs retained | Conflict explanation and absence of an accepted schedule | | NOT RUN | |
| 11-G04 | Infeasible, zero rest is insufficient | Required/actual rest and unaccepted state | | NOT RUN | |
| 11-G05 | Feasible, exactly 30 rest accepted | Boundary result and saved values | | NOT RUN | |
| 11-G06 | Infeasible, 120 exceeds 119 | Total, limit and all four retained requests | | NOT RUN | |
| 11-G07 | Infeasible, P01 lacks Q-A | Qualification error and unchanged assigned person | | NOT RUN | |
| 11-G08 | Invalid duplicate C, no silent loss | Raw input, visible error and no accepted output | | NOT RUN | |
| 11-G09 | Invalid quoted time | Input representation, error and no coercion | | NOT RUN | |
| 11-G10 | budget_exhausted, distinct from infeasible | Evaluator limit, actual status, no accepted schedule; equivalent-limit rationale if needed | | NOT RUN | |
| 11-G11 | Infeasible, D outside P02 availability | Both windows, D and explanation | | NOT RUN | |
| 11-G12a | Infeasible, operating end 1499 excludes D | D end 1500, window end 1499 and no accepted result | | NOT RUN | |
| 11-G12b | Feasible, operating end 1500 contains D | Exact boundary acceptance and all four saved assignments | | NOT RUN | |
| N1 | Reject overlapping A/B | Independent rejection reason; app result if supported | | NOT RUN | |
| N2 | Reject missing D | Required versus returned ID counts; app result if supported | | NOT RUN | |
| N3 | Reject base start 60 and inadequate rest | Start-membership and rest failures | | NOT RUN | |
| A11-UI, G01/G02/G08/G11 | Retained Home search/filter selects ID 11; saved criteria, My builds/resume/reload and Home-to-Flow preserve the chosen brief; engine radios reflect selection | Same-revision intake evidence and observed desktop handoff limits. No browser-build assumption | | NOT RUN | |
| A11-REVIEW, G10/G11 | Review valid base, edit to G02, immediately clear/supersede old review; recheck and explicitly review new version. Rerun/repair also requires fresh review and preview | Before/after review state, preview content and refusal to label unreviewed bytes approved | | NOT RUN | |
| A11-GUIDE, G19 | Follow delivered README launch, example, edit, check, conflict, review, save and recovery steps in order, including after repair | Exact guide version, actual control names, each step/result and limitations in delivered copy | | NOT RUN | |
| A11-SAVE, G12 | Save reviewed G02 as a reopenable draft and readable summary; close, reopen exact delivered app, import saved draft and recover exact inputs/results and version-specific review | Original file, recovered values including both totals/rest, review binding and origin/storage details. No silent defaults or inherited review for changed data | | NOT RUN | |
| A11-EXPORT, G13/G14 | Inspect final local copy: rendered, saved and exported values agree. Cancel creates no successful-delivery claim. Dialog/copy mutation must reject stale review or deliver exactly reviewed bytes | Source and destination identities, final-copy observations and mutation/cancel evidence from lead's existing procedure | | NOT RUN | |
| A11-OFFLINE, G12 | With network disabled in the isolated test context before a fresh cold launch, exact delivered artifact supports G02 edit/check/review/save/close/reopen/import with dependencies local | No warm-preview/cache substitute; platform, network controls, cold-start log and saved-file comparison | | NOT RUN | |
| A11-AUTHORITY, G05/G07/G15 | Existing approved consent, containment and Stop/quit gates cover the actual route; cancel starts no work; stopped work leaves no owned process, later heartbeat/write or dispatch | Main-lead gate references for pending-start, active-tool/guide work, quit/recovery and tested enclosing shutdown. Badge alone is insufficient | | NOT RUN | |
| A11-BYTES, G18 | Independently accepted final file set matches the exact delivery manifest and SHA-256 values before and after tests | Completed manifest below, stopped-writer evidence, copied-byte comparison and new review for any change | | NOT RUN | |
| A11-PACKAGE, G20 to G23, if executable delivery is claimed | Exact extracted package cold-launches on stated OS/architecture with network disabled; accepted draft workflow and cancel/quit/interrupted-packaging recovery work; allowed payload only | Separate HTML, wrapper/runtime and ZIP identities, contents and observed launch/recovery. Requires the lead's actual packaging authority | | NOT RUN | |
| A11-DECISION | Human accepts or rejects this exact digest and disclosed partial scope after reviewing required results; outstanding failures cannot become passes | Decision, scope, limitations, timestamp and digest reference; submission approval remains separate | | NOT RUN | |

[R] Source-export correction belongs to its assigned owner. Until exact-byte export is demonstrated, the lead may use the directive's manual control: stop all writers, copy, accept and hash the final copy, then record the decision against those bytes. This does not prove automatic mutation protection. A packaging gate is conditional on claiming that delivery route; if excluded, state the omission and retain NOT RUN. Missing required functionality must be disclosed to the lead and cannot be waived by this note.

### Exact final artifact and human decision

[R] Populate relative paths, byte sizes and full SHA-256 digests from the final delivered copy, including executable content, README, synthetic example, companion assets and saved draft. Enumerate the complete payload and record the manifest's own digest separately. A source commit, key hash, filename or screenshot is not an artifact digest. Recheck after acceptance; any byte change requires a new digest and affected acceptance. Keep the manifest outside the candidate's write authority and record the decision separately to avoid a self-referential digest.

| Artifact record | Exact path/identity | Byte size | SHA-256 | Verification/evidence |
| --- | --- | --- | --- | --- |
| Delivered index.html | | | | |
| Delivered README | | | | |
| Each companion/example/saved-draft file, add rows | | | | |
| Complete payload manifest | | | | |
| Wrapper/runtime identity, if claimed | | | | |
| Final distributable ZIP, if claimed | | | | |

| Decision field | Actual value |
| --- | --- |
| Accept/reject and decision timestamp | |
| Exact accepted manifest/digest reference | |
| Human reviewer role and decision record | |
| Required cases passed, failed, blocked or absent | |
| Accepted scope, actual build route and remaining limitations | |
| New acceptance required after any subsequent change | |

## Short synthetic reviewer walkthrough

[R] This is a proposed walkthrough with fictional roles, not a participant session or a measured usability result.

1. The technical operator identifies the final copy and its provenance. If factory evidence is needed, use Home, ID 11, the saved brief and Flow. The reviewing officer begins in the delivered training draft, reads the synthetic label and sees all four requests.
2. The coordinator loads the linked example and checks it. The reviewer finds B at 90 to 150, both totals at 120 and D on day two, then explains the 30-minute P01 rest gap before marking the draft reviewed.
3. The coordinator makes G02's edit. The reviewer sees the old review invalidated, checks A at 30 to 90 and B at 120 to 180, and reviews that version. Try the impossible/rest cases and ensure no conflict is silently relaxed. Reject N1 and N2 using the paper reasons.
4. Follow the actual guide to save the draft and summary, close, reopen and import. Compare all four rows, inputs, totals and review version. The authorized operator separately repeats the required workflow after disconnected cold launch.
5. The reviewer checks the final-copy evidence and digest before making a human decision. Failures return to the coordinator or main QA lead; nothing contacts people, issues an official schedule or assigns real personnel.

[R] Monitor check duration, input/output changes, review freshness and owned work. Stop/cancel unexpected work; escalate unclear constraints, prohibited data, uncontrolled usage or failed termination to the overseer. Use the tested enclosing-environment shutdown when needed. Human approval of a draft is limited to this synthetic task; it does not authorize a charged run or submission.

## Conflict-checker fallback and optional work

[R] If automatic selection is unavailable, label the artifact a **training conflict checker** and disclose its actual build route. A person supplies proposed times; the checker must validate mandatory membership, allowed starts, duration, fixed people/rooms, both window types, qualification, rest and horizon totals. Use the same base/fresh answers and N1/N2 rejection controls. Review invalidation, guide, save/import, cold launch, final-copy acceptance and the human decision remain required for their claimed route.

[R] A rejected proposal does not prove that every possible schedule is infeasible. The fallback must say the proposed draft is invalid and identify why, without claiming to generate alternatives, optimize, negotiate or exhaust a search it never ran. G03/G04 still require rejection, but a checker-only result must not be relabeled a solver proof. A checker with no search records G10 as NOT IMPLEMENTED and states the search limitation; it does not manufacture a budget result. Any stopped or incomplete check remains unknown, never valid or infeasible by default.

[R] Optional equivalent-input checks, such as reordering request rows and B's permitted starts, follow all required acceptance. Compare assignments by ID, not display order. Optional reviewer-understanding questions can ask why B moves, why D is mandatory and what an exhausted budget means. No participant outreach or new controls are part of this work.

[R] The scope remains Partial ID 11: a synthetic supplied-constraint training draft, or its disclosed checker fallback. No full-ID-11, synchronization or measured-benefit claim is supported. Local saves/downloads are persistence only. Departmental negotiation, recurrence, authoritative fatigue policy and operational approval remain outside this acceptance.

## Sources and local handoff

- [E] [[Research/Plan/Plan]], four-request contract and independent cases; [[Research/Plan/Findings]], limitations and unmeasured claims; [[Research/Plan/Test-Results]], historical attributed tests.
- [E] [[Research/QA/Officer/11-Training-Golden]], existing synthetic fixture and expected answers; [[Research/QA/Test-Plan]], shared gates as updated by the directive.
- [E] [[Ops/Directors/Directive-qa]], current target, 15-minute acceptance task, runtime ownership and manual final-copy control.
- [E] `~/.local/share/fleethacker-context/org/CHARTER.md`, `relay/LATEST.md`, `relay/LATEST-analysis.md`, `reports/mvp-gate.md`, `reports/feed-7.md` and `reports/snapshot-7.md`. Local records read; no external source or portal lookup needed.
- [E] [[Research/QA/Officer/README]] holds the local tools, friction, prior-work and session handoff because central log/status folders are outside this seat's write boundary.

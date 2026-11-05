---
type: submission
status: draft
owner: mukul
updated: 2026-11-04
summary: "AppYard built a synthetic offline task app in 13.4 minutes; independent checks found working behavior and remaining gaps."
---

# AppYard submission draft

## What Mukul must supply

| Required input | Blank to complete and evidence required |
| --- | --- |
| Named user and real problem | [R] **[MUKUL TO SUPPLY: named user or approved non-sensitive role identifier, task familiarity, confirmed problem and present process].** Keep personal contact details and real rosters out. Sources: [[Sprint/Submission-Checklist]], [[Research/QA/Officer/Trial-Protocol]]. |
| Measured burden | [R] **[MUKUL TO SUPPLY: trial record, baseline seconds, app seconds, correctness, help and conditions].** No trial yet; no measured reduction. Source: [[Research/QA/Officer/Burden-Claim]]. |
| Team details | [R] **[MUKUL TO SUPPLY: portal team name, approved member/contribution details, submission lead and registration/terms status].** Sources: [[Sprint/Submission-Checklist]], [[Reference/Open-Questions]]. |
| Category and eligibility | [R] **[MUKUL TO SUPPLY: selected category and organizer ruling on partial scope and missing sync].** Proposed category: Naval Agentic AI, not yet confirmed. Sources: [[Research/Plan/Review]], [[Event/Rules]]. |
| Prior work and rights | [R] **[MUKUL TO SUPPLY: Dan's pre-event/event split, including imported ffc21e2 source, ownership, licenses and restrictions].** Sources: [[Research/Plan/Review]], [[Sprint/Prior-Work-Log]]. |
| Transition owners and resources | [R] **[MUKUL TO SUPPLY: consenting mission and technical owners, security/reviewer roles, device and funded support].** Sources: [[Submission/Next-30-60-90]], [[Event/Rules]]. |
| Final artifact and human acceptance | [R] **[MUKUL TO SUPPLY: chosen copy and manifest, failed/unchecked case disposition, human decision bound to those bytes and any intervening edits].** Sources: [[Research/QA/Acceptance/Officer-Walkthrough-11]], [QA receipt][qa]. |
| Submission authority and format | [R] **[MUKUL TO SUPPLY: form fields, attachment limits, pitch length and explicit approval to submit].** Receipt stays blank until submission happens. Sources: [[Sprint/Submission-Checklist]], [[Research/Plan/Review]]. |

## The result

[E] **AppYard took a brief and built a working offline training-draft app in about 13 minutes, with its build agents held in a closed sandbox. A separate independent checker then tested the app.** The recorded build took 13.4 minutes on November 4, from 15:10:59 to 15:24:21 EST. Later browser checks exercised fresh inputs and offline saved-draft recovery. Build time excludes preparation, independent checking and human acceptance. Sources: [build report][build], [QA receipt][qa].

[E] This was one experiment: `631849f` plus a four-file patch in a throwaway copy and a restrictive permission profile. Agent shell probes denied selected outside reads, outside writes and network access; project writes and local tools worked. The model service remained connected. These observations establish the tested boundary, not general containment or an offline factory. Sources: [build report][build], [[Research/Plan/Review]].

[E] **No user trial or human acceptance has happened in the supplied record.** The independent result is **FAIL: 33 PASS, 1 FAIL, 14 NOT CHECKED**, at 15:38:15 EST. The clock display uses midnight for minute zero; the frozen officer key expects 08:00. This is not an accepted or field-ready app. Sources: [QA receipt][qa], [[Research/QA/Officer/Burden-Claim]].

## The task and its limits

[A] The proposed user is a training coordinator preparing a draft for a reviewing officer. The task is checking conflicting events against people, rooms, qualifications, available times and rest limits. Manual reconciliation is the assumed present process; its frequency and burden need user confirmation. Sources: [[Research/Plan/Plan]], [[Research/QA/Officer/Burden-Claim]].

[E] The prototype checks four fictional requests over two days. All 17 independent numeric cases passed, including fresh edits, impossible and invalid inputs, and search limits; visible personnel totals also passed. Review clears after edits; rechecking does not approve a new draft. Saving and importing the edited draft in a fresh offline browser context passed. Sources: [QA receipt][qa], [[Research/QA/Officer/11-Training-Golden]].

[E] This partial ID 11 app omits departmental negotiation agents, recurrence, real readiness data, official-calendar updates and reconnect sync. It supplies no approved fatigue or qualification policy. Sources: [[Research/Plan/Plan]], [artifact scope][scope].

## Keep the evidence distinct

| Evidence | Result and boundary |
| --- | --- |
| Real generation | [E] Five stages completed and stopped at Needs review. The 22 passing generated tests were written by the build agents, not an independent evaluator. Source: [build report][build]. |
| Independent browser check | [E] A separate checker used fixed answers and rendered output on a staged copy. It recorded unchanged file hashes, Chrome 156.0.8078.80 and Playwright 1.64.1. Clock-display and human-facing gaps remain. Sources: [QA receipt][qa], [[Research/QA/Acceptance/README]]. |
| Current product revision | [E] Assigned MVP `d0f4c69` reports 96 gate passes and 20 failures. The earlier experimental build does not certify this revision. Sources: [current gate][gate], [build report][build]. |
| Human value | [E] Usefulness, acceptance and burden reduction remain unmeasured. [R] Complete a matched synthetic trial before claiming time saved. Source: [[Research/QA/Officer/Burden-Claim]]. |

## Human authority

[R] Allow synthetic constraint checks and local draft saves. Prohibit real-person assignments, issued schedules, official-calendar writes, messages, equipment control and prohibited data. A person approves the task, charged execution, final artifact and submission separately. Sources: [[Research/Plan/Plan]], [[Event/Rules]].

[E] The build report records 184 log entries, 149 tool calls and no remaining run process. [R] The operator monitors time, actions, failures and changed files; cost stays unknown without usage records. On prohibited data, unexplained output, uncontrolled usage or failed shutdown, stop and escalate to Mukul and the technical owner. Use the approved environment shutdown fallback and verify workers are gone. Sources: [build report][build], [[Research/Plan/Plan]].

[E] A separate Pi fixture proved shutdown of one ordinary shell parent and child. Detached jobs and the build engine's Stop behavior remain unmeasured. Sources: [[Research/QA/GUI-631849f/Stop-Child-Runbook]], [[Research/Plan/Review]].

## Fleet-Ready coverage

[P] The captured common checklist has six items. The rows state coverage, not completion. Source: [[Research/RandE/Ideas/Scalability-Evidence]].

| Item | Evidence and remaining gap |
| --- | --- |
| Offline use | [E] Local-file checks and fresh offline import passed on the recorded browser. Government devices, installation and interrupted-use recovery remain unverified. Sources: [QA receipt][qa], [fielding note][fielding]. |
| Human authority | [E] Edit/recheck/fresh-review checks passed; a real person's decision and imported-review binding remain unchecked. Source: [QA receipt][qa]. |
| Cited sources | [E] Package claims link to receipts and synthetic inputs. Claim-level source coverage inside the app remains unverified. Sources: [[Research/QA/Acceptance/README]], [[Research/RandE/Ideas/Scalability-Evidence]]. |
| Auditable actions | [E] Build logs and receipts exist. Durable task history covering edits, decisions and exports has not been verified. Sources: [build report][build], [QA receipt][qa]. |
| Sync on reconnect | [E] Not implemented. Download/import is not synchronization. Source: [artifact scope][scope]. |
| One-page path to fleet | [R] Use [[Submission/Next-30-60-90]] for owners, device route, security review and sustainment gates. Commitments and fielding authority remain blank. Source: [fielding note][fielding]. |

## Rubric and return on investment

[P] Impact carries 30%; speed to Fleet and scalability each carry 20%; Barrier Removal and judges' discretion each carry 15%. Source: [[Event/Judging]]. [R] Present the observed build and offline task behavior, while keeping measured user benefit and cross-domain repetition explicitly unproven. Sources: [build report][build], [QA receipt][qa], [[Research/QA/Officer/Burden-Claim]].

[R] Proposed OSW ROI: **clarifying friction points to agile delivery**, supported by the permission experiment and independent checking. Show the task, its build evidence, remaining failures and next experiment. Sources: [[Event/Rules]], [[Submission/Disclosure]], [[Submission/Next-30-60-90]].

[build]: ../Research/Plan/Real-Build-Run1.md
[qa]: ../Research/QA/Acceptance/Results/training-acceptance-edf3150f-4563-4059-b9c0-6ecca70e64ac/result.json
[scope]: ../Research/QA/Acceptance/Results/training-acceptance-edf3150f-4563-4059-b9c0-6ecca70e64ac/payload/scope.md
[fielding]: ../Research/TaskApp/Pipeline-run1/path-to-fleet.md
[gate]: ~/.local/share/fleethacker-context/org/reports/mvp-gate.md

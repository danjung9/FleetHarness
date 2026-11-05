---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Exact use case matches and missing requirements for the three proposed FleetHarness experiments."
---

# Proof-of-concept mapping

## Bottom line

[P] The project README proposes operational-message parsing, training schedule deconfliction and an offline-first workflow as three different experiments. [A] IDs 12 and 24 are the direct parsing matches, ID 11 is the direct training-scheduler match, and IDs 36 and 44 are the clearest complete-workflow matches for offline capture and later synchronization. [A] ID 45 is a direct match for the synchronization subsystem, rather than a complete user workflow. [R] State the matched slice and its exclusions explicitly before claiming a use case is solved.

## Match standard

[A] Direct means the proposed experiment's central output matches a requested use case output. [A] Partial means it delivers a named track or essential component, while substantial requirements remain. [A] Adjacent means only a reusable technique or operating constraint overlaps. [R] Do not count adjacent cases as solved coverage. [E] Names below are exact capture names with typographic dash characters converted to colons to follow the house style; IDs are unchanged. [E] No description, requirement or resource paragraph is quoted.

## Operational-message parsing

[P] The README asks for structured tasks, events and source references from representative messages. [E] Comparing that sentence to the submitted text produces the following mapping.

| ID and submitted name | Match | What the README leaves out |
| --- | --- | --- |
| [P] 12: Electronic OPTASK (Operational Tasking) Message Parser & Timeline Visualizer | [A] Direct, high | [P] USMTF input, frequency plans, crypto changeover windows, flight-quarters times and a consolidated visual timeline. [R] Use invented communication parameters, never real keying material. |
| [P] 24: Automated Message Traffic Task & Event Extraction | [A] Direct, high | [P] Filter for specified commands, extract required correspondence and choose the coordinating command role. [P] Formatted response drafts and calendar conflict checks are optional enhancements in the submission. |
| [P] 36: Paperless Underway | [A] Partial, high for Track B intake | [P] Verify the action list, draft status updates and file records correctly. [P] Also requires offline review, audit and synchronization; Track A contains handwritten forms and correspondence. |
| [P] 34: Maritime Picture in Minutes | [A] Partial, moderate for report ingestion | [P] Correlate a full day of tracks and reporting, detect seeded anomalies, explain changes and produce an analyst-verified shift brief with claim provenance. [A] Extracting events is only its intake layer. |
| [P] 40: ANCHOR: Authoritative Naval Communications Hub for Official Records | [A] Adjacent, low | [P] Preserve official messages, validate integrity, track corrections and cancellations, manage subscriptions and acknowledgements, enforce CAC/PKI access, and assess C2OIX/NC2 integration. [A] Parsing does not establish an authoritative repository. |

[R] For a credible parsing test, use a small fixed corpus plus unseen variants, with an independent answer key for command, task, due time and evidence span. [R] Measure task recall, false assignments, correction effort and completion time, not only whether JSON is produced. [R] Include malformed messages, ambiguity, multiple recipients, cancellations and an instruction-like sentence that remains inert data. [A] A bounded local parser can run offline; a hosted extraction service cannot be assumed available when disconnected.

## Training schedule deconfliction

[P] The README asks for schedules satisfying personnel, time and resource constraints, including recognition of infeasible cases. [E] Only one captured use case directly requests a training-calendar solver.

| ID and submitted name | Match | What the README leaves out |
| --- | --- | --- |
| [P] 11: PB4T (Planning Board for Training) Autonomous Deconfliction Agent | [A] Direct, high | [P] Departmental agents negotiate, qualified roles must be available, operating windows and fatigue policy constrain drills, alternate allocations are proposed, and SFTRM periodicities must hold. [A] The specific rules and representative rosters are not provided by the README. |
| [P] 10: Physics-Informed Mooring & Tug Allocation Planning Agent | [A] Adjacent, low; optimization technique only | [P] Needs a 2D pier canvas, hydrodynamic/geometry calculations, bollard/line limits, tug horsepower and gust warnings. [A] A training solver cannot substitute for the physical model. |
| [P] 32: Know Before It Breaks the Mission | [A] Adjacent, moderate; readiness timeline inputs | [P] Must link changing parts, manning, maintenance and casualties to mission capabilities, cite risks and recommend priorities read-only. [A] Avoiding calendar collisions does not model mission consequences. |
| [P] 42: Enterprise PA-Ops Platform: Fleet-Wide Operational Planning, Media Tracking, and Decision Advantage | [A] Adjacent, low; planning deconfliction only | [P] Needs event/engagement/funding/media relationships in Flank Speed, human commitments and releases, AAR summaries and a front-end trade study. [A] It is not a training-periodicity problem. |

[R] Demonstrate one feasible week and one impossible week with invented personnel labels. [R] Show which constraints caused infeasibility and ask the human which preference may change; never relax a hard fatigue or qualification rule automatically. [R] Measure collisions, unmet required training, planning time and number of manual edits. [R] Label simplified fatigue and periodicity rules as assumptions until checked against approved sources. [A] Department-specific proposal generators could fulfill part of the multi-agent requirement, but a monolithic solver alone would leave that requirement open.

## Offline-first workflow

[P] The README promises disconnected changes and reliable synchronization after reconnect. [A] That maps most closely to workflows with durable local writes and an outbound queue; being able to read cached information alone is a weaker match.

| ID and submitted name | Match | What the README leaves out |
| --- | --- | --- |
| [P] 36: Paperless Underway | [A] Direct, high | [P] Forms/scans and tasking tracks, format validation, review before submission, audit, correct records filing and government-device/low-code fit. |
| [P] 44: Equipment Maintenance at the Edge using AI | [A] Direct, high | [P] On-device plain-language queries, encrypted work completions/readings/photos, local onboard access during EMCON, parts/workload snapshots and SAP/Navy ERP+ backend integration. |
| [P] 45: Detecting and triaging for disconnected and low data fidelity environment. | [A] Direct, high for transport subsystem | [P] Configurable aging priorities, previews, chunk resume, dependency order, idempotent acceptance, starvation prevention, delivery visibility, security and storage policy. [A] No generic sync promise proves these properties. |
| [P] 26: Restore to Mission | [A] Partial, high for queued requests and approved restoration workflow | [P] Offline fault isolation or parts/repair planning, last-synced inventory, repair alternatives, citations, read-only source connections and approval of actions/reports. |
| [P] 8: CASREP Command: Unified Casualty Report Drafting, Routing & Release | [A] Partial, moderate; offline mode is an inferred extension | [P] CASREP format/report-type validation, originator-to-CO roles, return/revise/approve flow, version history and routing status. [E] Its own submitted text does not explicitly require offline sync. |
| [P] 40: ANCHOR: Authoritative Naval Communications Hub for Official Records | [A] Partial, high for disconnected message access and acknowledgements | [P] Integrity, official preservation/version status, CAC/PKI, command/group permissions, subscription approval, escalation and retention/recovery. |
| [P] 17: Digital SUROB: AI-Assisted Surf Observation & Craft GO/NO-GO Agent | [A] Partial, high for offline capture and approved-report transfer | [P] Complete worksheet, shown MSI math and craft limits, typed/spoken entry, historical answer checks, approval and hard stop. [A] Transfer while disconnected needs a local transport or later relay, not a claim of unreachable shore delivery. |
| [P] 37: Sailor-Built to Fleet-Fielded | [A] Partial, high for offline government-mobile operation and result transfer | [P] Start from the existing app, add reviewed entry, document install/hosting/security/sustainment, and involve an authority/platform representative. |
| [P] 41: Next in Line: One-Scan AI Service Queue for Sailor Support | [A] Partial, moderate; optional low-connectivity behavior | [P] Navy M365, one QR entry, routing/document guidance, live staff queue, internal notifications and no external paid service. [A] Offline tickets alone do not deliver a live shared queue or remote notification. |

[A] The following are adjacent through a disconnected runtime or cached inputs, without making change-and-sync their central problem: 13 (passive status fusion), 14 (consequence logic), 21 (casualty procedures), 23 (oversight/triage), 32 (readiness risks), 33 (casualty/navigation guidance), 34 (watch brief), 35 (isolated defense), and 48 (non-AI decision aid). [P] IDs 32 through 37 include a common offline/audit/sync/transition requirement in the submitted text, so sync is also a required supporting feature for 32, 33, 34 and 35. [R] Do not claim these are solved by adding an outbox.

[R] Demonstrate a reviewed form saved offline, an application restart, a repeated reconnect, a lost acknowledgement and a conflict. [R] Show exactly one accepted transaction at the receiver despite retries, and preserve both sides of a conflicting edit for review. [R] Compare user-visible completion time and re-entry count to paper/manual transfer. [R] Extend with ID 45 only after basic durable save and idempotency work.

## Exhaustive coverage ledger

[E] The sets below account for all 34 captured IDs; an ID can appear under multiple experiments.

- [A] Direct match to at least one experiment: 11, 12, 24, 36, 44, 45.
- [A] Named partial match, without a direct match: 8, 17, 26, 34, 37, 40, 41.
- [A] Adjacent only: 10, 13, 14, 21, 23, 32, 33, 35, 42, 48.
- [A] No specific match beyond generic software components: 9, 15, 16, 18, 19, 20, 22, 25, 39, 43, 46. [A] For 22, the missing central problem is OCR and template population, not synchronization; a future forms implementation could add it. [A] For 43, generic record edits would not make the README an intentional requirements-lifecycle solution.

## What all three experiments leave open

[E] The README does not select a final use case ID, naval user, representative corpus, solver library, device, sync protocol or acceptance threshold. [P] It asks for human review, reproducible demos, explicit tests, honest limitations and appropriate architectures. [R] Turn those principles into per-case prohibited actions, approval roles, escalation, monitoring and stop tests. [R] Capture measured task outcomes and a 30/60/90-day transition proposal before presenting a generated application as mission value. [A] Three successful applications would support process breadth; they would not establish that the pipeline can solve all 34 cases.

## Sources

- [E] Read all 36 Markdown notes in `UseCases/`, including its index and categories, and all 34 records' submitted description, requirements and resources in `Sources/raw/events_norfolk_combined.json`, key `use_cases`, on 2026-11-04. The `theme` key was excluded. Paths are relative to `~/Documents/CDAO/Fleethacker-Vault`.
- [P] Participant proposals and capture counts: the above raw records, cross-checked against [[UseCases/README]]. A proposal describes requested behavior, not a demonstrated capability.
- [P] Project scope and three proposed experiments: `~/Documents/CDAO/FleetHarness/README.md`, read on 2026-11-04.
- [P] Constraints and scoring: [[Event/Rules]], [[Event/Judging]] and [[Research/00-Brief]].
- [P] Full URL supplied by use case 48 for its document locator: https://cdao.hackathon.maximus.com/event/norfolk/documents. Not opened; no live portal or external verification was performed.

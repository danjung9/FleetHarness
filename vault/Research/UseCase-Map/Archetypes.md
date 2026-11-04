---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Eight software families cover all 34 use cases, with distinct domain checks and reusable evidence."
---

# Software archetypes

## Bottom line

[R] Use eight families to choose software templates and acceptance tests. [E] The partition below assigns each of the 34 captured IDs once, based on reading every submitted description, requirement and resource field. [A] Shared components can reduce engineering work, but a common template cannot establish correctness in a new naval domain. [R] Start with message extraction, constraint scheduling and one reviewed offline form, then reuse their tested components.

## Classification and coverage

[A] These are engineering groupings, not the portal's challenge categories. [R] Treat the primary family as a starting architecture and add the named secondary modules only when the chosen workflow needs them.

| Family | Primary IDs | Count | Secondary components worth sharing |
| --- | --- | --- | --- |
| [A] M: Message extraction | [E] 12, 24 | [E] 2 | [R] Source spans, time normalization, human verification, task export |
| [A] W: Offline workflows and records | [E] 8, 22, 36, 40, 41, 42, 43, 44, 45 | [E] 9 | [R] Versioned records, approvals, outbox, sync status, access controls |
| [A] O: Constraints and calculation | [E] 10, 11, 17 | [E] 3 | [R] Explicit rules, deterministic engine, explanations, independent answer keys |
| [A] K: Evidence retrieval and guided response | [E] 15, 18, 20, 21, 26, 33, 34, 39, 46 | [E] 9 | [R] Indexed snapshots, applicability, citations, abstention, review |
| [A] D: State fusion and decision support | [E] 13, 14, 19, 32, 48 | [E] 5 | [R] Provenance, uncertainty, dependency models, human decision records |
| [A] G: Agent oversight | [E] 9, 16, 23 | [E] 3 | [R] Identity, policy gate, conflict arbitration, monitoring, stop |
| [A] S: Security assessment and remediation | [E] 25, 35 | [E] 2 | [R] Rule mapping, evidence, approval, verification, rollback |
| [A] F: Fielding an existing tool | [E] 37 | [E] 1 | [R] Install package, security evidence, sustainment and transition plan |

## M: Message extraction

[P] ID 12 asks for formatted operational-message fields and a timeline; ID 24 asks for command-specific tasking, events, correspondence and coordinating roles. [R] Build an input adapter, explicit extraction schema, command selector, date and time parser, source-span viewer, validation queue and export adapter. [R] Keep message identity, version, source location and uncertainty with every extracted item. [R] Require review before a task becomes accepted tasking, and leave ambiguous times unresolved.

[R] Template acceptance tests: multiple commands in one message, negative tasking, amendments, cancellations, duplicate messages, missing dates, overlapping events, day rollover and quoted text that resembles a command. [A] A constrained grammar plus reviewed fallback can be useful without a cloud model; broad free-text extraction quality remains unverified. [R] Use invented units, schedules and communication parameters, with no real crypto material or operational tasking.

## W: Offline workflows and records

[P] IDs 8, 36 and 43 emphasize routing and lifecycle history; 22 adds handwriting extraction; 40 adds authoritative-message preservation; 41 adds service queues; 42 adds event relationships; 44 adds maintenance transactions; 45 specializes in upload scheduling. [R] Reuse versioned schemas, local durable storage, a state machine, role checks, approval records, an append-only event history and a durable outbound queue. [R] Give every transaction a stable ID and visible pending, accepted, conflicted or failed status. [R] Preserve conflicting edits for human reconciliation; never silently overwrite an approval or send an unapproved draft.

[R] Required specializations: CASREP formatting and releasing roles for 8; OCR confidence and semantic mapping for 22; forms and records rules for 36; integrity, message status, subscriptions and acknowledgements for 40; notifications and staff queues for 41; parent-child SharePoint records for 42; serial numbers and multiple document exports for 43; encrypted photos, readings and backend adapters for 44; chunk resume, dependency ordering, aging priorities and storage limits for 45. [A] The latter is a transport module rather than a forms application, but shares the outbox and delivery-state foundation.

[R] Acceptance tests: disconnect before save, restart before sync, lose an acknowledgement, retry an approved transaction, edit the same record on two clients, revoke a role, and retain failed work visibly. [R] For 45, also interrupt a photo mid-chunk, sustain high-priority arrivals while checking eventual low-priority delivery, and fill local storage. [A] Eventual delivery requires eventual usable connectivity and retained data; an unconditional delivery guarantee during permanent outage is impossible.

[P] IDs 41 and 42 specify Navy M365/Flank Speed, while 40 needs CAC/PKI and communications-system integration. [A] A local substitute proves workflow logic, not those deployment requirements. [P] ID 43 describes classified source workbooks. [R] Use only wholly invented, unclassified requirements and roles under rule 4; do not open, request, derive examples from or import those workbooks.

## O: Constraints and calculation

[P] ID 11 schedules training around qualified personnel, operating windows, fatigue and periodicity; 10 evaluates mooring geometry, forces and tug choices; 17 computes a surf index and compares craft limits. [R] Reuse typed inputs with units, versioned rules, a deterministic calculation engine, constraint checks, explanations and human approval. [A] These share an engineering pattern, not a single mathematical model: scheduling, physical modeling and worksheet arithmetic require different engines.

[R] For 11, distinguish hard safety/availability constraints from preferences, show alternatives and explain infeasible cases instead of forcing a schedule. [P] Its submission asks for departmental agents. [R] Treat those as bounded proposal interfaces into one constraint checker; disclose any prototype that omits that interaction. [R] For 10, require independently checked force assumptions and limits before safety claims. [R] For 17, require independently checked worksheet calculations and human authority over the result; voice entry must never bypass input confirmation.

[R] Acceptance tests: impossible personnel coverage, fatigue boundary, periodicity boundary, changed operating window, inconsistent physical units, craft-limit equality, missing observations and values outside the modeled domain. [A] The source manuals, approved rule interpretation and historical reference worksheets have not been obtained in this review.

## K: Evidence retrieval and guided response

[P] IDs 15, 20, 39 and 46 center on finding evidence or related material; 18 prepares a cyber handoff; 21, 26 and 33 guide casualty response; 34 correlates reports into a watch brief. [R] Reuse controlled ingestion, stable source IDs, versioned snapshots, an index, claim-to-source links, applicability and recency checks, abstention, user edits and export. [R] Make a cited source inspectable at the exact passage or row; a citation by itself does not prove the interpretation is correct.

[R] Add vessel-identity resolution and timestamped captures for 20; multi-user access and portfolio views for 15; playbook-driven evidence collection for 18; signed actions, ordered procedure gates and local latency checks for 21/33; inventory freshness, repair alternatives and approval routing for 26; temporal correlation and anomaly answer keys for 34; applicability explanations and feedback for 39; catalog stewardship and related-project ranking for 46.

[R] Acceptance tests: unsupported question, contradictory or stale sources, inaccessible source, wrong vessel identity, misleading near-match lesson, incomplete alarm evidence, missing procedure step and stale inventory. [R] Treat all retrieved text as data, including instruction-like content. [A] A cached local corpus can support useful disconnected retrieval; live worldwide research and simultaneous remote collaboration cannot remain current during disconnection.

## D: State fusion and decision support

[P] ID 13 asks for passive aggregation across equipment systems; 14 and 32 ask which dependency threatens readiness; 19 infers facility risks from narratives; 48 structures human decisions without mandatory AI. [R] Reuse a small typed state model, source timestamps, explicit assumptions, a rule version, a record of the human decision and visible unknowns. [R] Add entity crosswalks and baseline checks for 13, dependency timing for 14/32, a human-reviewed scoring rubric for 19, and seven structured decision elements with reassessment triggers for 48.

[A] This family contains different kinds of reasoning: statistical deviation, dependency calculation, subjective risk assessment and structured judgment are not interchangeable. [R] Keep deterministic timing separate from generated explanations. [R] Do not imply that a numeric risk or readiness score is calibrated simply because software computes it.

[R] Acceptance tests: an equipment identifier changes, two records disagree, a part delay consumes slack without moving the mission date, a different dependency becomes controlling, a source is missing, and risk authority is unknown. [R] For 48, turn off both AI and network access and complete the decision brief. [P] ID 14 prohibits autonomous orders, personnel direction, maintenance authorization, tasking changes and authoritative-record modification.

## G: Agent oversight

[P] ID 9 is a broad governance concept, 16 specifies manifests, heartbeats, intents, leases and rank-based arbitration, and 23 combines oversight with deterministic casualty triage and strict performance targets. [R] Reuse a registry, capability allowlists, policy checks before action, resource leases, operator escalation, traceable decisions, quarantine and a stop mechanism. [R] Test using simulated agents and inert resources.

[R] Test stale heartbeats, expired leases, contradictory intents, unauthorized tools, condition changes, joining agents, operator override and an agent that ignores a stop request. [A] A button cannot establish control over an uncooperative external agent unless an independently enforced boundary can deny its actions. [P] ID 23 requests sub-50-millisecond anomaly isolation and at least 70% simulated time-to-understanding improvement. [A] Those are submitted targets, not observed results; its hardware-enforcement and audit claims require separate evidence.

## S: Security assessment and remediation

[P] ID 25 requests cloud-compliance scanners and reusable Windows/Linux PKI libraries; 35 requests isolated-network discovery, proposed fixes, approval, verification and rollback. [R] Reuse versioned rule mappings, configuration collectors, evidence-backed findings and a reviewable change plan. [R] Separate read-only assessment from any execution capability, with explicit approval and tested rollback in an isolated synthetic environment.

[R] Acceptance tests: seeded insecure configurations, false positives, conflicting policies, denied approval, failed remediation and rollback verification. [A] Synthetic fixtures can prove selected checks, but cannot prove USN approval, complete benchmark coverage or CAC interoperability. [R] Avoid making these approval-heavy deliverables the first demonstration unless the relevant environment and owner are already available.

## F: Fielding an existing tool

[P] ID 37 starts from a submitter's surf-calculation app and requires an installation/hosting path, security evidence, maintainable code and a sustainment owner. [R] Reuse an artifact inventory, reproducible package, device compatibility checklist, offline install rehearsal, security evidence index and 30/60/90-day transition plan. [A] This is a delivery workflow rather than a new application runtime.

[R] Acceptance evidence should include a clean-device installation rehearsal, offline operation, approved-result transfer, named owner role and a documented authorization discussion. [P] The submission requires an authorizing-official or hosting-platform representative. [A] Their availability and access to the existing app are not verified; generating a checklist alone would not satisfy the case.

## Boundaries shared by every template

[R] Start each generated specification with user, burden, input policy, action authority, prohibited actions, approval point, monitoring, escalation, stop behavior and acceptance evidence. [R] Give a naval officer a short path: load the approved example, inspect the proposed result beside its evidence, correct it, approve a bounded outcome and see its saved or queued status. [R] Treat stop as cancelling further automated work while preserving the audit record and unsent user work. [R] Never hide deployment dependencies behind a successful local demonstration.

## Sources

- [E] Read all 36 Markdown notes in `UseCases/`, including its index and categories, and all 34 records' submitted description, requirements and resources in `Sources/raw/events_norfolk_combined.json`, key `use_cases`, on 2026-11-04. The `theme` key was excluded. Paths are relative to `~/Documents/CDAO/Fleethacker-Vault`.
- [P] Participant proposals and capture counts: the above raw records, cross-checked against [[UseCases/README]]. A proposal describes requested behavior, not a demonstrated capability.
- [P] Project scope and three proposed experiments: `~/Documents/CDAO/FleetHarness/README.md`, read on 2026-11-04.
- [P] Constraints and scoring: [[Event/Rules]], [[Event/Judging]] and [[Research/00-Brief]].
- [P] Full URL supplied by use case 48 for its document locator: https://cdao.hackathon.maximus.com/event/norfolk/documents. Not opened; no live portal or external verification was performed.

# Intake scope: Sailor-Built to Fleet-Fielded

## Basis and phase boundary

This intake records the source challenge and a bounded prototype outcome; it does not perform research, design an implementation, or verify an application. Sources: unchanged `requirements.md`, `.fleet/packet.json` (schema 1, challenge 37, detail snapshot captured 2026-11-04), `.fleet/README.md`, `.fleet/quality-contract.md`, and the assigned `.fleet/skills/fleet-intake/SKILL.md`.

Source URL: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/37. The packet's `challenge` describes the source interpretation. Its `userScope` repeats the full challenge and six evaluation criteria; it does not supply a narrower app or authorize operational access. The recipe, “Transition and reproducible delivery” (`fielding`), is an engineering recommendation, not an event requirement. No candidate components or tools are listed in this recipe. No external sources were retrieved.

## Audience, primary task and scope

The audience is a Sailor tool builder and transition coordinator preparing evidence for command, hosting, authorization and sustainment reviewers. Beachmaster operators remain the intended users of the eventual operational application.

The source task is to take an owner-supplied working tool from laptop to fleet use: add AI-assisted spoken or typed observation entry, Beachmaster approval and logging, transfer approved results over a disconnected network, and prepare a fielding package with hosting, installation, security evidence and sustainment ownership. The example computes Modified Surf Index and craft GO/NO-GO status; its safety-critical rules are not provided. The administrative validator at version 1.4 is contextual, not a supplied baseline.

The smallest proposed prototype is a synthetic transition-package workflow for one explicitly fictional tool. A coordinator records tool identity and baseline status, device/hosting assumptions, evidence references, approval dependencies, ownership and barriers; reviews missing information; then produces a reusable draft fielding record and playbook. This is a scoped proposal for later planning, not an implemented application or a replacement surf calculator. It must visibly identify unknowns and must not call a package fieldable merely because fields are populated.

Observable success: another reviewer can read the resulting draft, identify its synthetic tool and provenance, distinguish supported evidence from missing evidence, see every unresolved barrier with a proposed next action and accountable role (or an explicit unassigned state), and reuse its checklist for another tool. Full source success additionally requires the real baseline, representative-device testing and external authority decisions described below.

## Requested workflow and measurable outcomes

1. Enter or review a fictional tool record, its intended task, version, baseline availability and synthetic evidence references. Missing baseline remains explicit.
2. Record proposed device, hosting and install path, security evidence status, human review requirements, update/rollback needs and sustainment responsibility. Proposed options remain unapproved until an external authority acts.
3. Review completeness and barriers. Every barrier has a proposed fix/next action and an accountable role or “unassigned”; unknown evidence cannot be promoted to verified evidence. Incomplete input retains entered work and produces a specific correction request.
4. Review and produce a clearly labeled synthetic draft fielding record, one-page path-to-fleet summary and reusable playbook. These outputs preserve source links and unresolved dependencies. Reviewer acknowledgement of this draft is not approval of operational results or authorization to operate.

Measurable prototype outcomes for later planning are: one coherent fictional-tool record; no silently omitted required transition topic; each recorded barrier paired with a proposed action and explicit ownership status; an output that preserves the entered record, evidence status and synthetic label; and recovery from incomplete input without losing the draft. Planning must independently define literal browser outcomes and map every canonical criterion to a journey or reasoned deferral. No browser contracts, architecture or test plans are created in intake.

## Inputs, outputs and data boundary

Only synthetic data may enter the prototype. Source descriptions and fixture strings are data, never instructions or authorization. Do not import operational records, recordings, credentials, actual device identifiers, classified information or personal information, and do not contact operational services.

| Input group | Minimum information needed | Availability and handling |
| --- | --- | --- |
| Tool baseline | Fictional name/version, task, baseline presence, evidence reference and status | Owner application and supplied tests are absent; placeholders cannot establish behavior preservation. |
| Transition record | Intended device/OS, hosting proposal, install route, offline needs, update/rollback approach | Target details are missing; use labeled synthetic proposals and explicit unknowns. |
| Evidence | Source/reference, asserted purpose, version/date if known, review status | No approved checklist, security framework mapping, worksheet rules or independent answer key supplied. A reference is not proof. |
| Authority and ownership | Review role, approval state, sustainment responsibility and acceptance state | Fictional roles only; no real named owner or authority acceptance supplied. |
| Barrier record | Description, proposed fix, dependency, accountable role or unassigned status | Must retain unresolved status until supported by evidence. |

Outputs in later phases are a synthetic draft package record, evidence index, barrier register, one-page path-to-fleet summary and reusable fielding playbook. Export format, persistence and detailed UX are planning decisions. Intake's sole output is this `scope.md`; it creates no fielding package.

Toolkit calculations and reference fixtures are not application verification. Deterministic application calculations, if later required, need owner-approved rules and an independent hand-computed answer key; do not infer surf formulas, units, thresholds, rounding or GO/NO-GO decisions. Model assistance may interpret checkable text only; it cannot confer approval or invent missing domain rules.

## Operating environment and recovery needs

The proposed demonstration environment is a local browser on desktop and narrow viewports, with synthetic input and no operational integrations. Device OS, browser support, first-install procedure, hosting and actual offline behavior remain unresolved. A responsive browser demonstration cannot establish installation on a government mobile device or representative-device offline operation.

The eventual workflow needs clear empty, loading, error and success states; labeled keyboard-accessible controls; preservation of entered information after validation failure; visible local persistence limitations; and recovery from interrupted export or missing evidence without claiming success. Update failure, rollback, disconnected transport, reconnection conflict handling and audit integrity belong to the owner application and must remain explicit gaps until specified and exercised. No real synchronization protocol is assumed.

## Authority, exclusions and unknowns

Human reviewers retain authority over every operational result. The command's accountable operator/Beachmaster approval, authorizing-official security judgement, hosting approval, signing authority, device installation permission and sustainment acceptance are separate external decisions. Packaging grants none of them. Beachmaster Unit TWO and its chain of command are only the source's unconfirmed owner hypothesis.

Excluded from the bounded prototype: modifying or packaging an absent owner app; surf calculation or craft decision generation; real AI speech entry; operational approval and audit claims; disconnected-network transport or reconnection synchronization; government-device installation; deployment, publishing, signing, authorization submission and security certification. Open-code maintainability and a reusable draft playbook can be pursued later, but no full source requirement is satisfied at intake.

Outstanding owner questions and dependencies:

- Supply the application, version/license, reproducible build/install instructions, baseline tests and SME; identify the actual tool to transition. Without these FLD-02 and real packaging cannot be assessed.
- Supply authoritative surf worksheet rules, units, thresholds, rounding, craft applicability and independently hand-computed expected answers if the Beachmaster app is selected.
- Identify representative device/OS/browser, permitted installation route, offline lifecycle, supported hosting choices and the hosting representative. Government device access is not implied.
- Identify the authorizing-official representative, applicable process/control evidence, approved fielding checklist and evidence acceptance procedure. Do not invent a framework mapping.
- Confirm accountable transition, hosting, authorization, signing, update and sustainment owners, with actual acceptance of responsibility; no fictitious name can satisfy this.
- Define approval identity, allowed observation inputs, logging retention/integrity, disconnected network, replay/conflict rules and reconnection behavior for the real application.
- Confirm package contents, operational test conditions, rollback/support expectations and playbook acceptance. Resolve external approvals outside this workspace; no credentials are requested here.

The source's 30/60/90/180-day hosting decision, authorization submission, field-test and wider-release milestones are hypotheses, not commitments or evidence. Named owners and approved dates remain unknown.

## Canonical acceptance and provenance register

All 16 canonical packet IDs follow. The source URL above applies to challenge requirements, evaluations and deliverables. Recipe entries are distinguished from event requirements. User criteria USER37-1 through USER37-6 are aliases merged into EVAL37-1 through EVAL37-6, not extra canonical criteria. No criterion has been verified or implemented in intake. “Deferred” below means the full source outcome lies beyond the bounded synthetic prototype; planning must preserve it even if a partial slice is demonstrated.

| Canonical ID | Requirement (packet wording) | Provenance | Intake boundary and evidence still required |
| --- | --- | --- | --- |
| UC37-1 | Offline; government mobile devices | requirement `UC37-1` at `challenge.requirements[0]` | Deferred: actual government-device installation and offline execution require the intended device and permitted path; local synthetic use is only a slice. |
| UC37-2 | Human approval of every result | requirement `UC37-2` at `challenge.requirements[1]` | Deferred for operational results: real app and approval identity/workflow are absent; draft package review is not Beachmaster result approval. |
| UC37-3 | Security evidence aligned to the authorization process | requirement `UC37-3` at `challenge.requirements[2]` | Deferred: a draft evidence index can expose gaps; process alignment and acceptance require the authorizing authority. |
| UC37-4 | Open, maintainable code | requirement `UC37-4` at `challenge.requirements[3]` | Candidate prototype outcome: readable, maintainable source and reproducible instructions can later be assessed; no implementation exists at intake and real baseline license is unknown. |
| UC37-5 | Fleet-Ready Definition of Done (all solutions): runs offline; keeps humans in authority; cites sources; logs auditable actions; syncs on reconnect; includes a one-page path to fleet. | requirement `UC37-5` at `challenge.requirements[4]` | Deferred as a whole: draft source references, action records and path-to-fleet can be scoped; real offline behavior, human authority, auditable logging and reconnection sync remain unverified. |
| FLD-01 | Reproduce installation on the intended device. | recipe `FLD-01` at `recipe.acceptance[0]` | Deferred: a second operator must actually install the supplied package on the intended device and complete the offline demo. |
| FLD-02 | Preserve baseline behavior. | recipe `FLD-02` at `recipe.acceptance[1]` | Deferred: owner-supplied application and its tests must run before and after packaging; toolkit tests cannot substitute. |
| FLD-03 | Name accountable transition owners and unresolved approvals. | recipe `FLD-03` at `recipe.acceptance[2]` | Deferred: prototype may list roles and unresolved approvals, but real accountable owners and owner review are missing. |
| EVAL37-1 | Calculations verified against a hand-computed answer key | evaluation `EVAL37-1` at `challenge.evaluationCriteria[0]`; user `USER37-1` at `userScope.criteria[0]` | Deferred: need authoritative rules, independent hand-computed answers and tests of the actual owner application. |
| EVAL37-2 | Working offline on a representative device | evaluation `EVAL37-2` at `challenge.evaluationCriteria[1]`; user `USER37-2` at `userScope.criteria[1]` | Deferred: representative device and offline test evidence are missing; browser width checks are insufficient. |
| EVAL37-3 | Fielding package completeness, judged by the authorizing-official representative | evaluation `EVAL37-3` at `challenge.evaluationCriteria[2]`; user `USER37-3` at `userScope.criteria[2]` | Deferred: synthetic package completeness is not an authorizing-official judgement; representative review is required. |
| EVAL37-4 | Named sustainment owner | evaluation `EVAL37-4` at `challenge.evaluationCriteria[3]`; user `USER37-4` at `userScope.criteria[3]` | Deferred: sustainment owner must be genuinely named and accept responsibility; a synthetic role does not qualify. |
| EVAL37-5 | Remaining barriers documented with a proposed fix for each | evaluation `EVAL37-5` at `challenge.evaluationCriteria[4]`; user `USER37-5` at `userScope.criteria[4]` | Candidate prototype outcome: document each known barrier with a proposed fix, retaining unknowns and distinguishing proposals from resolved barriers. |
| EVAL37-6 | Official judging rubric: Warfighting 30%; Speed to Fleet 20%; Scalability 20%; Barrier Removal 15%; Judges' Discretion 15%. | evaluation `EVAL37-6` at `challenge.evaluationCriteria[5]`; user `USER37-6` at `userScope.criteria[5]` | External evaluation: preserve the exact weights; no self-awarded score or inferred judging success. Judges must assess actual evidence. |
| DELIVERABLE37-1 | A fieldable package for at least one Sailor-built tool | deliverable `DELIVERABLE37-1` at `challenge.expectedDeliverables.lines[0]` | Deferred: draft synthetic package only; a fieldable package requires the actual tool, evidence, supported install path and relevant external decisions. |
| DELIVERABLE37-2 | A reusable fielding playbook for the next one | deliverable `DELIVERABLE37-2` at `challenge.expectedDeliverables.lines[1]` | Candidate prototype outcome: reusable draft playbook with evidence requirements, review checkpoints and explicit limitations; real reuse remains unverified. |

## Intake completion record

The primary task, full source intent, scoped synthetic workflow, inputs and outputs, all source/evaluation/deliverable/user criteria, recipe criteria, authority boundaries and unanswered owner questions are recorded. This is requirements intake only. Research, formal acceptance dispositions/journeys, architecture, implementation and verification remain for their assigned phases. Deferred outcomes prevent a claim that all source requirements are met.

---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Verdict, reading guide, evidence limits and local research handoff for all 34 use cases."
---

# Use case council notes

## Bottom line

[R] Prove a repeatable build process with ID 24, ID 11 and one narrow ID 36 workflow, if all three can be completed and tested. [A] Those choices best align the README's three experiments with clearly bounded officer-facing results. [R] Use eight software families to reuse components and tests while keeping each domain's acceptance checks distinct. [R] Keep synthetic demonstration, verified integration and operational validation as separate claims, and defer ID 43's classified-source problem under rule 4.

## Notes

| Note | Purpose |
| --- | --- |
| [[Research/UseCase-Map/Archetypes]] | [E] Eight primary engineering families, a complete ID partition, reusable components, domain-specific requirements and acceptance tests. |
| [[Research/UseCase-Map/Matrix]] | [E] Exactly 34 rows, including user, data, safe-demo sufficiency, disconnected utility, estimated build difficulty, captured team counts and all five judging estimates. |
| [[Research/UseCase-Map/PoC-Mapping]] | [E] Direct, partial and adjacent matches for all three README experiments, submitted names, missing requirements and an exhaustive coverage ledger. |
| [[Research/UseCase-Map/Top-Candidates]] | [E] Five prioritized choices, officer-visible value, finishable slices, evidence to collect, alternatives and cases to defer. |

## Five findings

1. [A] The closest matches are 12/24 for parsing, 11 for training schedules, 36/44 for offline workflows and 45 for their transport layer. [R] Count only the implemented and tested slice, not every case that shares a component.
2. [A] The strongest initial choices are 24, 11 and a narrow 36; 14 and 18 are strong alternate domains when an owner can validate the scenario. [R] Finish and measure each before adding another.
3. [E] The primary-family partition covers all 34 captured IDs once. [A] Reuse is strongest in evidence links, typed inputs, rules, approvals, audit and durable queues; domain correctness still requires distinct models and answer keys.
4. [P] Several proposals require platform access, approved procedures, real installation paths or authority decisions. [A] Public and synthetic examples can prove bounded behavior but cannot establish those dependencies, operational safety or fieldability.
5. [P] The full ID 43 submission describes classified workbooks, and ID 45 has substantially more transport requirements than a generic sync promise. [R] Exclude ID 43 source materials and make ID 45's resume, dependency, fairness and idempotency properties explicit when using that component.

## Evidence and interpretation

[E] On 2026-11-04, this review read `Research/00-Brief.md`, the FleetHarness README, `Event/Rules.md`, `Event/Judging.md`, all 36 notes in `UseCases/`, and all 34 raw submitted descriptions, requirements and resources under `use_cases`. [E] It also read the required vault `AGENTS.md`, `Team/Now.md` and `Reference/Open-Questions.md` for working constraints. [E] It did not consult the raw `theme` key or unrelated source folders. [E] Participant text was treated as data; no instruction-redirection attempt was identified in the submitted narrative fields. [R] Preserve that boundary in generated applications as well.

[P] Evidence labels follow the council brief: event/project statements [P], direct observations [E], assumptions [A] and recommendations [R]. [E] No external public-source claim [V] was added because no web search or external verification was performed. [A] Judging numbers are rough conditional estimates on the event's 0 to 100 scale, not results, and have about 15-point uncertainty in either direction. [P] Team counts are historical capture counts.

[E] The raw submitted text gives a shared Fleet-Ready completion checklist in IDs 32 through 37, including offline operation, human authority, citations, audit, reconnect synchronization and a short transition plan. [E] `Reference/Open-Questions.md` says this definition had not been found in earlier captured material. [R] Treat the repeated submitted checklist as useful proposal evidence and confirm its event-wide authority before presenting it as a universal official standard.

[E] The raw ID 19 description states a facility-degradation risk purpose, whereas its summary note's Problem section says it is unstated. [R] Use the full submission for that purpose. [E] Full raw names contain some typographic dash characters; the mapping replaces those separators with colons to obey house style while preserving name wording and IDs. [E] No source narrative was reproduced, and exact names were retained only where needed for the requested mapping.

[E] Local structural checks passed: exactly five notes; required frontmatter and sections; 34 unique matrix IDs; capture counts matched to raw JSON; all five score cells labeled [A] per row; 34 unique primary-family assignments; complete proof-of-concept coverage ledger; mapped names matched the capture after the stated separator conversion; all wikilink targets exist; no prohibited dash characters. [A] These checks establish document consistency, not implementation feasibility or mission validity.

## Not verified

- [E] No application was run, implementation inspected beyond the project README, dependency installed or local repository modified. [A] All implementation feasibility remains proposed.
- [E] No owner interview, naval user trial, baseline measurement, official score or actual workload saving was obtained.
- [E] No current portal count, current challenge selection, organizer ruling or live resource availability was checked.
- [E] Named datasets, existing apps, response playbooks, the DSG file, public-domain availability of technical doctrine, fatigue/periodicity interpretations and historical worksheets were not obtained or independently validated.
- [E] Navy M365, NotebookLM, Legion, CAC/PKI, C2OIX/NC2, SAP/Navy ERP+, JLLIS and government-device installation paths were not accessed or tested. [A] Resource listings and participant platform claims do not establish access or approval.
- [E] No proposed performance target, cryptographic integrity claim, hardware-enforced authority, safety boundary or fielding timeline was tested.

## Session, tooling and handoff record

[E] Work completed in this folder: five draft research notes, one 34-row assessment, a complete eight-family partition, three-experiment mapping and a five-candidate shortlist. [E] Methods used: local shell reads, Python 3 standard-library JSON parsing, structured comparison of submitted text and local Markdown writing. [E] No web search, package installation, project code execution, outbound messaging, commit or push was performed. [E] Prior work used: the captured use case summaries/raw submissions, the existing project README and existing event/context notes; no application implementation is claimed as new work here.

[E] Friction observed: source summaries omit several acceptance requirements; one summary omits a purpose present in the raw record; deployment assets and owner access are not verified; safe synthetic examples do not validate real workflows; ID 43's actual source context is excluded by rule 4. [R] Track each selected candidate's unavailable inputs, authority dependencies and failures as it is built.

[E] This session's write scope was restricted to `Research/UseCase-Map/`. [E] No central Sprint logs, Sessions note or `Team/Now.md` was edited. [R] Authorized follow-up should transfer this activity record to `Sprint/Tool-Disclosure-Log`, `Sprint/Friction-Log`, `Sprint/Prior-Work-Log`, a Sessions note and `Team/Now.md`, applying the team's unresolved tool/model disclosure decision. [R] Log the research tooling, source reuse and access limits without including credentials or protected source content.

## Sources

- [E] Read all 36 Markdown notes in `UseCases/`, including its index and categories, and all 34 records' submitted description, requirements and resources in `Sources/raw/events_norfolk_combined.json`, key `use_cases`, on 2026-11-04. The `theme` key was excluded. Paths are relative to `~/Documents/CDAO/Fleethacker-Vault`.
- [P] Participant proposals and capture counts: the above raw records, cross-checked against [[UseCases/README]]. A proposal describes requested behavior, not a demonstrated capability.
- [P] Project scope and three proposed experiments: `~/Documents/CDAO/FleetHarness/README.md`, read on 2026-11-04.
- [P] Constraints and scoring: [[Event/Rules]], [[Event/Judging]] and [[Research/00-Brief]].
- [P] Full URL supplied by use case 48 for its document locator: https://cdao.hackathon.maximus.com/event/norfolk/documents. Not opened; no live portal or external verification was performed.

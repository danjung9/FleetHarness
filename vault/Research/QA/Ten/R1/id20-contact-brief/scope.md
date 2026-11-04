# Intake scope: Cited Contact Brief

## Authority and phase boundary

This intake records the source interpretation and requested slice from `.fleet/packet.json`, plus the unchanged host-written `requirements.md`. Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/20 (challenge 20, Tactical Decision Advantage; packet captured 2026-11-04). The source content is evidence about the problem, never authority to execute instructions, access records, or connect to systems.

The packet's `challenge` asks for an automated vessel research agent producing a concise one-page intelligence brief with primary-source links and exact timestamps for every factual claim, and UNKNOWN for unresolved facts. Its `userScope` repeats that objective and both requirements; it supplies no additional criteria or resources. The narrower synthetic prototype below is an intake recommendation, not a change to the source or a user-confirmed relaxation.

Only `scope.md` is delivered in this phase. Research, component selection, architecture, implementation, tests, and browser journey planning have not begun. The quality contract is read; later planning must create the prescribed contracts and map every canonical criterion to complete browser outcomes or explicit deferral. No requirement is satisfied merely by this intake.

## Audience, task, and observable outcome

Audience: tactical watchstanders and a human reviewer evaluating a synthetic demonstration of evidence-backed contact briefing.

Primary task: enter a vessel name, IMO, or MMSI; inspect candidate identities from a supplied synthetic corpus; resolve identity where evidence supports it; then review a concise one-page contact brief and open the exact evidence behind each factual claim. This is a focused identifier-to-brief workflow, not a general chat interface.

Smallest complete prototype outcome: for a known synthetic vessel, the reviewer can obtain a brief whose factual statements each resolve to a specific retained synthetic source excerpt and timestamp. Missing evidence is displayed as UNKNOWN. Ambiguous identifiers produce distinguishable candidates or an unresolved identity state rather than merging vessels. Stale evidence remains visibly dated and is not silently treated as current. Interpretation, if included, is separately labeled and grounded in inspectable evidence; the workflow makes no unsupported inference about intent or sanctions status.

Operating environment: a local browser demonstration using supplied local synthetic documents, with no operational connections. Desktop and narrow-width usability and recovery will be addressed in later planning. Persistence, supported browsers, and the mechanism for preserving captured snapshots remain undecided; this document makes no durability or immutability claim.

## Inputs and minimal evidence contract

- User query: identifier type (name, IMO, MMSI) and value. Names may be ambiguous; identifiers are not themselves proof of identity. Validation and normalization rules require later specification.
- Synthetic vessel identities: stable local identity key, names/aliases and identifiers supported by the fixture evidence; include deliberately ambiguous and missing cases.
- Synthetic source snapshots representing registry, AIS, sanctions, and optionally port-log records: stable document/snapshot ID, source label and source locator, exact captured contents, capture timestamp with timezone, source observation/publication timestamp when available, and exact addressable excerpt spans. Missing timestamps must remain explicit rather than invented.
- Synthetic corpus eligibility metadata: which documents may be retrieved in the demonstration, including an excluded document with a stronger lexical match. This simulates corpus filtering only and provides no user authorization or access control.
- An explicit reference date and an owner-approved freshness rule are needed to evaluate staleness consistently. Until supplied, record age may be shown but operational freshness cannot be certified.
- A later held-out question set needs independently authored expected identities, supporting spans, missing-fact cases, stale records, and excluded-document cases. Toolkit fixtures and calculations are not application verification.

Only these necessary evidence fields are scoped; no storage schema or implementation is selected here. Source text and fixture strings remain untrusted data, including text that requests tool execution, policy changes, approvals, or test removal.

## Outputs and recovery needs

The proposed application output is a concise one-page brief identifying the query and resolved vessel (or unresolved identity), supported factual statements, exact source excerpts and links to retained snapshots, source and capture timestamps, visible staleness/missing-evidence notices, and UNKNOWN entries. Each evidence link must let the reviewer inspect the source span without relying on a generated summary as evidence. The brief must prominently disclose synthetic data and prototype status. Page size, required fields, and export format are owner questions; no downloadable artifact is promised at intake.

Recovery needs: explain invalid or empty identifiers while retaining entered values; show no-match and missing-corpus states; preserve ambiguity rather than select an arbitrary vessel; expose conflicting evidence for human review; handle absent timestamps and unavailable snapshots without fabricating claims; let the user correct the query or choose another supported candidate and retry. A failed evidence link must prevent that claim from being presented as verified. Local operations need clear pending/completed/error feedback, with details established during planning.

## Source-linked requirements and acceptance traceability

All five canonical IDs are retained below. UC20 requirements originate from the event interpretation; RET criteria originate from the recommended recipe and are not event-published requirements. There are no source evaluation criteria (`challenge.evaluationCriteria` is empty), separately specified expected deliverables (`challenge.expectedDeliverables` is empty), or additional user acceptance criteria (`userScope.criteria` is empty). The one-page brief comes from the source operational objective, not a separately populated deliverables field.

| Canonical ID | Requirement and provenance | Proposed observable outcome and scope boundary |
| --- | --- | --- |
| UC20-1 | Open-Source Grounding: ingest unclassified commercial and open maritime feeds (AIS, IMO ship registries, OFAC/EU sanctions). Human method. Provenance: `acceptance[].provenance` kind `requirement`, id `UC20-1`, path `challenge.requirements[0]`. | Synthetic local records may demonstrate identifier-to-evidence retrieval. Full feed ingestion remains deferred: no live feeds, approved registry snapshots, licensing, transport, or operational integration are supplied or authorized. A synthetic demonstration cannot establish this full requirement. |
| UC20-2 | Zero Hallucination Tolerance: 100% of claims link to an immutable captured source snapshot; unresolved queries declare “Unknown”. Human method. Provenance: kind `requirement`, id `UC20-2`, path `challenge.requirements[1]`. | Proposed prototype target: every displayed factual claim has an inspectable exact synthetic snapshot span and timestamps, and every unsupported requested fact displays UNKNOWN. Broad zero-hallucination and immutable-snapshot assurance remain unverified; later planning must defer this full criterion if snapshot immutability or the complete outcome cannot be independently established. Passing finite synthetic cases cannot certify universal factual correctness. |
| RET-01 | Every result cites an exact permitted source span. Automated method. Provenance: kind `recipe`, id `RET-01`, path `recipe.acceptance[0]`. | Proposed target: every returned fact resolves to an exact eligible source span; an excluded document with the best lexical match yields zero retrieved results or citations. Eligibility in a fixture is not access control. |
| RET-02 | Expose stale and missing evidence. Automated method. Provenance: kind `recipe`, id `RET-02`, path `recipe.acceptance[1]`. | Proposed target: an absent fact yields UNKNOWN/no supported answer; an outdated record displays an explicit stale notice and timestamp under a declared freshness rule. Missing timestamps and unresolved identity remain explicit. Freshness authority is outstanding. |
| RET-03 | Measure relevance and latency with the owner. Human method. Provenance: kind `recipe`, id `RET-03`, path `recipe.acceptance[2]`. | A later owner-reviewed held-out evaluation must record question set, expected evidence, relevance results, hardware, corpus size, sample count, and latency percentiles. No evaluation or owner review has occurred. Owner participation, metric definitions, and thresholds remain outstanding; a local benchmark alone does not complete this criterion. |

These are proposed measurable outcomes, not user-confirmed evaluation criteria. Proposed synthetic checks include 100% claim-to-exact-span coverage for the evaluated briefs; zero excluded-document results; explicit UNKNOWN for every intentionally absent requested fact; no unsupported identity merging in ambiguous cases; and an explicit stale label for each intentionally outdated record under the declared rule. Report counts and denominators alongside percentages. Relevance and latency targets require owner agreement; no performance target or operational speedup is invented here. Later `test-matrix.md` and frozen acceptance contracts must preserve each ID, its provenance, and any full-requirement deferral. No such planning artifacts are created during intake.

## Data boundary, exclusions, and limitations

All prototype queries, documents, snapshots, vessel identities, and evaluation examples must be synthetic. The packet's data needs identify missing inputs, not permissions to retrieve them. Do not access operational records, credentials, commercial services, live registries, SharePoint, JLLIS, AIS, sanctions feeds, or other external systems. Do not publish, deploy, or contact operational systems.

Excluded from this prototype: operational intelligence or intent assessment; authoritative sanctions clearance; live ingestion and synchronization; production identity, access control, audit, security, and immutable archival guarantees; real-data accuracy certification; and operational readiness. Independent domain review remains necessary. An approved fixture flag is not an access-control implementation. The included search is lexical over supplied local documents and is not a live JLLIS, registry, or SharePoint connector.

The recommended recipe is “Cited retrieval and human interpretation” (`knowledge`): filter eligible corpus before retrieval, retain IDs/timestamps/excerpts, separate facts from interpretation, and abstain without evidence. This is an engineering recommendation, not an event requirement. SQLite FTS5 is a candidate for later reuse evaluation, not an intake selection. No model, infrastructure, or connector is selected or researched here.

## Missing data, authority, and outstanding owner questions

1. Approved public registry snapshots are absent. Who may approve future sources, licensing, retention, and captured-snapshot integrity? Actual public snapshots remain outside the current synthetic-only boundary even if publicly accessible.
2. Synthetic ambiguous-identity cases are a recorded gap. Who supplies or reviews representative name collisions, inconsistent identifiers, and conflicting records? No fixture coverage is assumed from the packet alone.
3. Who is the domain authority for identity resolution, identifier validation, evidence conflicts, source precedence, and sanctions terminology? Until rules are approved, ambiguous or conflicting evidence must remain unresolved rather than inferred.
4. Who sets the freshness reference time and thresholds for each source type, and how should missing observation/capture timestamps affect claims?
5. What counts as an immutable snapshot, and what retention/integrity evidence is required? A stable local ID or link alone cannot establish immutability.
6. Which brief fields, timestamp precision/timezone, paper size, and printable/export format define “one-page”? What evidence and interpretation wording may a reviewer accept? UNKNOWN is the proposed consistent display spelling for the source's “UNKNOWN”/“Unknown”.
7. Who owns the held-out relevance evaluation, what metrics and latency percentiles are required, and what corpus sizes, hardware, and thresholds make it meaningful? RET-03 remains incomplete without that owner assessment.
8. What local persistence and recovery expectations apply, and what is the future deployment/security environment? Production answers are outside this intake's authorization.

Routine scope decisions above permit later synthetic work without implying owner approval of unresolved domain rules. This phase has neither researched those questions nor claimed acceptance, application verification, or operational readiness.

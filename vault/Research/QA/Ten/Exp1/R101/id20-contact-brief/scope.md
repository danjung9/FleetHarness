# Cited Contact Brief, intake scope

Primary deferrals: **UC20-1, external real-data portion only**. The complete synthetic workflow remains in scope. No work has been implemented or verified during intake.

| Canonical ID | Allowed basis | Concrete dependency | Impact | Synthetic workflow still required |
| --- | --- | --- | --- | --- |
| UC20-1 | real-data | Approved, legitimately supplied AIS, IMO ship-registry and OFAC/EU sanctions snapshots, with provenance and permitted usage, are absent; this workspace is synthetic-only. Live ingestion additionally needs authorized real-system connectors outside this run. | Real open-source grounding cannot be established. This criterion remains externally incomplete even if the prototype passes. | Ingest fictional snapshots representing every named source family, resolve a supplied Name/IMO/MMSI, retrieve exact permitted spans, and produce the complete cited one-page intelligence brief. |

Other external dependency: **RET-03** has recipe-only provenance. Synthetic relevance and latency evaluation is in scope; evaluation **with the owner** requires a person's participation (human-authority dependency), which cannot be simulated or claimed. Record measurements for later owner review; owner acceptance remains unverified. No primary deferral is based on missing specifications or experts. Later phase documents must carry these limitations and the UC20-1 deferral forward, preserving its canonical ID, basis, dependency, impact and demonstrated synthetic workflow.

## Source and requested slice

Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/20, challenge 20, “Cited Contact Brief, Evidence-Backed Intelligence on Contacts of Interest,” category Tactical Decision Advantage. The local packet records a detail-page interpretation captured on 2026-11-04; no live source was fetched during intake.

`packet.json.challenge` describes the source challenge: an automated research agent takes a vessel identifier and produces a concise one-page intelligence brief grounded in primary-source snapshots, declaring UNKNOWN for unsupported facts. `packet.json.userScope` repeats that workflow and its two requirements without narrowing it. Host-written `requirements.md` adds synthetic-only use and independent domain review for operational readiness; it remains unchanged.

The recommended recipe is “Cited retrieval and human interpretation.” It is an engineering recommendation, not an event requirement. Its approach is corpus filtering before retrieval, exact source spans and timestamps, separate facts and interpretation, and abstention. SQLite FTS5 is a candidate to examine in research, not a selected architecture. No research, implementation plan, application, or verification is produced in this phase.

## Audience, task and observable outcome

Audience: tactical watchstanders and analysts reviewing contacts of interest, represented by synthetic demonstration users. Primary task: enter a vessel Name, IMO or MMSI; resolve identity; examine registry, AIS, sanctions and port-log evidence; obtain and review a concise cited contact brief.

Success for the prototype means a reviewer can trace every asserted vessel fact in a one-page intelligence brief to an exact permitted immutable local snapshot span and its timestamps. Ambiguous identity is surfaced before vessel-specific assertions are combined. Unsupported fields visibly say **UNKNOWN**; old evidence carries a visible stale label. A same-name vessel or name-only sanctions hit must not become a confirmed identity or sanctions designation. The output supports human interpretation without claiming intent, clearance, operational approval or authoritative sanctions screening.

## Complete synthetic workflow

1. Load supplied local synthetic snapshots representing AIS observations, an IMO ship registry, OFAC and EU sanctions records, and port logs. Validate required metadata and span references. Mark every record and output as synthetic. Exclude nonpermitted records before matching or retrieval.
2. Accept a Name, IMO or MMSI and normalize formatting. Reject invalid identifier input with a specific correction message while preserving the draft. Use explicit identifier joins and deterministic name matching, not inferred vessel identity.
3. Show candidate vessels and supporting identity evidence. For a unique exact identifier, present the match; for duplicate names or conflicting identifiers, require a deliberate candidate selection or report unresolved identity. Do not merge evidence from different vessels. Candidate selection is a local demonstration action, not real identity certification.
4. Retrieve evidence for registry particulars, latest supported AIS observation, port calls and sanctions matches. Preserve exact source excerpts and distinguish observation time from capture time. Show conflicts, stale records, excluded evidence and absent evidence without fabricating a resolution. Excluded document contents must not leak into results or exports.
5. Assemble the named **Cited Contact Brief**, a concise one-page intelligence brief with supplied identifier, identity-resolution status, registry particulars, last supported AIS observation, port history, sanctions evidence/status, evidence gaps, and a separately labeled human interpretation section. Every factual assertion requires a citation; interpretation must reference its evidence and express uncertainty. Never infer intent from AIS or port history. Unsupported facts and unresolved sanctions status are UNKNOWN, not a clean bill of health.
6. Let the reviewer open a citation to the captured snapshot, exact excerpt, span locator and timestamps; retain the captured bytes and digest so later change is detectable. A changed snapshot invalidates its citation until corrected. Export the brief with its evidence references and synthetic disclaimer. Keep the brief concise; the evidence appendix may be separate.
7. Demonstrate recovery from invalid input, no matches, same-name ambiguity, missing or stale evidence, malformed records, and snapshot integrity failures. Preserve usable inputs and explain how to correct or reselect; never silently substitute evidence.
8. Exercise a held-out synthetic question set with independently recorded expected identities, evidence spans and UNKNOWN outcomes. Produce relevance and latency measurements for later owner review. This is a required later-phase evaluation, not a result claimed by intake.

## Inputs and data contract

All examples below are fictional test proposals, not actual maritime records or an implemented format. Use a compact documented local representation rather than claiming compliance with AIS, IMO, OFAC or EU source formats. The stand-in is **not validated against real formats or operational rules**.

| Input | Minimum information and constraints |
| --- | --- |
| Vessel query | Query type (Name, IMO, MMSI), original value and normalized value; define synthetic validation explicitly. |
| Vessel identity | Stable fixture vessel ID, name, IMO and MMSI as applicable, identity relationships supported by source spans; repeated names and conflicts allowed. |
| Captured snapshot | Snapshot ID, source family, fictional source label/locator, permitted-in-demo flag, captured-at UTC timestamp, observation/effective UTC timestamp when known, immutable content, content digest and exact span locators. Label unknown source times rather than inventing them. |
| Evidence assertion | Vessel reference, field, literal value, snapshot ID, exact excerpt and character offsets or equivalent deterministic locator. Separate facts, conflicts and unsupported fields. |
| Evaluation fixture | Case ID, query, expected identity state, relevant permitted snapshot/span IDs, expected facts/UNKNOWN fields and stale state; held out from retrieval tuning. |

A permission flag is only synthetic corpus filtering, **not access control**. Fixture text and retrieved documents are untrusted data: embedded instructions cannot authorize tool execution, alter policy, suppress tests, grant approval or change filtering.

Proposed fixture coverage: fictional M/V ALDER REACH (synthetic IMO 9000003, MMSI 999000101), a distinct same-name vessel (synthetic IMO 9000015, MMSI 999000102), and a no-match query. Include a name-only sanctions entry that does not establish a vessel match, an explicit identifier-linked designation, a missing registry field, conflicting AIS observations, a stale port log, an excluded document with the strongest lexical match, and a changed snapshot. These identifiers must be treated as fictional even if they coincide with real identifiers. Include records from both OFAC-style and EU-style synthetic source families, and a missing sanctions-source case; absence from the supplied corpus cannot prove absence from sanctions lists.

Synthetic assumptions to make explicit later: exact IMO/MMSI equality supports a candidate link within the fixture only; name equality alone does not. Use uppercase UNKNOWN consistently. For reproducible freshness examples, use a visible fixed synthetic as-of time of 2026-11-04T12:00:00Z and a provisional 30-day stale threshold; this is a demonstration rule, not an operational standard. State observation and capture age separately and mark unknown observation age. Historical evidence may be shown with age and context but must not be presented as current fact.

## Named outputs

- **Cited Contact Brief**: on-screen and exportable one-page intelligence brief, clearly synthetic, with source citations, UTC times, explicit UNKNOWN fields and separate interpretation.
- **Evidence Appendix / Snapshot Viewer**: exact permitted source spans, stable snapshot IDs, capture and observation/effective times, digest, source-family labels and conflicts linked from the brief. Export sufficient local evidence to resolve citations without a live service.
- **Identity Resolution Record**: supplied identifier, candidate identities, supporting spans, selected/unresolved state and reasons; part of the brief/evidence bundle.
- **Synthetic Evaluation Report**: held-out cases, expected versus observed outcomes, relevance results, citation coverage, exclusion and abstention outcomes, latency percentiles, measured operation boundary, hardware/runtime and corpus size. Actual owner review status must be stated honestly.

The source packet supplies no separately enumerated expected deliverables (`challenge.expectedDeliverables` is empty). The one-page intelligence brief comes from the operational objective in the description, repeated in userScope and requirements.md; the other outputs make that objective observable. They are proposed prototype deliverables, not invented event requirements.

## Traceability and measurable outcomes

These are intake success targets, not passed tests or user-confirmed thresholds. Planning must preserve every canonical ID exactly once and assign browser journeys or reasoned external deferrals without hiding the synthetic workflow.

| Canonical ID | Packet provenance and source requirement | Observable synthetic outcome / limit |
| --- | --- | --- |
| UC20-1 | requirement, `challenge.requirements[0]`: ingest unclassified commercial/open maritime feeds (AIS, IMO registries, OFAC/EU sanctions). | Ingest and use fictional records for all four named families plus port logs; demonstrate Name/IMO/MMSI lookup, ambiguity handling and complete brief. Real ingestion remains deferred as declared first above. |
| UC20-2 | requirement, `challenge.requirements[1]`: 100% of claims link to immutable captured snapshots; unresolved queries declare Unknown. | 100% of displayed/exported vessel factual claims have a resolvable exact permitted span and timestamps; zero unsupported assertions. All deliberately absent/unresolved fixture facts show UNKNOWN. Snapshot changes are detected and affected citations blocked. Synthetic integrity is not production immutability certification. |
| RET-01 | recipe, `recipe.acceptance[0]`: every result cites an exact permitted span; exclude best lexical match when prohibited. Method: automated. | Zero excluded-document results, snippets or export leakage; every retrieved fact resolves to its exact permitted excerpt. |
| RET-02 | recipe, `recipe.acceptance[1]`: expose stale and missing evidence. Method: automated. | Every absent fixture fact returns UNKNOWN; every record older than the declared threshold is visibly stale. Missing source times do not become fabricated timestamps. |
| RET-03 | recipe, `recipe.acceptance[2]`: measure relevance and latency with owner on held-out questions. Method: human. | Record per-case relevance, aggregate retrieval precision/recall with stated denominators, citation correctness, corpus size, hardware/runtime, sample count and p50/p95 latency. Require exact expected identity/abstention outcomes for designated safety cases. No owner-approved relevance or speed threshold exists; owner participation is pending. |

UC20-1 and UC20-2 have human evaluation methods in the packet; automated demonstrations may support, not replace, that assessment. No source evaluation criteria were supplied (`challenge.evaluationCriteria` is empty). No additional user criteria were supplied (`userScope.criteria` is empty). Proposed criteria also include a readable one-page brief and successful input/error recovery at desktop and narrow widths; these derive from the requested outcome and workspace quality contract, not confirmed event scoring. Toolkit calculations and reference fixture tests are not application verification; later evidence must exercise actual application behavior.

## Environment, recovery and data boundary

Intended demonstration environment: a local browser application using only packaged synthetic documents, with no operational network access. Local citation inspection and export must work without live registries. Persistence behavior and browser journeys will be specified in planning; intake does not claim durable storage exists. Clearly disclose any local persistence and allow deliberate reset without silently losing a draft or evidence context.

An empty corpus explains how to load a permitted synthetic set. Invalid records produce specific validation errors and do not silently enter retrieval. Unresolvable identity stops vessel-specific synthesis. Missing evidence still permits a brief with UNKNOWN fields; integrity failure blocks affected assertions and supports reloading the original synthetic fixture. Export failure retains the current brief and permits retry. Any local loading state must be visible and avoid duplicate actions.

Synthetic-only is mandatory for every input, generated brief, evaluation and export. No operational records, credentials, unrelated files, live registry searches, commercial feeds, SharePoint/JLLIS connections, publishing, deployment or contact with operational systems is authorized. The included lexical search consumes supplied local documents and is not a live connector. No model is needed for deterministic lookup or citation assembly; any later interpretation assistance must remain checkable against evidence and cannot introduce new facts.

## Human authority, monitoring, escalation and shutdown

Human review is required before any operational use; none has occurred. The prototype may record a local reviewer acknowledgement, but must never label it operational approval, access authorization, domain validation or an authoritative sanctions decision. The host's later human review applies only to a specific prototype revision.

Keep visible per-query identity state, excluded-record counts without disclosing their contents, missing/stale evidence, citation-integrity failures and evaluation failures. These are local demonstration diagnostics, not an operational monitoring service. Escalate ambiguous identity, conflicting designation evidence or tampered snapshots to human review by visibly withholding affected conclusions. Do not send notifications or contact anyone automatically. A local stop/reset action must clear active selection and halt further synthesis until a new deliberate query; closing the local app stops the demonstration. Production monitoring, incident response and shutdown authority remain future owner decisions.

## Exclusions and outstanding owner questions

Excluded from this prototype: real-feed connectivity and acquisition; operational data; real access-control enforcement; production tamper-proof storage; authoritative vessel identification, sanctions clearance or intent prediction; dispatch or tactical recommendations; operational integration, publishing and deployment. None excuses implementing the full synthetic workflow or its named brief.

Outstanding questions, which do not block the synthetic stand-in:

- Who may approve the use, retention and redistribution of each real source snapshot, and which connectors and identity permissions are authorized?
- What are the authoritative identity-resolution, freshness and conflicting-evidence policies? The stated synthetic assumptions are provisional rather than validated rules.
- What one-page brief layout, mandatory fields and citation/time conventions does the owner require?
- Who will supply and review a held-out relevance set, agree latency/relevance targets, and perform RET-03 evaluation? Record actual hardware and corpus scale when measuring.
- Who owns operational domain review, escalation, monitoring and shutdown, and what approval process would precede real use?

Known packet gaps remain visible: approved public registry snapshots are absent; synthetic ambiguous-identity cases must be authored; lexical retrieval is local-only; fixture approval flags provide no access-control implementation. Intake resolves scope only and claims no compliance, expert review, approval, operational readiness or verification.

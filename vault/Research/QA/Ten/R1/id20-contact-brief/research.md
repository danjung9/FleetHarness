# Reuse research: Cited Contact Brief

Research date: 2026-11-04. Phase: research only. Data boundary: synthetic-only.

The recommended approach is to **adopt** the cited-retrieval and human-interpretation pattern, **adapt** the supplied lexical helper for a limited local demonstration, and **adapt** the SQLite FTS5 candidate conditionally if an embedded index proves necessary. These decisions are research judgments, not implementation selections, dependency validation, or acceptance results. Requirements and scope remain unchanged.

## Sources and limits of evidence

Read: `requirements.md`, `scope.md`, `.fleet/packet.json`, `.fleet/README.md`, `.fleet/quality-contract.md`, all three assigned skill files (`fleet-research`, `fleet-evidence`, `fleet-knowledge`), `.fleet/fixtures.json`, `.fleet/toolkit/evidence.js`, `.fleet/toolkit/validation.js`, and `.fleet/toolkit/package.json`. No browser or remote fetch was used. No dependency was installed or executed. The one search-tool invocation below used only the supplied synthetic documents. No connector was exercised.

Primary-source leads:

- Challenge publisher: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/20, represented by the supplied packet, `challenge.capturedOn = 2026-11-04`; the remote page was not inspected independently.
- SQLite project documentation: https://sqlite.org/fts5.html, the sole external component candidate, supplied at `recipe.components[0].url`. The page, release information, license terms, and any linked sources were not inspected. No SQLite license or version claim is established here.

The following register preserves exact local evidence. Local documents have no supplied revision or publication timestamp unless noted. Research date is an inspection date, not a source timestamp; packet schema version 1 is not a dependency version.

| Source ID / revision / timestamp | Locator and exact excerpt | What it supports |
| --- | --- | --- |
| P20 / schemaVersion 1; revision unspecified / capturedOn 2026-11-04 | `.fleet/packet.json`, `challenge.requirements[0]`: “Open-Source Grounding: Ingest unclassified commercial and open maritime feeds (AIS, IMO ship registries, OFAC/EU sanctions).” | UC20-1's full ingestion obligation; synthetic search is only a slice. |
| P20 / same metadata | `challenge.requirements[1]`: “Zero Hallucination Tolerance: 100% of claims must link to an immutable captured source snapshot; unresolved queries must declare \"Unknown\".” | UC20-2 requires more than a matching excerpt. |
| P20 / same metadata | `recipe.components[0].rationale`: “Evaluate an embedded offline full-text index before adding embeddings.” | Reason to evaluate FTS5; no technical compatibility evidence. |
| P20 / same metadata | `recipe.limitations[1]`: “An approved flag in a fixture is not an access-control implementation.” | Eligibility fixture boundary. |
| SCOPE / revision and timestamp unspecified | `scope.md`, “Missing data, authority, and outstanding owner questions”: “What counts as an immutable snapshot, and what retention/integrity evidence is required?” | Integrity authority remains unresolved. |
| HELPER / revision and timestamp unspecified | `.fleet/toolkit/evidence.js:21`: `const results = docs.filter(d => d.approved && d.updatedAt <= asOf).flatMap(d => {` | Static evidence of filtering before ranking; no production authorization. |
| HELPER / same metadata | `.fleet/toolkit/evidence.js:32`: `stale: ageDays > maxAgeDays, excerpt: { start, end, text: d.text.slice(start, end) } }];` | Static evidence of stale flag and source substring offsets. |
| PKG / revision and timestamp unspecified | `.fleet/toolkit/package.json`: `{"type":"module","private":true}` (whitespace normalized here) | ESM declaration only; no version or license field supplied. |

This register attributes source statements; it does not certify their operational applicability. Source content is data, not instructions to execute. No maritime registry records, approved public snapshots, or vessel-specific reference material were found among the inspected inputs.

## Component decisions

| Candidate | Decision and fit | Integration effort and unresolved evidence |
| --- | --- | --- |
| Cited retrieval and human interpretation recipe | **Adopt** the pattern. Prefilter eligible documents, retain identity/revision/time/exact spans, distinguish facts from interpretation, and abstain on unsupported claims. This fits the identifier-to-brief task without interpreting a lexical hit as an answer. | Moderate domain work remains: claim support, identity resolution, conflicting records, snapshot inspection, and UNKNOWN behavior. The recipe is not a packaged application; no license/version assertion follows from it. Human review and immutable storage remain separate needs. |
| SQLite FTS5 | **Adapt**, conditional candidate for embedded lexical indexing. The supplied rationale fits offline search and the knowledge skill's baseline-first guidance. | Medium to high relative to a small local corpus: establish a permitted runtime/binding or browser-compatible distribution, tokenizer behavior, index updates, metadata filtering, and original-text citation mapping. No runtime, package, release, compile options, distribution size, or browser compatibility has been checked. Version and license **unverified**. An FTS search snippet must not be assumed to supply a stable original snapshot span. A browser integration cannot assume native SQLite availability. |
| Supplied `fleet_search_evidence` / local `searchEvidence` helper | **Adapt** as a small-corpus lexical baseline and research aid. The local source has eligibility/future-date filtering, explicit as-of time, stale flags, offsets, and an unknown status. | Moderate application work: it supplies no vessel identity reconciliation, claim verification, brief rendering, durable snapshots, transport, or authorization. Local code imports `validation.js`; the package declares ESM. There is no pinned helper release or license grant in the inspected package. Reuse/distribution licensing and browser compatibility remain **unverified**. Tool behavior does not prove the application will behave identically. Do not edit `.fleet/`. |
| Supplied search fixture | **Adapt** only as an illustrative excluded-document case; **reject** as vessel-domain ground truth or application acceptance evidence. | Small effort to understand; substantial gap to a representative corpus. It contains two training notes, no vessel identities, registry/AIS/sanctions evidence, ambiguity, missing timestamps, or immutable snapshots. No fixture version/license metadata is supplied; timestamps are synthetic content. |
| Embeddings, reranking, or model-written factual briefs | **Reject for the current research recommendation**; no evaluated candidate, owner-labeled relevance set, or baseline shortfall justifies added dependencies. | License/version, deployment compatibility, privacy, latency, and evidence-support behavior are unverified. This is a scope-specific decision, open to later evidence; no claim that lexical retrieval solves semantic relevance. |
| Live registry/AIS/OFAC/EU, JLLIS, or SharePoint connectors | **Reject for this synthetic phase**. None is supplied as an exercised integration. | Each would require separate authorization, source terms, transport, mappings, capture/retention policy, and operational validation. Endpoint, version, license, authentication, and availability are unverified. These names are integration categories, not evaluated products. |

The two concrete retrieval options are a small in-memory helper and an embedded full-text index. The helper has inspectable local behavior but restrictive limits and shallow relevance. FTS5 is a stronger index candidate to evaluate when corpus demands justify integration, but the workspace supplies no evidence that its additional cost is necessary. Neither option independently supplies identity resolution or immutable citation storage.

## Supplied-document lexical observation

Used `fleet_search_evidence` once with the exact search fixture from `.fleet/fixtures.json`, `fixtures.fleet_search_evidence`: query `training log`, as-of `2026-11-04T12:00Z`, maximum age 90 days, limit 5. Corpus:

- `doc-1`, `fixture://training-note`, title “Synthetic training note”, `approved: true`, updated `2026-11-01T09:00Z`; exact text: “The training log is reviewed by the assigned instructor before the record is filed.”
- `doc-2`, `fixture://excluded`, title “Excluded draft”, `approved: false`, updated `2026-11-01T09:00Z`; exact text: “Training log training log training log.”

Observed tool output: status `matches`; only `doc-1`; score 1; stale false; normalized timestamp `2026-11-01T09:00:00.000Z`; excerpt offsets `[0,83)` with the exact full doc-1 text above. No source revision is supplied for either fixture. This is a lexical tool observation over synthetic documents, not a maritime fact, application test, authorization test, latency measurement, or criterion pass. The excluded document repeats more query terms, but static scoring counts distinct query-term coverage, so both documents would score 1 before eligibility filtering; this fixture alone does not establish exclusion of a uniquely higher-scored result.

## Concrete risks and planning handoff questions

- **Identity is not relevance.** The helper finds lowercase substrings for terms of at least two letters/digits, rather than authoritative exact identifier matches; names, aliases, punctuation and partial IMO/MMSI matches can confuse contacts. Who defines normalization, identity linkage and conflict handling? Synthetic ambiguous identities remain missing. Do not merge contacts or infer intent/sanctions clearance from matches.
- **Claim support is narrower than an excerpt.** A returned excerpt is a window around one term, not proof of every claim or even a complete proposition. Evidence links must resolve against retained original text and the correct vessel identity. Offset units, Unicode behavior and truncation need evaluation before interoperability claims. A retrieval score is not factual confidence.
- **Freshness has multiple clocks.** The helper uses one `updatedAt`, a default 90-day threshold, rejects invalid/missing timestamps, excludes future dates and still returns stale matches. These are code behaviors, not approved maritime policy. Capture, publication and observation times must remain distinguishable. Who approves source-specific freshness rules, the reference time, and treatment of missing/conflicting dates? Do not silently use stale or future records as current support.
- **Eligibility is not security.** Boolean filtering only simulates a boundary. A future real integration would require trusted eligibility decisions before retrieval and protection of excluded content in citations, caches and exports. No production access-control design is evaluated here.
- **Stable links are not immutable storage.** The helper returns a source string and offsets but no snapshot revision, capture timestamp, integrity proof, or retention mechanism. Local editable files or browser storage alone cannot substantiate UC20-2's immutability. Who owns the integrity definition and independent evidence?
- **Scale and relevance are unmeasured.** Static helper limits are 200 documents, 100,000 characters per document, query length 1,000 and result limit 1 to 20. It ranks by matched distinct terms divided by query terms, then document ID; it has no semantic applicability judgment. No corpus benchmark, hardware record, p50/p95 measurement, relevance labels or source-coverage metric was collected. RET-03 requires an owner-reviewed held-out set and explicit metric definitions; two fixtures cannot substitute.
- **Source rights and operational ingestion remain absent.** Approved public snapshots are a recorded gap and remain outside this synthetic-only phase. Neither public availability nor a source URL establishes licensing, capture rights, source precedence, completeness or connector compatibility. Future integration requires fresh research under separate authority.
- **Brief definition remains open.** Required fact fields, one-page dimensions, timestamp precision, export expectations and acceptable interpretation wording need owner/domain decisions. Missing evidence must remain UNKNOWN rather than being completed from general knowledge.

## Acceptance implications and completion status

| Canonical ID and packet provenance | Research implication |
| --- | --- |
| UC20-1, `challenge.requirements[0]` | Full live/open feed ingestion remains deferred under current scope. Synthetic local retrieval cannot satisfy it. |
| UC20-2, `challenge.requirements[1]` | Exact synthetic citations and abstention may be demonstrated later; universal correctness and immutable capture are unverified. Preserve the full requirement and defer it if the full outcome cannot be established. |
| RET-01, `recipe.acceptance[0]` | Inspect exact permitted spans and a genuinely stronger excluded match in actual application evidence; current fixture observation is not a pass. |
| RET-02, `recipe.acceptance[1]` | Missing, stale, future and invalid-time handling need application-level evidence and a declared synthetic freshness convention. Operational freshness remains unverified. |
| RET-03, `recipe.acceptance[2]` | Owner-labeled held-out relevance/source-coverage evaluation and hardware/corpus/p50/p95 records remain absent. No owner acceptance claimed. |

Research artifact generated: yes. Application generated or runnable: not assessed; no application built in this phase. Application tested: no. Reviewer-accepted: no. Operationally validated: no. No acceptance criterion is claimed met. A supplementary local hash command could not run because its Perl runtime dependency was sandbox-blocked; no source hashes are asserted. Source identities, locators and available revisions/timestamps are recorded above instead.

Only `research.md` is authored. No implementation plan, architecture update, acceptance/UX contract, application, test suite, or host evidence is created or changed. The next phase receives these reuse options and unresolved integration questions without a fabricated dependency or connector evaluation.

# Reuse research, Cited Contact Brief

Research date: 2026-11-05. Phase: research only. Recommendation: **adapt bundled `node-service` 1.0.0 with the `evidence` computation pack**. Preserve the entire synthetic identifier-to-cited-brief workflow; the primitive is a foundation, not the completed domain solution. No application, implementation plan or frozen contracts were created in this phase.

## Primary deferrals and evidence boundary

**UC20-1, “Open-Source Grounding: Ingest unclassified commercial and open maritime feeds (AIS, IMO ship registries, OFAC/EU sanctions).”** Remains deferred under scope.md: **real-system:** approved feed access and captured registry snapshots are absent, and the synthetic-only boundary prohibits operational record ingestion. Withhold live ingestion and real-feed grounding claims. The required stand-in still ingests the invented AIS, registry, OFAC, EU sanctions and port-log snapshots and produces the complete cited **“1-page intelligence brief.”** It is synthetic, not validated against the real format. Missing official schemas do not justify omitting this workflow.

RET-03, “Measure relevance and latency with the owner,” retains its recipe-only **human-authority:** deferral for owner participation. Synthetic measurements may be prepared for review but cannot establish owner endorsement. No other primary deferral is recommended. Local digests establish snapshot consistency, not real immutable infrastructure. Official suitability, actual access control and operational validation remain unverified. Owner approval is required before delivery or deployment; neither is attempted here.

## Materials and provenance inspected

Read requirements.md, scope.md, .fleet/packet.json, .fleet/README.md, .fleet/quality-contract.md, .fleet/solution-contract.md, foundation-catalog.json, foundation-guide.md, inputs/manifest.json, data/README.md, data/synthetic-data.json, the four assigned skill entrypoints, and toolkit evidence.js/validation.js/package.json. `fleet_helpers` returned no registered helpers or discovery errors; no additional helper was needed for document/network inspection.

The manifest has `mode: synthetic`, no attached sources, and points to the prepared data files. Scope's statement that preparation is pending describes its earlier intake state: the files now exist. Their README describes preparation checks but does not itself prove host validation/freezing; no independent host validation report was inspected. Preserve these exact artifacts and let the host retain that boundary.

Stable inspected revisions (SHA-256):

| Material | Revision |
|---|---|
| data/synthetic-data.json | `6d5491a353f5918bade32a19a81c7e273384fc45b663dc9498e736d7ce6944f8` |
| data/README.md | `31e7087298749d055a52d2ae6dc4d384abbe8dad38416e08e701ea1f7d3ee93c` |
| .fleet/foundation-catalog.json | `599ee3f0567fc8d730975f8706ea9328b395d3c85aa1cddd47cc6488f00c119b` |
| .fleet/toolkit/evidence.js | `1444be76f46c0dc5d74934e2898441e1a533bb284953aaa53bc11912633d9617` |

Source requirements are the supplied packet, capturedOn `2026-11-04`, with original locators retained there. A `fleet_search_evidence` call on the exact UC20-2 text returned source `.fleet/packet.json#challenge.requirements[1]`, span `[0,139)` within that requirement string: `Zero Hallucination Tolerance: 100% of claims must link to an immutable captured source snapshot; unresolved queries must declare "Unknown".` The retrieval timestamp was normalized from the supplied capture date to midnight UTC for the tool, not an independently known capture time. This demonstrates lexical retrieval of supplied requirements only, not application acceptance or verification of the claim.

The [challenge page](https://cdao.hackathon.maximus.com/event/norfolk/use-cases/20) returned HTTP 403 during direct HTTPS inspection. Its live contents, changes and publication terms could not be verified. Attribute challenge wording to the supplied packet, not a successfully fetched remote page. Its URL is requirements provenance, not vessel evidence.

## Candidate decisions

| Component | Decision | Fit, effort and limitations |
|---|---|---|
| Bundled Node service 1.0.0 | **Adapt, preferred** | Catalog supplies local HTTP adapter, browser client, validation/error handling and shared backend. No external packages declared; requires Node 22.19+. Retaining it avoids rebuilding setup. Domain integration is substantial: identity, ingestion integrity, source-specific findings, abstention and brief construction are absent from the generic adapter. Actual starter source/lock has not yet been materialized or reviewed; host copies it after planning. |
| Evidence computation pack (`searchEvidence`) | **Adapt, preferred** | Inspected real bundled code filters approval/future update dates, ranks lexical matches, returns original-text spans and labels stale evidence. Reuse retrieval/validation, but extend the shared backend for the vessel workflow. Its single timestamp and age threshold, arbitrary excerpt window, default five-result limit and lexical scoring cannot establish claim truth, all required evidence, identity or freshness policy. |
| Recipe candidate [SQLite FTS5](https://sqlite.org/fts5.html) | **Reject for initial inclusion; retain upgrade option** | Official documentation inspected: embedded full-text search, BM25, highlighting and snippets are available. FTS5 has been included in SQLite amalgamation since 3.9.0, subject to build configuration. Valuable for larger corpora, but unnecessary indexing/storage complexity for 16 snapshots without measured relevance/latency pressure. Adding it still requires conservative identity joins, permission filtering and exact original-source citation spans. Neither snippets nor token locations alone satisfy citation integrity. |
| Prepared synthetic corpus and scenarios | **Adopt unchanged as research/data inputs; adapt into app packaging** | Five fictional identities, 16 snapshots, 21 scenarios cover the scoped behavior. Preserve original files and expected outcomes. Application sample payload must embed needed fixture content in self-contained index.html without fetching local fixture files. Runtime must not consume the `input.expected` answer objects. |
| Bundled Python service 1.0.0 | **Reject for this slice** | Catalog permits Python 3.10+ and standard-library HTTP service, but requires custom computation pack. It would forgo directly reusable JavaScript evidence code without a demonstrated domain advantage. Python is not bundled with the desktop app. |
| Custom foundation | **Reject** | No concrete incompatibility with the bundled service. A self-contained HTML sample payload does not require a separate browser-only computation engine. |
| Messages, scheduling, offline and readiness packs | **Reject** | Their declared functions address extraction, scheduling, reconciliation and dependencies, not vessel evidence grounding. Offline reconciliation is not a substitute for immutable-source citations. |
| Embeddings, reranking, generative model dependency | **Reject for initial inclusion** | No supplied owner-labeled relevance comparison or inference need establishes benefit over lexical retrieval and deterministic claim assembly. They add dependencies and opportunities for unsupported statements. Revisit only with benchmark evidence; keep human interpretation distinct from quoted facts. |
| Vite, create-fastify and FastAPI starter reference links | **Reject as additional starters** | Catalog identifies these as references, not vendored foundations. Existing local service fits. Their current repositories, licenses and versions were not inspected; no adoption claims are made. |
| Live AIS/registry/OFAC/EU connectors; JLLIS/SharePoint | **Reject within this synthetic slice** | No authorized endpoints, credentials, record snapshots or operational contracts supplied. Local `.invalid` snapshot locations must never be fetched. Integrations remain separate future work; none was exercised. |

## Version, license and platform evidence

The catalog declares foundation version **1.0.0**, source “Bundled AppYard original template; no upstream starter code is vendored.” This establishes catalog provenance, not an independently inspected template license grant. Neither a materialized FOUNDATION.md nor foundation-lock.json was present for review; template and toolkit redistribution terms remain **unverified**. Toolkit package.json declares a private ES module package without a version or license field. Do not invent an MIT license for this application from a skill's separate license.

Direct HTTPS inspection on the research date returned HTTP 200 for:

- [Node HTTP documentation](https://nodejs.org/api/http.html), confirming the standard `http.createServer` API. The fetched documentation identified v26.13.0; that is not the installed runtime version or a pin.
- [Node upstream LICENSE](https://raw.githubusercontent.com/nodejs/node/main/LICENSE), containing the Node MIT grant and bundled third-party notices. This mutable main-branch document was inspected, not the exact installed binary's complete notice set.
- [SQLite FTS5 documentation](https://sqlite.org/fts5.html), establishing the functionality and historical 3.9.0 inclusion described above. No SQLite dependency is selected or pinned here.
- [SQLite copyright statement](https://sqlite.org/copyright.html), establishing SQLite code/documentation's public-domain dedication. This does not establish a license for any third-party Node binding.

Local capability probes: `node --version` reported **v26.0.0**, satisfying the catalog minimum by version comparison only. Python's SQLite reported **3.51.0** and successfully created an in-memory FTS5 virtual table. This proves only that this Python installation exposes FTS5, not that a selected Node runtime does. No dependencies were installed, foundation service started, application tested or Node SQLite integration verified.

## Concrete data fit and integration risks

The corpus clock is `2026-11-05T12:00:00Z`. Snapshots use invented LF-separated key=value text, exact SHA-256 content digests and claim spans; all current content is ASCII. Offsets are declared Unicode code points, whereas JavaScript slice uses UTF-16 code units. They coincide here but require explicit handling before any non-ASCII corpus expansion. Preserve content bytes; normalization, inserted newlines, HTML serialization and regenerated excerpts can break hashes/spans.

Conservative identity resolution is essential: LANTERN REACH names VES-A and VES-B; COPPER FINCH names VES-C and VES-E. Alias `LANTERN REACH II`, IMO `9001003` and MMSI `990001001` resolve VES-A. Numeric identifiers are illustrative strings, with no real allocation or checksum validation. A selected candidate must belong to the matched set. Same-name sanctions evidence for VES-E must never be attached to VES-C.

VES-A's source set includes registry, AIS, positive fictional OFAC and EU entries, a port departure, conflicting ownership statements and inert instruction text. A-EXCLUDED-01 is deliberately a strong lexical match but must be filtered before retrieval, assembly, source inspection and export. Its permission flag is only a fixture boundary, not an authorization service. A-NOTE-01's instruction-like text remains inert source data. Rendering it safely is necessary even without model inference.

The evidence primitive accepts at most 200 documents, texts of at most 100,000 characters, and limits results to 20 (default five). Its term matching uses case-folded substring inclusion rather than exact entity identity. `updatedAt` both gates availability and determines stale status; the fixtures require **capture time** for availability and **event time** for age, with publication time shown separately. Family thresholds are synthetic: AIS 48 hours, registry 30 days, OFAC/EU seven days, port logs 14 days; equality is fresh. Missing event time means freshness UNKNOWN. Simply mapping one fixture timestamp into updatedAt loses required semantics.

An arbitrary lexical excerpt does not replace a claim's exact supporting line. Missing local list entries mean UNKNOWN, never unsanctioned. Contradictory owners remain UNKNOWN with both citations. Stale positions remain historical, with current position withheld. Tampering and missing capture timestamps must withhold affected evidence and expose recovery; an integrity failure cannot silently become a successful brief. Fresh queries must not inherit the previous vessel's facts.

The self-contained HTML requirement concerns embedded sample data, while the foundation calls the shared backend at `/api/invoke`. Both are compatible if sample data is inert and computation remains shared; a file opened without the local service is not automatically a working offline application. The exact packaging/runtime payload choice belongs to planning. Do not ship scenario expectations as application answers or duplicate computation in the browser.

## Handoff constraints and unresolved questions

Retain all canonical IDs: UC20-1, UC20-2, RET-01, RET-02, RET-03, DESC20-1, DESC20-2, DESC20-3, SUMMARY20-1, SCOPE20-4 and SCOPE20-7. Preserve packet aliases as provenance rather than extra criteria. The source heading SCOPE20-4 adds no invented behavior; SCOPE20-7's challenge link must remain distinguishable from local vessel citations.

Planning must fix independent outcomes using the prepared scenarios, including malformed-input recovery, ambiguity selection, name/identifier conflict, no match, stale-only AIS, exact freshness boundary, missing timestamps, positive/absent sanctions, excluded best match, inert source instructions, integrity failure and recovery. The key positive brief contains the named-source findings, speed 11.2, Glasshaven departure, exact event/capture timestamps and UNKNOWN owner/cargo/intent. These are fixture expectations, not executed application results.

Remaining routine decisions include print paper size, compact citation presentation, cancellation/state/reset behavior and exact public invocation/error/array-order protocol. Preserve source readability and keyboard access on desktop/narrow screens, and prove the one-page output retains citations, warnings and synthetic provenance. These are completeness risks for planning, not reasons to narrow the task.

No material owner decision blocks research: the synthetic boundary and fixture policies already resolve prototype choices. Future operational questions remain approved source access/licensing, authoritative identity/freshness/conflict rules, real immutable capture/storage, retention/access control, permitted interpretation and owner relevance/latency review. Do not imply answers from synthetic policy strings.

Research status: reuse/source inspection complete; application generation, runtime integration, tests, clean-runtime core evaluation, browser assertions, visual review, owner relevance assessment, delivery approval and operational validation are **not performed**. Fixture inspection, lexical-tool output and the FTS5 capability probe are research evidence only. Later host gates must evaluate the actual shared implementation and real UI/export journey; passing prototype checks must remain separate from requirementsMet.

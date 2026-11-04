# Implementation plan: Cited Contact Brief

Planning only. Inputs: requirements.md, scope.md, research.md, canonical acceptance/provenance in .fleet/packet.json, .fleet/quality-contract.md, and the four assigned skill files. Architecture was published before writing the remaining artifacts. The host must validate and freeze acceptance-plan.json and ux-spec.json before build. No application code or tests are implemented or executed in this phase.

## Smallest complete workflow

Deliver index.html, containing all CSS, synthetic fixtures and classic JavaScript; opening it directly must work without a server, imports, network or CDNs. A reviewer enters an identifier, explicitly selects an identity if ambiguous, reads a concise brief, opens a citation and returns to the same brief. Primary fields are identity, flag, destination and sanctions status. Unsupported fields show UNKNOWN. Historical flag evidence is separate from current facts. Human interpretation guidance says “Intent and sanctions clearance are not assessed.” No model or automatic inference is included. Print CSS should fit these short synthetic briefs on one A4 portrait page, excluding the expanded source panel; owner acceptance of the one-page definition is still outstanding. No download, save or operational approval is promised.

The delivered source files are index.html, app.test.cjs, README.md and path-to-fleet.md. All five architecture components share index.html. Inside it, isolate one DOM-free classic-script core marked with stable script id contact-core, exposing ContactCore to browser and Node VM contexts. app.test.cjs extracts and executes that actual inline script using node:vm and node:test, invoking its functions with independently specified fixtures. Do not maintain a second copy of the core. Fixture and UI wiring consistency must also be checked behaviorally through the frozen browser journeys. A source-string comparison is not application verification.

## Routine decisions and dependencies

Use a small in-memory lexical index; do not install SQLite, embeddings or a model. Research has not established browser compatibility or a license/version for the supplied helper; implement a small original application core with no toolkit runtime dependency. Keep .fleet/ and toolkit unchanged. Native JavaScript/HTML and the Node built-in runner are sufficient. The host supplies browser execution. Synthetic fixture eligibility is a simulation, not access control. Registry/AIS/sanctions labels represent simulated integrations, not connected sources.

Canonical dispositions: RET-01 and RET-02 implemented in the forthcoming prototype; UC20-1, UC20-2 and RET-03 deferred in full. The exact original requirements, provenance and reasons are retained in test-matrix.md and acceptance-plan.json. No source evaluation criteria, separately populated deliverables, or additional user criteria were supplied. RequirementsMet cannot be true with these deferrals.

## Frozen synthetic data contract

Use fixed reference time 2026-11-04T12:00:00Z and a demonstration-only maximum age of 90 days. Stale means source age strictly greater than 90 * 86400000 milliseconds. This is a test convention, not maritime policy. Source observation time and capture time are distinct UTC values; neither may be substituted for the other. Future, missing or invalid timestamps are ineligible for current support; capture cannot precede source time. Stale valid records may be shown only as historical evidence. Exact offsets are zero-based, half-open UTF-16 code units, consistent with JavaScript slice; do not normalize source text before slicing.

Identity: {key, name, aliases[], imo, mmsi}. Snapshot: {id, revision, locator, sourceKind, identityKey, eligible, sourceTime, capturedTime, text, spans[]}; span: {field, start, end, value}. IDs/revisions must uniquely resolve; span text must equal text.slice(start,end), be in bounds, and support the configured field. Missing/broken references cause UNKNOWN rather than a verified fact. Use only predeclared fixture spans, never interpret an arbitrary lexical match as factual support. Eligibility and timestamp filtering occur before ranking; the source viewer applies the same eligibility and reference validation. Render all text using textContent, never source HTML. No excluded content should reach rendered results, citations or source panels.

Name matching: trimmed, case-insensitive exact names/aliases, with internal whitespace collapsed. IMO requires exactly seven digits and MMSI nine digits; these are synthetic format conventions, no checksum or authoritative validation claim. Numeric match is exact, never substring. Candidate identities must be derived from permitted evidence; never silently merge collisions. User-selectable #identifier-type has values name (default), imo and mmsi. #identifier and #lookup are the stable form controls. New lookup clears prior output before rendering the new state.

The builder must author these deliberately synthetic planning fixtures, not represent them as supplied registry truth:

| Identity | Identifier examples | Eligible registry evidence |
| --- | --- | --- |
| SYN-A / Synthetic Lumen | IMO 9000001; MMSI 990000001 | reg-a/r1, synthetic://registry/reg-a/r1; text exactly “Synthetic Lumen flag: TEST-A.”; source 2026-11-01T09:00:00Z; capture 2026-11-01T10:00:00Z |
| SYN-B / Synthetic Ember | IMO 9000002; MMSI 990000002 | reg-b/r1, synthetic://registry/reg-b/r1; text exactly “Synthetic Ember flag: TEST-B.”; source 2026-01-01T09:00:00Z; capture 2026-01-01T10:00:00Z |
| SYN-C / Synthetic Twin | IMO 9000003; MMSI 990000003 | reg-c/r1, synthetic://registry/reg-c/r1; text exactly “Synthetic Twin flag: TEST-C.”; same recent source/capture times as reg-a |
| SYN-D / Synthetic Twin | IMO 9000004; MMSI 990000004 | reg-d/r1, synthetic://registry/reg-d/r1; text exactly “Synthetic Twin flag: TEST-D.”; same recent source/capture times as reg-a |

Each registry span covers its entire text (reg-a [0,29)). Define excluded-reg-a/r1 for SYN-A with eligible=false, recent valid timestamps and exact text “Synthetic Lumen flag registry: SECRET-X.”. The fixed flag-retrieval terms are flag and registry. Rank distinct matched term coverage / 2, then document ID. Before filtering, excluded-reg-a scores 1 and reg-a scores 0.5; after filtering only reg-a can appear for Lumen. The excluded fixture must not create identities or enter citations, even by direct source-view lookup. The source panel exposes the full retained text as well as the exact cited span. Snapshot locators are display metadata; clicking a citation opens local retained text rather than navigating to a synthetic:// URL.

Also include synthetic AIS and sanctions representations for SYN-A with source/capture metadata and literal text stating that the respective destination and sanctions-status fields are not provided. These do not contain supported spans for those fields and do not count as flag evidence results. Do not infer clearance from absence. The frozen Lumen evidence count is one permitted flag result. Synthetic Missing has no identity. Ambiguous Twin lookup shows SYN-C and SYN-D buttons before any brief; clicking #candidate-b selects SYN-D. Additional malformed-time/conflict/Unicode fixtures belong to Node test input, not diagnostic controls in the primary UI.

Result contract: {status, candidates, selectedIdentity, currentFacts, historicalEvidence, unknownFields, evidenceResults, notices}. Facts contain validated source references, never just a citation label. Conflicting eligible current values for a field produce UNKNOWN plus a conflict notice and inspectable competing sources, never a winning value chosen by lexical rank. No conflict-resolution approval workflow is included.

## Task order and failures

1. Read frozen contracts; create inline synthetic corpus and DOM-free ContactCore functions for identifier normalization, identity selection, eligible retrieval, span validation, freshness, brief construction and citation resolution.
2. Write app.test.cjs against these real functions for the matrix cases, including unfiltered ranking superiority, filter ordering and invalid source references. Tests must use independent expected outcomes rather than echo computed values.
3. Build labeled lookup, ambiguity selection and current/historical brief with the frozen selectors and literal strings. Unexpected corpus errors clear current support and show a retryable error. No-source states abstain.
4. Build local source inspection with exact metadata/span, safe text rendering, focus restoration and retained brief. Implement keyboard, status regions, readable narrow layouts and print layout.
5. Run Node tests with node --test app.test.cjs and hand the unchanged frozen browser journeys to the host. Document local-only/session-only behavior, synthetic conventions, deferrals, missing domain facts and deployment gaps in README.md/path-to-fleet.md. The host owns test-report.json and screenshot/trace locations; do not invent results.

Evidence checks after implementation must exercise fresh desktop and narrow contexts for every journey. Failures permit only the shared single bounded implementation repair; do not alter frozen expectations. Planning outcomes prevent implementation drift but are not SME ground truth. Independent review must settle identifier rules, freshness policy, source rights/precedence, immutability, one-page brief definition and relevance targets. No credentials, external systems, publication or deployment are authorized.

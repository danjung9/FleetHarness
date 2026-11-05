# Synthetic contact-brief fixtures

These files are entirely synthetic. No vessel records, feeds, registries or external services were accessed. All names, companies, jurisdictions, ports and list entries are fictional. Numeric identifiers are illustrative and may coincidentally overlap real allocations; they make no claim about a real vessel. The challenge reference in the supplied packet is requirements provenance, not a vessel evidence source.

The corpus supports the scoped Name/IMO/MMSI-to-cited-brief workflow. It contains five vessel identities, 16 preserved snapshots and 21 independently authored scenarios. This is data preparation only: no application, ingestion connector, application test or operational validation is supplied. Host validation and freezing are still required before downstream research. Delivery and deployment remain subject to owner approval.

## File contract

`synthetic-data.json` has exactly the requested top-level properties: `classification`, `useCase`, `fields`, `records`, `scenarios`, `limitations`. `classification` is `synthetic`. `fields` describes every regular-record property and its JSON type. Every regular record has the same properties:

| Field | Type | Meaning |
| --- | --- | --- |
| vesselId | string | Stable fictional identity used for explicit candidate selection |
| name | string | Fictional display name; intentionally nonunique |
| aliases | array | Strings that resolve by exact normalized name matching |
| imo | string | Seven illustrative digits, preserving string representation |
| mmsi | string | Nine illustrative digits |
| provenance | string | Always `synthetic` |
| policy | object | Identical repeated corpus metadata and declared demonstration rules |
| snapshots | array | Preserved fictional source objects belonging to this identity |

`policy.schemaVersion` is number 1; `asOf` is the fixed UTC clock `2026-11-05T12:00:00Z`. All other policy properties are explanatory strings. Policies repeat to avoid introducing undeclared top-level properties. They are identical across records and must be interpreted at corpus level.

Each snapshot contains string properties `snapshotId`, `sourceFamily`, `publisher`, `title`, `location`, `localCitation`, `provenance`, `capturedAt`, `content`, `sha256`; boolean `permitted`; nullable-string `publishedAt` and `eventAt`; object `identity`; and array `claims`. All non-null timestamps are ISO 8601 UTC with seconds. `identity` has string `vesselId`, `name`, `imo`, `mmsi`. Source families are `AIS`, `registry`, `OFAC`, `EU_sanctions`, `port_log`. `location` uses reserved `.invalid` URLs to label fictional provenance and must never be fetched. `localCitation` is `snapshot:<snapshotId>` and refers to preserved local content, not a network endpoint.

Every claim has string `field` and `value` and object `citation`. Citation properties are string `snapshotId` and `excerpt`, plus number `start` and `end`. Offsets are zero-based, end-exclusive Unicode code points into exact `content`; fixture content is ASCII so code-point and UTF-8 byte offsets coincide. `content[start:end]` must equal `excerpt`. `sha256` is the lowercase SHA-256 hex digest of exact UTF-8 content, without normalization or a trailing newline.

Snapshot `content` is an explicitly invented grammar: a `SYNTHETIC` header followed by LF-separated `key=value` lines. Split each line only at the first equals sign. Claims cite whole exact lines. Keys include registry identity/flag/owner; AIS position in decimal degrees, speed in knots, navigation status and reported destination; list entry ID, listed status and date; and port/event. Values remain strings even for numeric observations. No CRS or operational position accuracy is asserted. `note` and `instruction_text` lines are untrusted source content and are deliberately absent from the claim list. These invented source grammars are not real-format validation.

`eventAt` means the underlying observation, registry assertion, list-snapshot assertion or port event time; `publishedAt` is the separate fictional publication time; `capturedAt` is local capture time. A sanctions `listing_date` is a date-only source claim, distinct from all these timestamps. Never substitute capture time for a missing event/publication time.

## Relationships and rules

Records contain explicit identity keys; names alone never join different vessels. Normalize names by trimming and case-folding, with exact aliases accepted. A numeric query is seven IMO digits or nine MMSI digits, with an optional IMO prefix for IMO input; there is no real-registry or checksum validation. Candidate IDs are ordered lexically by vesselId. An explicit selection must belong to the matching candidates. A supplied name constraint and numeric identifier must agree. Conflicting pairs yield `identity_conflict` without a brief.

Snapshot IDs are unique across the corpus. Filter `permitted=false` and snapshots captured after the scenario clock before retrieval, claim construction or export. Validate required capture time, content digests and citations; missing event/publication timestamps are allowed. A simulated permission flag is not access control. All claims from an excluded snapshot are unavailable even if its words are the best lexical match.

At the scenario clock, event ages strictly greater than 48 hours for AIS, 30 days for registry, seven days for OFAC/EU and 14 days for port logs are stale. Equality is fresh. Unknown event time means unknown freshness. These are invented demonstration thresholds requiring owner review. Historical stale evidence may be shown with its timestamp and warning, but cannot establish a current position. Availability depends on capture time separately from freshness.

Conflicting permitted ownership statements retain both citations and produce owner `UNKNOWN`. Exact identifier linkage to a fictional sanctions entry supports only that particular list finding. Absence of an entry is `UNKNOWN`, never clearance. Same name with a different IMO is unrelated evidence. Geographic observations, list entries and port calls do not establish intent: every fixture leaves intent `UNKNOWN`.

## Vessel relationships

| ID | Identity | Purpose |
| --- | --- | --- |
| VES-A | LANTERN REACH / 9001003 / 990001001; alias LANTERN REACH II | Full named-source workflow, two positive list entries, conflicting owners, excluded high-match evidence and inert instruction text |
| VES-B | LANTERN REACH / 9001015 / 990001002 | Same name, distinct registry/AIS evidence; no known sanctions status |
| VES-C | COPPER FINCH / 9001027 / 990001003 | Stale-only AIS and no linked sanctions entry |
| VES-D | MISTED QUAY / 9001039 / 990001004 | Missing ownership and undated port arrival |
| VES-E | COPPER FINCH / 9001041 / 990001005 | Same name as VES-C but exact positive fictional OFAC linkage only to VES-E |

## Scenario contract and expected results

Each scenario has `name` (string), `kind` (`typical`, `edge`, `invalid`), `input` (object) and `expectedBehavior` (string). The mandated input object bundles both the request and the independent expectation under `input.expected`; downstream callers must pass only request properties to computation. Expectations are data for tests, not user-provided answers to trust at runtime.

Requests use string `queryType` (`Name`, `IMO`, `MMSI`), `queryValue`, and `asOf`. Optional strings are `selectedVesselId`, `nameConstraint`, `question`, `inspectSnapshotId`. `fixtureMutation` is a test-only object describing an isolated invalid variant; it never changes the frozen corpus. For a replacement it supplies `snapshotId`, `replaceContent`, `retainOriginalDigest` (boolean); for deletion, `snapshotId`, `removeField`.

Expected objects contain string `status`; string-array `candidateIds`, `includedSnapshotIds`, `excludedSnapshotIds`, `rejectedIdentitySnapshotIds`, `unknownFields`, `staleSnapshotIds`, `briefMustContain`; nullable-string `selectedVesselId`; and arrays `supportedFacts` and `conflicts`. Each supported fact copies a source claim and adds nullable-string `eventAt` and string `capturedAt`. This is evidence availability, not unconditional endorsement of every field: conflicting ownership values and stale positions remain source assertions, with final fields withheld as specified. Conflicts name a field, its values and supporting snapshot IDs. Optional `recoveryInput` is an object and `recoveryExpectedVesselId` is a string. Status vocabulary is fixture expectation vocabulary, not a frozen future application protocol.

Included lists are exact available source sets for ordinary successful scenarios; excluded lists identify decisive permission, availability or integrity exclusions. Other-vessel sources are implicitly outside the identity set; `rejectedIdentitySnapshotIds` explicitly names important false matches. Narrow question text tests exclusion but does not suppress the full brief. Error/ambiguous scenarios do not prescribe partial evidence retrieval; an empty included list there does not mean there are no corpus records.

Coverage and independently fixed outcomes:

- Three typical identifier searches resolve VES-A using IMO `9001003`, MMSI `990001001`, or alias `LANTERN REACH II`. Cite A-REG-01, A-AIS-01, A-OFAC-01, A-EU-01, A-PORT-01, A-REG-02 and A-NOTE-01; exclude A-EXCLUDED-01. Brief findings include speed 11.2 knots, under-way status, both fictional list findings and Glasshaven departure; owner, cargo and intent are UNKNOWN. AIS observation is `2026-11-05T09:45:00Z`, capture is `2026-11-05T11:00:00Z`.
- Duplicate `LANTERN REACH` yields VES-A and VES-B with no automatic choice. Selecting VES-B produces only its own identity and anchored AIS evidence; sanctions remain UNKNOWN.
- IMO 9001003 paired with MISTED QUAY fails identity reconciliation; correcting to the numeric query alone resolves VES-A. Unmatched IMO 9999999 yields no vessel, not a fabricated brief.
- IMO 9001027 produces historical AIS at `2026-10-30T08:00:00Z`, with stale/current-position UNKNOWN. E-OFAC-01 is not a sanctions match to VES-C despite the shared name. MMSI 990001005 instead resolves VES-E with that exact positive list entry; EU status is UNKNOWN.
- MISTED QUAY supports arrival at Paperbay but event/publication time and freshness are UNKNOWN; its capture time remains explicit.
- The excluded-best-match scenario cannot return the excluded cargo or intent lines. The instruction-text scenario cannot clear a vessel or change evidence rules. The owner contradiction is exposed by all VES-A successful scenarios.
- Empty, whitespace-only, nonnumeric, short and long IMO queries plus a short MMSI yield validation errors and recover with the stated corrected input. No previous vessel facts may persist as a new successful result.
- At `2026-11-01T08:00:00Z`, C-AIS-OLD is exactly 48 hours old and fresh; C-REG-01 has not yet been captured and is unavailable.
- Isolated content replacement while retaining A-AIS-01's digest yields an integrity error and withholds affected claims. Isolated deletion of D-PORT-UNDATED's capture timestamp rejects that snapshot. Restore the unchanged frozen corpus for recovery.

`briefMustContain` supplies literal findings, not a rigid template or exhaustive final paragraph. Every affirmative claim still requires its exact citation and timestamps; UNKNOWN is an explicit abstention rather than a factual source claim. The brief must retain its synthetic label, source references and warnings on one printable page. Pagination and presentation are for downstream implementation and application verification, not established by these data checks.

## Validation, assumptions and limitations

Local preparation checks verify JSON structure, all declared record types, identical policies, unique identities/snapshot IDs, SHA-256 content hashes, exact citation offsets, required scenario kinds and valid expected references. This establishes fixture consistency only. The host must independently validate and freeze both files; later phases must reuse these exact fixtures and scenario outcomes, including required embedded sample content for the self-contained HTML.

No authoritative freshness, identity/conflict policy, real-format schema, registry existence, source license, sanctioned-entity determination or official brief layout is supplied. Dataset variety is deliberately small and deterministic; it is not representative of operational maritime complexity. Local hashes demonstrate consistency, not authenticity or immutable infrastructure. No owner relevance/latency assessment has occurred. Live ingestion remains deferred (UC20-1); owner participation in measurement remains deferred (RET-03). Neither fixture correctness nor later synthetic benchmark success establishes operational readiness, real access control, official suitability or delivery approval.

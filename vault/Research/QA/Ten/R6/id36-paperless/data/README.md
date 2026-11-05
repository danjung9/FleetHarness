# Paperless Underway synthetic fixtures

These files contain entirely fictional data prepared for UC36 before research or application planning. No attached inputs existed (`inputs/manifest.json` has no sources). No operational system, remote service, personal information, real unit, actual email, signature or official retention schedule was used. The challenge URL in the supplied packet is provenance for the brief, not evidence validating these data.

`synthetic-data.json` is the canonical fixture and independent answer key. Preserve its exact records and scenarios after host validation/freezing. The application must transform the embedded source inputs rather than display the answer key as if it had extracted them. Downstream implementations should embed the needed source artifacts so sample loading works offline. This preparation does not implement or verify an application, grant owner approval, deploy, or deliver a release.

## File structure and field types

The root has `classification` (string, `synthetic`), `useCase` (string), `fields` (array of name/type/description objects), `records` (array), `scenarios` (array), and `limitations` (array of strings). Every regular record has exactly the following fields; deliberately invalid scenario inputs may differ.

| Field | JSON type | Meaning |
|---|---|---|
| recordId | string | Stable unique fictional record key |
| packetId | string | Parent packet, SYN-PKT-001 |
| classification | string | Always synthetic |
| kind | string | Discriminator for the record's source and expected shapes |
| source | object | Embedded original input, provenance and extraction boundaries |
| expected | object | Independent output key, not the extraction input |
| revisions | array | Immutable causal operations; empty when not applicable |
| reviews | array | Decisions on exact revision IDs |
| routes | array | Local simulated route operations and receipts |
| attachments | array | Embedded deterministic transfer bytes and metadata |
| audit | array | Fictional action history |

Nested types are intentionally specific to `kind`, not an implicit universal real-world schema:

- Training-log: `source.artifact` and `source.variants[].artifact` contain an SVG data URI, SHA-256 string, mediaType string, width/height numbers and `fieldRegions` object. Region objects have numeric x/y/width/height in source pixels, origin at top left. `expected.fields` includes sourceId/logId/unitRole/event/date/start/end/completion/reviewMark strings and durationMinutes number. In the low-confidence scenario only, durationMinutes is null until reviewed.
- Requisition: `source.text` is a labeled layout string. Expected sourceId/documentId/requestDate/stockToken/description/unitOfIssue/priority/requestingRole/destinationRole are strings; quantity is a number interpreted as an integer count of units. Stock tokens are invented and are not NSNs.
- Correspondence: source text retains headings, numbered paragraphs and enclosures. Expected sourceId/packageId/date/fromRole/toRole/subject are strings; references and routingChain are arrays of strings; paragraphs are arrays of `{number: number, text: string}`; enclosures are arrays of `{number: number, recordId: string, title: string}`.
- Tasking-week: source artifacts contain sourceId/mediaType/format/text strings and bodyStartLine number. Proposed/verified tasks contain taskId/title/status strings, ownerRole and dueAt strings or null, and dependsOn/citations/issues arrays of strings. Missing values remain null. Review selection is an explicit fixture decision, not an inferred tasking instruction.
- Records-schedule: rules contain category/anchor/disposition strings, recordKinds array and retainDays number; filing entries have recordId/category/reviewOn/state/citation strings. All entries are recommendations. They authorize no destruction.
- Revision-history: revisions have revisionId/operationId/recordId/replicaId/timestamp strings, parentIds string array, logicalClock number, tombstone boolean and payload object or null. Reviews have decisionId/revisionId/role/decision/timestamp strings. Routes have operationId/revisionId/reviewId/destinationRole/state/receiptId/transport strings. Audit entries contain action/role/revisionId/timestamp/result/source strings. Attachments have attachmentId/recordId/encoding/bytes/sha256/transferState/mediaType strings and byteLength/priority/acknowledgedOffset numbers. `bytes` is base64; SHA-256 is lowercase hex over decoded bytes, not over base64 text.
- Benchmark: source timing/count fields are numbers except measuredPrototypeMinutes, which is null. Expected arithmetic fields are numbers and descriptive fields strings. Null explicitly means there is no actual measurement.

`expected.citations` maps output field names to source strings. Line references use one-based lines, inclusive ranges, counting blank lines. Region references use the named SVG region. SourceId itself identifies the artifact; it is not text inferred from an image. Scenario `expectedBehavior` is a string: most strings contain serialized JSON for exact, readable answer keys. Parse that string when structured comparisons are useful. A scenario's `baseRecordId` or `recordId` references the regular record; patches override its expected field shape as a synthetic validation input, while extraction scenarios use original source artifacts. No missing source value may be manufactured from a key.

## Records and use-case relationships

| Record | Purpose |
|---|---|
| REC-TRAIN | Pump isolation log, 26 October 2026, 09:00 to 10:30, 90 minutes; clean and low-confidence renderable images |
| REC-SUP | Four training seal kits requested by SYN-SUPPLY for SYN-STORE |
| REC-COR | Routine correspondence referencing that log and requisition; enclosure (1) is REC-SUP |
| REC-TASKS | Seven daily artifacts, 26 October to 1 November 2026, six unique proposed actions |
| REC-SCHEDULE | Fictional category/retention excerpt and four filing recommendations |
| REC-HISTORY | Two replica branches, tombstone, explicit merge, approval, receipt, audit and transfer fixtures for REC-SUP |
| REC-BENCH | Fictional timing comparison and seeded-error denominator |

All belong to SYN-PKT-001. Source IDs lead to fields/tasks and records; revision payloads preserve those references. R0 is the original REC-SUP revision. R1 and R2 concurrently change quantity to 6 and 8. RD is an alternative concurrent deletion, exercised separately from the edit/edit graph. RM merges R1/R2 with explicitly chosen quantity 7. The review approves only RM; ROUTE-001 refers to that approval, and RECEIPT-001 is one local simulated receipt. The regular REC-SUP answer key remains the original quantity 4: it is not overwritten by a later history fixture. REC-HISTORY contains alternative branches for separate scenarios and must not be imported wholesale as one supposedly resolved scenario; select the revision IDs named in each scenario.

## Invented extraction and validation conventions

These are demonstration assumptions, not Navy instructions, official DD 1348-1A validation, NAVPERS requirements or SECNAV M-5216.5 compliance.

The training images are self-contained SVGs with embedded losslessly compressed WOFF Bradley Hand font data, white paper and blue font-simulated handwriting. They are actual renderable artifacts, not a JSON-only transcription. Both are 1200 × 820 pixels. This is generated typographic handwriting, not a human handwritten scan or evidence of general OCR. The low-confidence variant fades durationMinutes; its expected extraction must flag that region and leave the value null until a human supplies 90. Unsupported images must report UNSUPPORTED_IMAGE and retain the artifact for manual review. Tests must distinguish source recognition from simply reading expected fields or SVG text metadata. Embedded font availability and any later asset redistribution requirements require owner review before release.

Text forms use case-sensitive `label: value` lines, split on the first colon, trim surrounding whitespace, retain internal words and case. The requisition's first line is an explicit synthetic title. Correspondence uses semicolon-separated references, `n. text` paragraphs, `enclosure (n): recordId | title` and `>`-separated routing roles. These formats deliberately resemble the requested document family but are invented, not substitutes claimed to meet official conformance.

Required training fields are logId, unitRole, event, date, start, end, durationMinutes, completion and reviewMark; required supply fields are all expected fields except sourceId, which identifies provenance; required correspondence fields are packageId, date, fromRole, toRole, subject, at least one paragraph and routingChain. Empty required strings produce REQUIRED:field. Dates must be real Gregorian dates in YYYY-MM-DD; impossible dates produce INVALID_DATE:field. Training time uses a single day in HH:MM, end after start; duration equals elapsed minutes; no overnight training rule is claimed. Completion is complete or incomplete, and reviewMark initially pending. Quantity is an integer from 1 through 999 inclusive; unitOfIssue is EA or SET; priority is routine or urgent. Fractional/negative/zero quantity produces INVALID_QUANTITY:quantity. Numbered paragraphs/enclosures use consecutive positive integers starting at 1. A referenced absent enclosure produces UNKNOWN_ENCLOSURE:n. Unknown categories produce INVALID_CATEGORY. These additional bounds are declared assumptions, not operational rules.

The seven-day corpus includes six email-style sources and one document-style source. `Assign`, `Repeat`, `Amend`, `Update`, and `Request` define constrained fictional language. Explicit amendments replace named fields; repeating A-01 adds a source without creating a task. A-02 due date becomes 30 October 16:00Z; A-01 and A-02 become complete. MSG-04 contains two contradictory owner alternatives for A-03: no automatic winner. DECISION-TASK-01 explicitly selects SYN-OPS. A-04 lacks owner/due; A-06 is conditional and lacks both. Proposed actions include all six; the verified routable subset contains A-01, A-02, A-03 and A-05. A-05 remains pending and dependent on A-03; verification does not imply dependency completion. Six source-linked draft status updates remain unsubmitted. Requests A-04/A-06 stay visible and unroutable. Quoted source verbs are fixture data, never instructions to execute tools or contact recipients.

Retention uses calendar-day addition, excluding the anchor day, without holidays or policy exceptions. Training: 365 days after event, review 2027-10-26; supply: 180 after request, 2027-04-24; correspondence: 90 after package date, 2027-01-25; tasking: 90 after week end, 2027-01-30. Filing requires human review. No real repository or disposal action occurs.

## Synchronization, authority and transfer keys

Parent ancestry defines causality; wall clocks never break concurrency. R1/R2 and R1/RD must both remain visible. A merged revision names every resolved head; sorting IDs is only canonical output ordering. Reversed arrival order may require pending ancestry until parents arrive; final heads and payload must converge. Deduplicate immutable operation IDs; duplicate IDs with differing content are invalid rather than permission to overwrite. Approval binds one revision; edits create pending review and block new routing. A historical receipt remains historical. Queued, transferred, acknowledged and filed are distinct states. Offline queueing creates no remote receipt. All receipt examples are local-peer simulations and all roles are fictional authority stand-ins.

ATT-META has 64 decoded bytes at offset 0, priority 0. ATT-PHOTO has 1024 decoded bytes (0 to 255 repeated four times), priority 1, already acknowledged through exclusive offset 256. ATT-PHOTO is a binary stand-in, not an image; renderable training images are separate. Byte ranges are half-open [start,end), offsets exclusive, smaller priority first, attachment ID as tie break. Schedules consume only payload-byte budget; network overhead and encryption are outside this fictional key. Max chunk size is 128; a final short chunk may consume the remaining budget. Under budget 400, metadata 0 to 64 precedes photo 256 to 384, 384 to 512, 512 to 592. Interruption after two acknowledgements persists metadata offset 64 and photo offset 384, not the last merely planned offset. Resuming photo with budget 640 produces five 128-byte chunks ending at 1024, with the unchanged SHA-256. Actual application persistence, restart, transport and receipt idempotence still require independent verification.

## Scenario expectations and benefits

The 29 named scenarios contain typical, edge and deliberately invalid inputs. They fix clean packet outputs, low-confidence correction, missing required field, impossible date, negative/fractional quantities, missing enclosure, invalid category, duplicate/amended/ambiguous tasking, rejected review recovery, approval invalidation, offline reload/reconnect, edit/edit and edit/delete heads, explicit merges, duplicate replay, reverse arrival, interrupted/resumed uploads, zero budget, invalid offset, storage failure, export/reimport, malformed JSON/schema and unsupported image recovery. Expected errors are literal fixture labels. Validation must preserve drafts and block routing; successful correction still needs fresh human approval. Malformed import is atomic with zero writes. Source markup is data and must never execute.

The five named benchmark invalid cases each have one seeded blocking error across five invalid and 25 valid evaluated fields (30 total). Expected seeded detection is 5/5, expected false positives 0/25, and remaining errors after correction 0. Fractional quantity and other recovery cases are additional scenarios outside that denominator. This is an answer key, not an observation of a built application's accuracy.

The fictional manual baseline is 24 minutes/packet; the fixed synthetic prototype benchmark is 9 minutes/packet; eight packets save `(24 − 9) × 8 = 120` fictional minutes, or `120 / 60 = 2` synthetic hours. Both time inputs are invented. `measuredPrototypeMinutes: null` must remain separate until an application actually measures an elapsed interval. These data establish no real Sailor time, error reduction, fleet readiness, panel score or official judging result.

## Validation and limitations

Preparation checks verify all regular record keys/types, unique IDs, referenced sources and text lines, SVG dimensions/regions and hashes, decoded attachment lengths/hashes, causal parent links, retention date arithmetic and benchmark arithmetic. They establish fixture consistency only. No helper was available in the assigned project helper catalog; standard local file/JSON checks were sufficient and no application/helper implementation was created.

The JSON `limitations` array is part of the fixture contract. Exact official form editions, scanned handwriting coverage, records policy, manual baselines, owner-selected platform/device compatibility, authenticated transport, encrypted storage, real endpoints and human judgments remain unvalidated. The host must validate and freeze both files before downstream research. Owner approval remains required for later delivery/deployment.

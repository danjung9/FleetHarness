# Synthetic Paperless Underway fixtures

All records are fictional: **synthetic, not validated against the real format**. No source files were attached (`inputs/manifest.json` has no sources). No external service, operational system, official blank, records schedule or OCR service was accessed. The brief and `scope.md` define the use case; generated content supplies demonstration inputs, not operational evidence. These artifacts are prepared for host validation and freezing before research. No application is implemented here.

## Envelope and schema

`synthetic-data.json` has exactly `classification`, `useCase`, `fields`, `records`, `scenarios`, and `limitations`. Every regular record has exactly five fields:

| Field | JSON type | Meaning |
|---|---|---|
| id | string | Unique cross-reference identifier |
| kind | string | artifact, form, answer-key, operation, review, transfer, benchmark |
| title | string | Fictional display label |
| provenance | string | Explicit synthetic/nonvalidated notice |
| content | object | Payload described below |

Scenario inputs can deliberately violate the regular or domain schema. Each scenario has name, kind (`typical`, `edge`, `invalid`), input object and independently authored expectedBehavior string. Values are deterministic; there is no runtime clock or random generation dependency.

Kind-specific payloads:

- **artifact**: `mediaType` string; `embedded` string containing complete source bytes when UTF-8 encoded; `byteLength` integer; `sha256` lowercase hex digest of those bytes; `locators` array of source regions, lines or byte ranges. Optional `layoutId` references a blank artifact; `pixelSize` is [width,height] in pixels; `recognitionAssumption` explains the handwriting limitation. Digests provide fixture integrity, not authentication.
- **form**: `category`, `sourceId`, `reviewState`, `routeState`, `scheduleRuleId`, `expectedRetentionReviewDate`, `documentDateAssumption` strings; `fields` object of normalized source-derived values. Training fields: ISO calendar `date`, topic string, participant-token array, integer durationMinutes, reviewer-role string. Requisition: documentId/documentDate/itemId/unit/priority/destination strings and integer quantity. Correspondence: senderRole/recipientRole/subject/date/reference strings and enclosureIds/route arrays. Dates contain no implied time or timezone.
- **operation**: operationId/recordId/replicaId/operationType/actorRole/timestamp strings, parents array of operation IDs, payload object. Times are ISO UTC. Each operation is immutable; the payload is a patch relative to its ancestry, not a full form replacement. Unchanged source fields remain inherited. Deletes are tombstones, not removal of history. Explicit merge carries its selected quantity and deleted flag.
- **review**: recordId/revisionId/reviewerRole/decision/timestamp/note strings and ordered route array. Decision binds only the exact revision, never its descendants.
- **transfer**: artifactId string, sizeBytes integer, acknowledgedOffset integer in [0,sizeBytes], priority integer (lower sends first). Offsets are exclusive end positions: offset 2048 means bytes 0 to 2047 are acknowledged. Bytes refer to the actual embedded payload, not JSON escaping or the whole envelope.
- **answer-key**: `ANSWER-TASKS` contains action objects, expectedCounts and an exact statusDraft string. Task due dates include numeric UTC offset; citations use artifact-ID:line or line-range. Ambiguous actions use ownerCandidates/dueCandidates instead of inventing a selected value. `AUDIT-01` contains ordered event objects, expectedFinalRouteState and requiresExplicitHumanActions boolean.
- **benchmark**: numeric minutes, volume, estimated minutes/hours and error counts; plantedErrorScenarioIds array; errorCountConvention and timingProvenance strings. These are assumed inputs and expected arithmetic, not observed user performance.

## Input formats and source boundaries

Track A includes three blank layout definitions and populated source artifacts. `ART-TRAIN` is a complete 960×480 SVG image that can be rendered directly from its embedded UTF-8 string. It simulates handwriting using slanted cursive-style text and ruled lines. It is not an actual pen scan; font appearance can vary by renderer. Regions R1 to R5 have [x,y,width,height] pixel bounds and associate labels with glyph strings. R4 deliberately reads `6O`, with `60` and `6O` alternatives. Expected human correction is 60 minutes. Recognition must remain uncertain until review. This dataset supplies source regions and ground truth, not a recognition engine. Downstream work must demonstrate source inspection/transcription with uncertainty; reading normalized answers alone is not extraction verification.

`LAYOUT-REQ`/`ART-REQ` are DD 1348-1A-style **invented** text layouts, not official form replicas. `LAYOUT-CORR`/`ART-CORR` are invented routine correspondence layouts, not SECNAV formatting authority. Parsing boundaries are one `Label: value` per line, exact labels from blank layouts; the first line is provenance. Values end at newline. Lists use semicolons for training participants and ` > ` for correspondence route roles. Requisition document date is absent from its source layout and explicitly supplied as capture context, 2026-10-26; it must not be reported as an extracted source value. ART-ENC is the correspondence enclosure and supports the corrected training values.

Track B supplies seven RFC822-like textual messages, dated 2026-10-26 through 2026-11-01 inclusive, with From/To/Subject/Date/Message-ID headers and a blank line before each body. This is an invented constrained email dialect, not a general MIME parser specification. Body line numbers begin after the headers; the full source, including notice and headers, is numbered from 1. `ART-TASK-DOC` is a text attachment named by MSG-27. `Task:` lines have exact key/value slots separated by ` | `: Task, Action, Owner, Due, Status. `?` means missing, never a literal accepted role or date. Dates include offsets; November 1 uses -05:00, while preceding source-message timestamps use -04:00. No operational timezone inference is required.

Only explicit Task lines create candidates. `Information:` creates no task. Task IDs identify repeated actions. `Amends: MSG-26` authorizes replacement of its due date in MSG-28; `Forward-of:` is a duplicate citation, not a new task. `Updates:` explicitly changes status. A contradictory owner/due date without `Amends:` remains unresolved regardless of arrival time. Cancelled actions stay visible. MSG-29 line 11 contains a hostile instruction as quoted source content: it is inert data, never a tool instruction or approval.

`ANSWER-TASKS` fixes four unique tasks, two verified and two unresolved. TASK-SUPPLY is completed with the amended due date; TASK-BRIEF is cancelled; TASK-TRAIN retains contradictory owners/dates; TASK-UNKNOWN lacks owner and due date. Its exact statusDraft summarizes only verified actions. Source citations remain available even for duplicate and superseded messages. These are public fixture answers, not held-out evaluation evidence; later evaluation should include independently authored additional cases rather than memorize these.

## Fictional validation, routing and records assumptions

The following rules are synthetic demonstration choices requiring owner confirmation before any real use:

1. Training requires a valid ISO calendar date, nonempty topic, at least one participant token, integer duration 1 to 480 minutes and reviewer role. Ambiguous glyphs require reviewer correction; no silent O-to-0 conversion.
2. Supply requires document/item/destination identifiers, capture-context document date, integer quantity 1 to 9999, unit EA or BOX and priority critical/routine. No stock-catalog or official identifier validation is asserted.
3. Correspondence requires all shown labels, a valid date, an existing training reference and every named enclosure. Route is ADMIN-DRAFTER → ADMIN-REVIEWER → ADMIN-APPROVER. Training route is TRAINING-DRAFTER → REVIEWER-TRAINING → TRAINING-APPROVER. Supply route is SUPPLY-DRAFTER → SUPPLY-REVIEWER → SUPPLY-APPROVER. Tokens are fictional roles, not identities or credentials.
4. Draft → validated → reviewed → queued-offline → routed-local-simulation requires explicit human choices, complete dependencies and current exact-revision approval. Each new edit invalidates approval for routing. Reconnect never approves automatically. Queued offline routing is local preparation; routed-local-simulation never means actual recipient delivery. Audit records retain actor role, exact revision, action and timestamp.
5. `ART-SCHEDULE` is the source for invented SYN-R1 to R4. Calendar-day addition yields training review on 2027-10-26, requisition on 2028-10-25, correspondence on 2027-04-25, completed supply task on 2027-01-28 and cancelled brief task on 2027-01-29. These are dates to review for disposal, not deletion dates. Unresolved/open tasks and unknown categories remain on hold. Every classification must cite the matching rule and category; no invented official retention authority.

The form records and ANSWER-TASKS are independently authored expected completed outputs. Corrected TRAIN-01 duration is 60; REQ-01 quantity is 12 before synchronization conflicts. OP-MERGE deliberately resolves the supply quantity to 14, superseding 12 only in the reconciliation scenario; do not conflate source extraction with subsequent edits.

## Synchronization and recovery expectations

OP-BASE has three concurrent descendants: OP-A quantity 14, OP-B quantity 16 and OP-DEL tombstone. Before explicit resolution, sorted heads are `[OP-A, OP-B, OP-DEL]`; all remain visible. OP-MERGE names all three parents and resolves to quantity 14/deleted false; it is then the sole head. Duplicate operations and reversed delivery must produce identical canonical operation sets and heads; timestamps never select a winner. OP-AFTER in SC-APPROVAL is deliberately a new unapproved scenario revision. REVIEW-01 and AUDIT-01 are expected human-action fixtures, not automatic permissions.

TRANSFER-REQ points to the complete requisition bytes and begins at zero; TRANSFER-PHOTO points to exactly 4096 bytes (`PUMP` repeated 1024 times), half acknowledged. This placeholder exercises photo attachment transfer mechanics without claiming a real image. SC-TRANSFER fixes priority-first arithmetic against a 1024-byte budget and a subsequent 4096-byte budget. UTF-8 size includes the provenance line. SC-INTERRUPT advances nothing on a lost acknowledgment; stop-sync preserves state. Retry must be idempotent at the receiver. Invalid offsets fail without mutation; valid zero budget sends nothing.

Scenarios cover normal two-track capture, required quantity, ambiguous handwriting, invalid date/unit, missing enclosure, missing task owner/due, amendment/forward deduplication, conflicting instructions, unknown schedule category, operation replay/reversal and edit/delete merge, stale/unreviewed approval, durable offline reload, failed storage writes, resumed priority transfers, interrupted acknowledgments, invalid offsets, hostile text, empty state, reset cancellation and unscored human review. ExpectedBehavior contains exact error text, values, head sets, offsets or preservation requirements as applicable. Storage failure and reload inputs are failure-injection descriptions for later application tests; they are not proof of browser durability.

BENCHMARK-01 assumes 24 manual and 9 assisted minutes per packet for 8 packets: `(24−9)×8/60 = 2` estimated hours. Six independent planted-error scenarios contain seven errors (missing owner and due count separately); expected detection is 7/7. This denominator covers those planted field errors only, not all recovery scenarios. Runtime elapsed time must be reported separately. Fleet SME timing, actual error reduction, Sailor-panel judgment and official rubric scores remain absent. The review worksheet stays “Awaiting human assessment”; weights total 100, with no assigned scores. Owner transition decisions and delivery/deployment approval are not supplied.

## Validation and limits

Local preparation checks validate JSON shape/types, unique IDs, source and operation references, immutable graph parent ordering/acyclicity, digest and UTF-8 byte counts, source citation ranges, retention-date arithmetic, and transfer budget expectations. These checks establish fixture consistency only. They do not establish source-format adequacy, application behavior, OCR accuracy, official compliance, durable storage, authenticated transport, encryption, actual synchronization or operational readiness. Host validation/freezing is still required. Preserve both data files for downstream reuse; embed the exact needed fixtures into the application rather than fetching local files. All exports and displays must retain synthetic provenance.

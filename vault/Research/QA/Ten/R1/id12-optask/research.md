# Reuse research: traceable OPTASK extraction

Research date: 2026-11-04. Phase: research only. Data boundary: synthetic-only.

## Decision and scope

Adapt the supplied deterministic message parser and timestamp helper as a synthetic baseline; adopt the recipe's original-input preservation and review principles. Reject Tesseract and Apache Tika for the current pasted-text workflow. These are scope-specific decisions, not judgments about those projects' overall quality. Neither external candidate was fetched, installed, exercised or benchmarked.

The full source requirement remains raw USMTF extraction of frequency plans, crypto change-over windows and flight quarters times into a consolidated timeline. The synthetic slice proposed in `scope.md` does not establish that requirement or the mock-USMTF 24-hour deliverable. No supplied evidence establishes a reviewed mapping to those event types. Requirements and intake scope remain unchanged. This report supplies reuse options and questions, not an implementation plan, architecture update or acceptance contract.

## Sources and evidence status

Assigned instructions read and applied: `.fleet/skills/fleet-research/SKILL.md`, `.fleet/skills/fleet-evidence/SKILL.md`, and `.fleet/skills/fleet-messages/SKILL.md`. Also read `requirements.md`, `scope.md`, `.fleet/README.md`, `.fleet/quality-contract.md`, `.fleet/packet.json`, the relevant local toolkit source and reference fixtures.

Primary-source links supplied by the packet:

- [Norfolk use case 12](https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12): requirement authority as captured in the local packet; live page uninspected. Packet `challenge.capturedOn` is `2026-11-04`, `sourceScope` is `detail`.
- [Tesseract repository](https://github.com/tesseract-ocr/tesseract): candidate lead from `recipe.components[0]`; live repository, release metadata, documentation and license uninspected.
- [Apache Tika project](https://tika.apache.org/): candidate lead from `recipe.components[1]`; live project, release metadata, documentation and license uninspected.

No browser or external retrieval was used. An upstream license name or current release cannot be established from a project name or URL. No installed dependency inventory, license file, lockfile or upstream release evidence for either external candidate was supplied.

Local source register follows. IDs are workspace-relative paths; SHA-256 identifies the exact inspected revision, not an upstream release. Except for the packet's capture date, upstream revision dates/timestamps are unknown. All were inspected on 2026-11-04.

| Source ID | Inspected SHA-256 revision | Evidence location and exact excerpt |
| --- | --- | --- |
| `.fleet/packet.json` | `1aef4ee085ffcee39deed75e69d889cea2c4753b88dc8f1a425e556d7541d098` | `recipe.approach`: “Preserve original input, parse known structures deterministically, and send unsupported or ambiguous fields to review. Add OCR only for scanned inputs; evaluate it against field-level ground truth.” |
| `.fleet/toolkit/messages.js` | `1f00e4691f3c20f5b15149a258b288268494003dcd18271e4751ef8179e76aad` | Exact comment: “Synthetic format only. Offsets are UTF-16 string indices, not bytes.” Return metadata: `grammar: 'fleet-synthetic-message/v1', offsetUnit: 'UTF-16'`. |
| `.fleet/toolkit/validation.js` | `af583a5bd565d77b9b1dfdfa50d17344c2518c5d196aa249139fb552c98b778f` | `timestamp` comment: “Strict ISO timestamp with an explicit timezone, rejecting JS Date rollover.” Source includes `year < 1900` rejection and explicit offset validation. |
| `.fleet/fixtures.json` | `5f4d1df7318a473d76d8603a025c042c3e56bdfd2f731489d9a9ba3ea2ee507b` | `classification`: “synthetic”; `scope`: “toolkit-reference-inputs”; message fixture includes `TASK/T-02/tomorrow/TEAM-ALPHA/Confirm missing date//`. |
| `.fleet/toolkit/package.json` | `f69ed17eea98f49ee075f676bae79df9cb779e54d5887b94d94313d34511170c` | Complete contents express only `"type": "module"` and `"private": true`; no package version, license or runtime range. |

`fleet_search_evidence` was used against these supplied local documents for `USMTF` and `UTF-16`. The packet match for USMTF returned UTF-16 range `[538,938)` beginning with the requirements block. The parser match for UTF-16 returned `[18,418)`, containing the exact synthetic-format comment above. These are lexical pointers, not proof of applicability, accuracy or integration. The search corpus used `approved: true` to designate the selected supplied research documents, not SME approval. Its required `updatedAt` was normalized to `2026-11-04T00:00:00Z` from the session/capture date for retrieval only; this is not an observed file modification or upstream publication timestamp. Search “not stale” results therefore do not verify upstream freshness. No excluded, future-dated or stale document is relied on for a current domain claim.

## Candidate decisions

| Component or approach | Decision | Fit and supplied evidence | Effort, risks and missing evidence |
| --- | --- | --- | --- |
| Recipe: preserve original input, deterministic parsing, review ambiguous fields | Adopt | Packet `recipe.approach`; directly supports traceability and recovery in intake. | Review state, edits and exports still need application behavior. Source changes must invalidate stale results. Adoption of a principle is not proof of a working workflow. |
| Local `extractMessages` in `.fleet/toolkit/messages.js` | Adapt | Static inspection shows EVENT and TASK token parsing, per-field half-open UTF-16 spans, source IDs, warnings, duplicate-ID and missing-field review reasons. Grammar identifier is `fleet-synthetic-message/v1`. | Moderate adaptation for a synthetic demo; domain effort remains unknown. No category/frequency/crypto/flight schema, daily timeline, review UI or export. Fields cannot contain slash/newline. Preserve immutable source and separate corrections from extracted literals. Library version/license unverified; grammar v1 is not a package release or USMTF version. ESM/browser compatibility is untested. |
| Local `timestamp` in `.fleet/toolkit/validation.js` | Adapt | Static source accepts explicit Z/numeric offsets, checks calendar fields and returns normalized ISO UTC or null. | Low reuse effort for accepted ISO forms; date grammar and display-timezone rules still need explicit decisions. Year floor 1900, no named zones or recurrence semantics, and no domain-specific time authority. Cross-midnight clipping and day boundaries are application concerns. No runtime or timezone verification performed. Version/license unverified. |
| Supplied message fixture | Adapt as illustrative input; reject as independent accuracy evidence | One training EVENT, one valid TASK and one relative-date TASK are supplied. | Does not represent the three requested categories or establish USMTF correspondence. Missing held-out answer keys, non-event corpus, coverage and independent review. Reusing the same fixture for parser development and accuracy scoring would not establish generalization. |
| Tesseract | Reject for current scope | Packet rationale: “Candidate for scan OCR; handwritten accuracy requires a separate benchmark.” Intake proposes pasted text and excludes scans. | OCR adds an input stage without addressing category mapping or timeline needs. If scans enter scope later, image-coordinate provenance, text alignment, confidence handling and field-level OCR benchmarks need evaluation. License, version, language/model assets, runtime footprint, browser/offline compatibility and integrations are unverified. No OCR performed. |
| Apache Tika | Reject for current scope | Packet rationale: “Candidate for heterogeneous file text extraction before field parsing.” Intake excludes heterogeneous import. | Extracted/normalized text may lose original layout or offsets; original-file provenance would need a separate mapping. Runtime, packaging, file safety, supported formats, offline operation and transport requirements are unverified. License/version unverified; no file extraction exercised. |
| LLM extraction fallback | Reject for current research recommendation | Messages skill conditionally requires validated structured output, checked spans and held-out precision/recall; no model or benchmark is supplied. | Adds an unmeasured extraction path and unresolved synthetic-data/offline runtime constraints. It cannot fill missing dates or establish domain authority. No model, connector, license, version or integration evaluated. |

The assigned `fleet_extract_messages` capability is not available to this phase and was not invoked. Inspection of its local baseline does not demonstrate that a hosted connector or tool behaves identically. No other operational connector was contacted.

## Concrete integration findings

The parser accepts a source ID up to 200 characters and source text up to 200,000 JavaScript code units. It emits records with raw field slices, normalized timestamps and review reasons. A consumer must preserve the original string exactly: newline conversion, trimming or Unicode normalization before evidence display would invalidate spans. Source inspection indicates handling for LF and CRLF; Unicode and mixed line-ending correctness remain untested.

Empty or whitespace-only source yields no items or warnings and consequently `needsReview: false` by static inspection. That is a mismatch with the required explicit empty-input recovery behavior in MSG-02; a consumer cannot treat that flag alone as successful extraction. Unsupported lines produce warnings, but valid records can coexist with them. End-before-start records retain timestamps with a review reason. Duplicate identifiers flag the later record; both source records remain in the result. Review and schedule eligibility must account for these cases rather than treating every emitted item as authoritative.

EVENT has interval fields; TASK has only a due time. Neither assigns any of the three requested categories. Guessing category from free text or turning a TASK into a window would introduce unsupported domain meaning. A documented synthetic mapping is an option for a demonstration, but requires a visible distinction from a reviewed mock-USMTF mapping. The latter is absent.

A local parser has no network dependency in its inspected module imports, but this establishes neither an offline application nor first-load availability. Asset availability, local startup, review state, timeline rendering and downloaded export must later be exercised together. No persistence or reload guarantees are evidenced here.

## Acceptance implications and unresolved questions

All seven canonical IDs remain in scope; none passes on research evidence.

| ID | Reuse implication and evidence still needed |
| --- | --- |
| UC12-1 | Baseline lacks reviewed USMTF/category coverage and a timeline. Full requirement remains unverified; a synthetic slice cannot establish it. |
| MSG-01 | Per-field spans are a promising baseline. Actual application checks must compare every emitted slice to immutable source, including Unicode, mixed CRLF/LF and corrections. |
| MSG-02 | Explicit-zone parsing and warnings help, but empty input requires additional behavior. Missing timezone, invalid dates, duplicates, unsupported lines and successful correction need evidence. |
| MSG-03 | UTC normalization is present in source; equivalent-offset instants, cross-midnight duration and daily display/export remain unverified. |
| MSG-04 | No independent held-out answer key, approved matching rules, sample size or numerical thresholds supplied. Reference fixtures cannot substitute for human-reviewed accuracy evidence. |
| MSG-05 | Offline parsing alone is insufficient. Disconnected application review, timeline and export remain unverified. |
| DELIVERABLE12-1 | No supplied application or daily schedule. Meaning of synchronized mock USMTF and acceptance of the synthetic demonstration require owner/SME assessment. |

Questions for planning and domain review: Who owns the synthetic category mapping and eventual USMTF mapping? What distinguishes point events from windows, what day/timezone basis applies, and how should overlaps or unresolved intervals appear? Which edits and review acknowledgments may permit schedule inclusion or export? Who independently authors held-out expected fields, spans and instants, and sets precision/recall thresholds? What local startup, browser, persistence and export expectations are acceptable? These are recorded gaps, not invented policy or requests for operational access.

The planner should retain source-versus-recipe provenance and the full meanings of UC12-1 and DELIVERABLE12-1. The quality contract requires reasoned deferral where only a partial demonstration is supported. Planning artifacts, application tests and browser journeys belong to subsequent phases; this report does not define or modify them.

## Research completion and limitations

Generated: this research report only. Runnable application: not produced. Application tests and browser checks: not run. Reviewer acceptance and operational validation: not established. External versions, licenses, compatibility, integrations, handwriting recognition and actual-message accuracy remain unverified. No dependencies installed, application implemented, external systems contacted, deployment attempted or toolkit files edited. Static source findings and lexical retrieval are reuse evidence only.

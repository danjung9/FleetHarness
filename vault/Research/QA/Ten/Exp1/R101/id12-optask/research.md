# Reuse research, Traceable document extraction, challenge 12

Primary deferrals: none. Research date: 2026-11-04. Boundary: synthetic-only, local inspection. This report supplies reuse decisions and questions for planning; it does not define an implementation plan or establish acceptance.

## Evidence boundary and source links

Read `requirements.md`, `scope.md`, `.fleet/packet.json`, `.fleet/README.md`, `.fleet/quality-contract.md` and the three assigned research, evidence and messages skills. Inspected the supplied message parser, validation helpers, package metadata, manifest and reference fixtures. Used `fleet_search_evidence` on these supplied documents for Tesseract, Apache Tika, UTF-16, FREQPLAN and timestamp. Retrieval is lexical evidence discovery, not factual validation or independent domain review.

Primary-source leads supplied by the packet:

- [Norfolk challenge 12](https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12): local captured requirement and deliverable are available in the packet, capturedOn 2026-11-04. Live page, revisions since capture and full USMTF specification are unverified.
- [Tesseract project repository](https://github.com/tesseract-ocr/tesseract): candidate URL only; repository contents, release, license and dependencies were not retrieved.
- [Apache Tika project site](https://tika.apache.org/): candidate URL only; documentation, release, license and dependencies were not retrieved.

No web access, installation, parser execution, connector exercise, application test or browser verification was performed. No external release, license, runtime compatibility, OCR accuracy or operational integration is verified. Local source inspection supports only the behavior described by that source, not demonstrated runtime correctness.

## Reuse decisions

| Candidate / component | Decision for this scope | Fit and concrete integration effort | Missing evidence / risk |
| --- | --- | --- | --- |
| Recipe: preserve input, deterministic extraction, explicit review | **Adopt** the approach | Direct fit for exact evidence, unresolved records and human confirmation. Requires immutable input revisions, separate reviewed output and stale-result handling; moderate application work remains. | Approach supplies neither UI nor independent answer key. No real-format compliance follows from adopting it. |
| Supplied `.fleet/toolkit/messages.js` / `fleet_extract_messages` baseline | **Adapt** the patterns; reject unchanged use as the challenge parser | Source spans, line warnings and review reasons are useful. The parser recognizes slash-delimited EVENT/TASK records only. Scope instead names OPTASK metadata and pipe-delimited FREQPLAN, CRYPTO and FLIGHTQTRS. Substantial domain adapter/parser work is needed to extract all three categories and category-specific fields directly from source. Preserve `.fleet/` unchanged. | No daily visualization, review workflow, named category mapping, CSV or JSON exports are supplied by this module. Converting pipe records to generic EVENT strings would lose original offsets unless an exact mapping back is retained. Automatic manual category substitution would violate scope. Tool invocation is not available in research and was not attempted. |
| `.fleet/toolkit/validation.js` timestamp helper | **Adapt** as a local validation reference or reuse candidate | Inspected function requires explicit Z/numeric offset, checks calendar days and normalizes to ISO UTC; useful for MSG-02/03. Integration still needs clear field errors, full interval preservation and day clipping separate from source timestamps. Low helper effort, moderate workflow effort. | Source limits include years >=1900, offsets up to 14:00 and no fractional seconds. Planning must explicitly align supported fictional syntax and errors. Browser behavior is untested. |
| Tesseract | **Reject** for the present text-only slice; retain as a future OCR lead | Packet describes a scan OCR candidate. Scans and handwriting are excluded by scope, so OCR adds no required extraction capability here. Future inclusion would add image ingestion, field coordinates, confidence review, model/runtime packaging and a field-level benchmark; effort cannot be estimated reliably without a release and input corpus. | Version, license, language/model assets, platform/browser compatibility, offline packaging and handwriting accuracy are **unverified**. No OCR was run. This decision concerns scope fit, not an assertion about product quality. |
| Apache Tika | **Reject** for the present plain-text slice; retain as a future file-ingestion lead | Packet describes heterogeneous-file text extraction. No such attachments are required here. Future inclusion needs a chosen runtime, file limits, extraction-error handling and traceability through any text normalization; additional integration effort remains unestimated. | Version, license, transitive dependencies, runtime compatibility and deployment mode are **unverified**. No attachment extraction was run. Flattened text alone would not demonstrate exact provenance into an original binary document. |
| `.fleet/fixtures.json` message fixture | **Adapt** only as an illustrative negative-input reference; **reject** as an independent answer key | Fixture has generic EVENT/TASK and a `tomorrow` timestamp. It can inform ambiguity cases, but lacks the three named event categories, scope grammar and independent field-level expected outputs. Requires a separate held-out synthetic set with non-events. | Toolkit-reference-inputs classification is explicit. Fixture success cannot establish application correctness, precision/recall or MSG-04 human review. |
| `fleet_search_evidence` | **Adopt** for supplied-document research only | Used to locate exact excerpts and offsets. No need to make it a runtime parsing dependency for the offline application. | Caller-approved corpus filtering is not production access control. Lexical matches do not validate facts, versions, licenses or applicability. |
| LLM extraction fallback | **Reject** for this deterministic synthetic slice | No fallback dependency or evidence was supplied. Deterministic known structures suffice as the scoped option. | A future fallback would require validated structured output, exact span checks and held-out precision/recall including non-events; remote inference would conflict with the scoped offline workflow. |

## License, version and compatibility evidence

The packet lists Tesseract and Apache Tika as `candidate`, with no version or license fields. Do not infer an approved license from project names or upstream reputation. A future adoption decision needs an inspected release/tag, license and notices, dependency inventory and runtime/offline checks for that exact release.

The supplied toolkit package metadata is exactly `{ "type": "module", "private": true }` apart from formatting. It declares no package version, license, dependency list or browser support matrix. The manifest has `version: 1`; the parser returns `grammar: 'fleet-synthetic-message/v1'`. These identify manifest/grammar schemas, not an upstream software release or license grant. Local snapshot hashes below identify inspected bytes only. Distribution permission and target-browser compatibility remain unverified. No dependencies were installed or tested.

## Integration risks and options to carry into planning

1. **Source fidelity (MSG-01).** Favor direct extraction from unchanged scope grammar over preprocessing into EVENT/TASK. Track every source-derived field as zero-based, end-exclusive UTF-16 spans; derived UTC values link to source fields. CRLF, non-ASCII/surrogate pairs, leading whitespace and repeated field text can expose offset errors. User review notes have no fabricated source spans.
2. **Grammar and review mismatch (UC12-1, MSG-02).** The stock parser skips blank lines, returns no empty-input error itself and flags duplicate IDs only on later occurrences. Application review must not let an earlier duplicate silently enter an approved schedule. OPTASK header recognition, required category fields and explicit dispositions for unsupported lines are additional needs. Unknown dates stay unknown; do not use the clock or guessed timezone.
3. **Time rendering (MSG-03, DELIVERABLE12-1).** Use the scope's UTC-day convention as a fictional assumption, preserve full instants and clip only the displayed day. Its 23:30 to 00:30 flight interval spans 60 minutes, displayed 30/30 across two days. Frequency/crypto overlap is visible data, not an authoritative conflict rule. A scheduling optimizer that moves events would change the requested evidence.
4. **Review/export consistency.** Source edits must invalidate confirmation and block stale reviewed exports. Both reviewed-schedule.csv and extraction-review.json need the same reviewed event set and original revision. Escaping CSV fields and rendering untrusted source as text are necessary integration concerns; source text cannot authorize actions.
5. **Independent evidence (MSG-04).** The existing generic fixture cannot be the held-out key. A separately authored synthetic key must cover all named categories, non-events and exact fields/times; report denominators and discrepancies. Who authors the key and who performs human review remain unassigned. Automated scores cannot establish human acceptance or domain expertise.
6. **Offline delivery (MSG-05).** Local JavaScript patterns avoid a required remote parser, but an offline parse/review/timeline/export workflow is not demonstrated by inspection. Avoid runtime network dependencies. Exact disconnected-browser validation and initial-load behavior need later evidence; scope promises offline operation only after local load.

Concrete reuse options are (a) direct scope-grammar parsing using the inspected span/validation patterns, preferred for source fidelity, or (b) a reversible adapter around the supplied generic parser with an explicit original-source mapping. Option (b) adds provenance complexity and still needs category extraction, review and timeline behavior. Neither option has been implemented or tested. OCR and heterogeneous ingestion are excluded options for this slice, not deferred replacements for the full synthetic workflow.

Open questions: the exact fictional grammar and input-size policy need a planning decision; current scope supplies a workable example, while the toolkit caps text at 200,000 JavaScript code units. Independent key authorship, human review ownership and local state retention need explicit choices. Actual USMTF variants, SME-reviewed semantics, operational retention rules and authority for real adoption remain external qualification questions. Missing specifications or experts do not justify omitting the complete synthetic workflow.

## Traceable supplied evidence

Source identifiers below are workspace paths. Revision means SHA-256 of inspected bytes. Packet capture date is 2026-11-04; other upstream revision/publication timestamps are unknown. The retrieval API required `updatedAt`, so 2026-11-04T00:00:00Z was supplied as an explicitly synthetic corpus bookkeeping timestamp, not a claimed file modification/publication time. `approved: true` meant selected for this local research corpus, not authoritative or SME-approved. No freshness conclusion follows from the returned `stale: false` flags. No excluded/future/stale document was used to support a current domain claim.

| Source ID | Snapshot SHA-256 |
| --- | --- |
| `.fleet/packet.json` | `f7743f56ef69bb311ccb5425a62a67d2ce370a1160374cc7c7c7244b99ce93f4` |
| `requirements.md` | `03d7cf160010a653a25ec73d68936084d5bc9f1d1955efe319e1e08b434934e4` |
| `scope.md` | `d5dc67469e190f379eb4127f6082dee3693557f3437f0b0e763c7753acb71a23` |
| `.fleet/toolkit/messages.js` | `1f00e4691f3c20f5b15149a258b288268494003dcd18271e4751ef8179e76aad` |
| `.fleet/toolkit/validation.js` | `af583a5bd565d77b9b1dfdfa50d17344c2518c5d196aa249139fb552c98b778f` |
| `.fleet/toolkit/package.json` | `f69ed17eea98f49ee075f676bae79df9cb779e54d5887b94d94313d34511170c` |
| `.fleet/fixtures.json` | `5f4d1df7318a473d76d8603a025c042c3e56bdfd2f731489d9a9ba3ea2ee507b` |
| `.fleet/skills/fleet-messages/SKILL.md` | `ee65ea6526a2b650c6e89236d9f879d3f2a45d8523c761cfc53eb8b1ac18878c` |
| `.fleet/quality-contract.md` | `2db750e17daf686c3eb828618de37f4a5e833272b9ba902174d35ff716aa6f57` |

Exact evidence excerpts (offsets where supplied by lexical retrieval are UTF-16, end-exclusive):

- `.fleet/packet.json`, `recipe.components[0].rationale`: “Candidate for scan OCR; handwritten accuracy requires a separate benchmark.” Retrieved window [1907,2307) also contains the Tesseract name and primary-source URL.
- `.fleet/packet.json`, `recipe.components[1].rationale`: “Candidate for heterogeneous file text extraction before field parsing.” Retrieved window [2144,2544) contains the Tika name and URL.
- `scope.md`, retrieved window [1170,1570): “Tesseract and Apache Tika are listed candidates for scanned/heterogeneous inputs; those input types are outside this text-only slice.”
- `.fleet/skills/fleet-messages/SKILL.md`, retrieved window [697,1097): “Source spans are UTF-16 indices for JavaScript `slice`, not byte offsets.”
- `scope.md`, retrieved window [5128,5528), exact example line: `FREQPLAN|FP-01|Training Alpha|225.500|MHz|2026-11-04T06:00:00Z|2026-11-04T08:00:00Z`.
- `.fleet/toolkit/validation.js`, retrieved window [1264,1664): “Strict ISO timestamp with an explicit timezone, rejecting JS Date rollover.” This comment is source intent; the function was inspected, not executed.
- `.fleet/toolkit/messages.js`, exact condition: `if (!((kind === 'EVENT' && tokens.length === 6) || (kind === 'TASK' && tokens.length === 5)))`. This supports the grammar mismatch conclusion without claiming runtime verification.
- `.fleet/fixtures.json`, exact metadata: `"classification": "synthetic"` and `"scope": "toolkit-reference-inputs"`.

## Phase completion and limitations

Generated: this research report only. Application runnable/tested: not assessed. Human reviewer acceptance: not performed. Operational validation: not performed. All seven acceptance IDs remain unverified in research. No requirements, scope, packet, toolkit, frozen contracts or host evidence were changed. Planning and implementation remain for their assigned phases.

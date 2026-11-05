# Reuse research: traceable OPTASK extraction

Research date: 2026-11-05. Phase: research only. Recommendation: **adopt bundled `node-service` 1.0.0 with an adapted `messages` computation pack**. This is a recommendation for the planner; no foundation selection contract, implementation plan, application or deployment was created.

## Scope and evidence boundary

No primary synthetic workflow deferrals are proposed. Preserve every canonical criterion: UC12-1, MSG-01 to MSG-05, DELIVERABLE12-1, DESC12-1, DESC12-2, SUMMARY12-1, SCOPE12-3, SCOPE12-5 and SCOPE12-7. The three named outputs, frequency plans, crypto change-over windows and flight quarters event times, must all be extracted from raw mock message text into a synchronized 24-hour schedule. A generic EVENT/TASK demonstration would omit defining behavior.

`requirements.md`, `scope.md`, `.fleet/packet.json`, the assigned four skill entrypoints, foundation catalog/guide, quality contract, solution contract, toolkit message/validation source, input manifest and prepared data artifacts were inspected. The input manifest has no attached sources and mandates synthetic mode. The data files now exist; scope's earlier statement that data preparation was pending is historical. Reuse the exact prepared fixtures without changing scope, source requirements or data artifacts. All examples are **synthetic, not validated against the real USMTF format**. Real-format conformance and operational accuracy remain unverified; absence of a specification or SME is not a reason to omit the complete synthetic behavior.

The [challenge source](https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12) was requested through Python's standard-library HTTP client and returned **403 Forbidden**. Its live contents were not inspected. Requirement claims therefore come from the preserved local packet/requirements, not a successful live retrieval. No operational records, connectors or remote systems were accessed.

## Reuse decisions

| Candidate | Decision | Evidence, fit and integration effort |
| --- | --- | --- |
| Bundled Node service 1.0.0 | **Adopt, recommended** | Catalog identifies an AppYard original, dependency-free local HTTP service with browser client, error handling and replaceable computation. `/health` and `/api/invoke` match the harness. Low setup effort; substantive domain work remains. Extend the copied shared backend rather than rebuild the adapter or put a separate parser in the browser. Source files are materialized only after planning, so actual adapter behavior and compatibility have not been tested. |
| `messages` pack / `extractMessages` | **Adapt, recommended** | Inspected `.fleet/toolkit/messages.js` preserves original input and UTF-16 line/field offsets, handles LF/CRLF, and retains warnings/review reasons. It recognizes only six-token EVENT and five-token TASK records. It cannot parse the prepared MSGID/UNIT/DAY/FREQPLAN/CRYPTO/FLIGHTQ grammar, consolidate a daily axis, manage revisions, or provide review/export. Medium domain adaptation effort; the pack is a reusable starting pattern, not the requested parser. |
| Toolkit `validation.js` | **Adapt** | Object/text guards and explicit-zone Gregorian timestamp validation are useful. Timestamp helper accepts optional seconds and years >=1900; fixture grammar has minute precision only and normalized outputs include seconds without milliseconds. Its result uses `toISOString()` with milliseconds. Integration must preserve the fixture grammar and planned output representation rather than silently inherit these differences. No runtime test performed. |
| Prepared synthetic fixtures and data README | **Adopt unchanged** | Five documents, 14 keyed events, 12 scenarios, explicit UTF-16 spans and independently authored expectations. This is the domain evidence foundation. Embed needed sample raw text in self-contained `index.html`; do not fetch local data files. Do not ship expected-answer arrays as a substitute for computation. Medium coverage/review effort, no data acquisition needed. |
| Python service 1.0.0 / custom computation | **Reject for this scope** | Catalog requires installed Python >=3.10 and custom pack. Local `python3 --version` reports 3.9.6. A Python rewrite adds setup and UTF-16 translation while existing JavaScript patterns fit. No Python service was launched; this is not a statement that another Python interpreter cannot exist. |
| Custom foundation | **Reject** | No incompatibility with bundled Node service is established. Scope explicitly permits a local service while external connectivity is absent. Custom would recreate setup and lose provenance benefits. |
| Scheduling, offline, evidence and readiness computation packs | **Reject as primary packs** | Catalog functions solve assignment constraints, reconcile records, search evidence or analyze dependencies. None supplies the required domain extraction. An event timeline is not resource optimization; the offline pack is not browser offline execution. No need to add these packs for the bounded workflow. |
| Tesseract | **Reject for current text-only scope; reconsider for scans** | Primary README describes image OCR engine/CLI, image inputs, and text/coordinate-oriented outputs. No supplied scans require OCR. Adds native engine, image preprocessing, language data and a new field-level benchmark. It would not supply category mapping or actual USMTF conformance. License and source-version evidence below; no OCR installation or accuracy test performed. |
| Apache Tika | **Reject for current raw-text scope; reconsider for heterogeneous attachments** | Primary site describes extraction of metadata/text from many file types. Existing inputs are raw text, so format conversion adds a JVM/service/dependency surface without solving event extraction. Extracted text offsets would not automatically identify original binary-document coordinates. License/version evidence below; no Tika instance, attachment parser or connector exercised. |
| External LLM extraction fallback | **Reject for this bounded grammar** | Exact synthetic syntax permits deterministic extraction and explicit abstention. No model, credential or representative accuracy benchmark is supplied. A fallback would add network/model failure modes and require structured-output/span validation plus held-out precision/recall. Reconsider only if authorized formats exceed deterministic coverage with measured benefit. |
| Vite / create-fastify / FastAPI template reference links | **Reject as additional foundations** | Catalog lists these as references, explicitly says no upstream starter is vendored. Bundled HTTP adapter already covers setup. These candidate links were not inspected; their versions, licenses and compatibility are unverified. Do not attribute capabilities of those projects to the bundled template. |

## Foundation, version and license evidence

The local catalog pins **template version 1.0.0**, not a tested application revision. It requires Node >=22.19; `node --version` reports **v26.0.0** here. This satisfies the stated version minimum but does not demonstrate clean-runtime startup, API behavior or compatibility. The [official Node HTTP documentation](https://nodejs.org/api/http.html) was fetched successfully; its page identifies v26.13.0, which is different from the installed runtime. No inference is made that those versions have identical behavior. The [Node license](https://raw.githubusercontent.com/nodejs/node/main/LICENSE) was inspected: MIT-style core terms with separate third-party notices. This is not a license for AppYard's original template/toolkit. No standalone license or toolkit release version was found in the inspected local catalog/toolkit package metadata; redistribution terms for those components remain **unverified**. Host provenance and the materialized `foundation-lock.json` must be inspected downstream. The Ponytail skill's MIT license does not establish the application's license.

[Tesseract README](https://raw.githubusercontent.com/tesseract-ocr/tesseract/main/README.md), [LICENSE](https://raw.githubusercontent.com/tesseract-ocr/tesseract/main/LICENSE) and [VERSION](https://raw.githubusercontent.com/tesseract-ocr/tesseract/main/VERSION) all returned 200. The inspected main-branch VERSION contains `5.5.4`; LICENSE contains Apache License 2.0. This is a mutable branch observation, not a pinned release or installed binary. README describes required trained data and available C/C++ interfaces; wrapper compatibility, model licenses and accuracy on scans/handwriting remain unverified.

The [Apache Tika site](https://tika.apache.org/) returned 200 and advertised release **4.2.0**, dated 28 October 2026, with a supported 3.3.3 maintenance line. The site describes Java 17 for the 4.x major line. The inspected [main POM](https://raw.githubusercontent.com/apache/tika/main/pom.xml) has an Apache License 2.0 header and references NOTICE; the attempted root `main/LICENSE` URL returned 404. Thus source-header license evidence exists, but a complete selected-release license/NOTICE and transitive dependency review is **unverified**. No release artifact was downloaded, checksum verified, JVM checked or compatibility tested.

These are primary-source HTTP inspections, not web-search summaries. Mutable source branches are not release pins. None of the rejected external candidates was installed.

## Data fit and concrete integration risks

The fixtures' invented grammar v1 has mandatory synthetic banner and MSGID/OPTASK, UNIT and DAY headers; FREQPLAN has PLAN/NET/MHZ/UNIT and explicit start/end, CRYPTO has dummy REF and explicit window, and FLIGHTQ has context/start with optional end. This maps the required categories under disclosed fictional assumptions. It does not establish a reviewed mapping to actual USMTF message families.

The prepared scenarios establish useful reuse boundaries:

- S01: DOC-DENSE is 216 lines, four events and 207 REMARK exclusions. Remarks include Unicode and instructional-looking inert data. Preserve raw input and render it safely as text.
- S02 to S04: combine documents, retain overlaps, normalize equivalent instants, filter fictional ships, and clip only the displayed portion to the half-open UTC day `[0,1440)`. Actual timestamps/durations and out-of-day records must remain available. A midnight point differs from an interval ending at midnight.
- S05: deduplicate identical document identity plus unchanged content; retain conflicting revisions and both FQ-B times with REVISION_REVIEW. A higher revision number is not authority to supersede. Identity/content collisions and review edits require provenance rather than silent replacement.
- S06 to S12: unsupported line, missing zone, invalid calendar date, missing endpoint, reversed interval, invalid frequency and empty input have explicit diagnostics and recovery text. Header display zone cannot supply an absent event zone. A failed parse cannot imply a confirmed empty schedule.

The existing line scanner is reusable but a whole-input whitespace trim, Unicode normalization, newline rewrite or byte-index conversion would invalidate UTF-16 evidence. Data uses LF; the assigned message skill also requires mixed CRLF/LF coverage downstream without altering prepared files. Every normalized value needs a link to original field evidence; derived durations must not be represented as literal source text. Review edits must remain separate from parsed values and invalidate stale schedule/export results appropriately.

The Node service can support internet-disconnected use if all assets, samples and computation remain local and the service is running. It cannot provide new parsing after that service stops. Scope already states this distinction. No service worker, offline persistence or browser network-disconnection behavior is supplied by the computation pack; MSG-05 requires later integration evidence, not a claim based on dependency-free source alone.

Timeline visualization, accessible keyboard controls, narrow-screen readability, source selection, uncertainty editing, review state and truthful exports are application gaps in every inspected extraction candidate. A successful parser call would not verify them. Necessary additions are domain workflow work; no new general-purpose framework has been justified by this research.

## Handoff to planning and remaining evidence gaps

Planning should evaluate the recommended foundation and pack, define the full public invocation protocol and independent outcomes, and preserve all 13 canonical IDs and their provenance aliases. The host copies the foundation after selection. Keep its shared backend as the computation used by both UI and evaluator; include required pack files and provenance in the declared runtime manifest. This research does not select protocol shapes, write architecture updates or freeze contracts.

Use the exact supplied sample/scenario records. DOC-VARIATION is explicitly a public evaluation candidate, **not a sealed holdout**. Planning must author independent synthetic variations before implementation and let the host seal answers. Proposed deterministic precision/recall targets in scope are intake proposals, not source-supplied acceptance thresholds. Toolkit fixtures, source inspection, helper tests and lexical matches do not establish application correctness. Later application/core/browser tests and host-recorded visual review at desktop and narrow widths remain mandatory; no such test has run in this phase.

Non-blocking real-use unknowns: actual USMTF families/revisions and field mapping, authorized representative benchmark, operational ship/revision/cancellation rules, timezone policy, export/retention needs, and operational review authority. Resolve these before any real-format or operational claim. No missing user decision blocks the already scoped synthetic workflow, so no clarification is requested. Owner approval remains required before delivery/deployment; research performs neither.

`fleet_helpers` discovery returned no helpers. No custom helper was needed. `fleet_search_evidence` retrieved packet MSG-01 from a supplied exact-text excerpt (range [0,47) within that excerpt); it is lexical evidence only. Initial requests with a date-only asOf and fractional updatedAt were rejected by its timestamp validator; a seconds-resolution request succeeded. Those tool validations are not application tests.

## Source ledger

Local revisions below are SHA-256 of inspected bytes. Timestamps are filesystem modification times in UTC, not claims about upstream publication or independent approval. Exact excerpts are retained to make important local claims traceable. The source packet additionally supplies provenance paths for canonical criteria. Public URLs above were inspected on the research date except the explicitly failed or unchecked links.

- Source `requirements.md`; revision `a5f8561d0e24b3b0e9a1f1e4b7159a8e7cc1a895f3bb241c90a5bd885a8979c8`; mtime `2026-11-05T07:56:11.161013+00:00`; UTF-16 range [362,447): “extracts frequency plans, crypto change-over windows, and flight quarters event times”.

- Source `.fleet/foundation-catalog.json`; revision `187e9ce41c03bb079e34519f398a686c7447abcd5610e2282e85749b10b092c7`; mtime `2026-11-05T07:56:11.210868+00:00`; UTF-16 range [108,126): “"version": "1.0.0"”.

- Source `.fleet/foundation-guide.md`; revision `a7f6a61e9d7fa3f8d3389afe4270dce03f2288066318d7ffb37cd0236cdf3474`; mtime `2026-11-05T07:56:11.211303+00:00`; UTF-16 range [1275,1378): “The host validates the choice and copies pinned starter files AFTER planning and BEFORE implementation.”.

- Source `.fleet/toolkit/messages.js`; revision `1f00e4691f3c20f5b15149a258b288268494003dcd18271e4751ef8179e76aad`; mtime `2026-11-05T07:56:11.214105+00:00`; UTF-16 range [2716,2753): “grammar: 'fleet-synthetic-message/v1'”.

- Source `.fleet/toolkit/validation.js`; revision `af583a5bd565d77b9b1dfdfa50d17344c2518c5d196aa249139fb552c98b778f`; mtime `2026-11-05T07:56:11.213588+00:00`; UTF-16 range [2127,2153): “new Date(ms).toISOString()”.

- Source `inputs/manifest.json`; revision `fcfe1130245c287cf29d0dc10ac8031ecbb516f0f23b2c0d6ea4e08438e2adc2`; mtime `2026-11-05T07:56:11.150372+00:00`; UTF-16 range [43,56): “"sources": []”.

- Source `data/README.md`; revision `8f80c43353f7a99ffeb34dba7c3497718ee1f2fbb5810d2733ad2baa7cdd749b`; mtime `2026-11-05T07:59:46.056917+00:00`; UTF-16 range [8836,8869): “DOC-DENSE: 216 lines, four events”.

- Source `data/synthetic-data.json`; revision `36e232d110e0f60635e69b2033f7dba965346bd4b94b8aa16388b7645ff20f73`; mtime `2026-11-05T07:59:46.033271+00:00`; UTF-16 range [1907,1932): “"documentId": "DOC-DENSE"”.

- Source `scope.md`; revision `8f3d044136c8f61a1d13b782ea6b6ebeee71df48d5def94b8b299f4ed730d7dc`; mtime `2026-11-05T07:57:27.579175+00:00`; UTF-16 range [21,72): “None for the complete synthetic prototype workflow.”.

Public inspection fingerprints (SHA-256 of fetched bytes; no release artifact verification): Tesseract README `1a14c7cd54039ffb79e05aff12841f48d4d4da50f231ee98e7e9bb6138d03e7a`; Tesseract VERSION `700f229a57ae9fd02ed761816c7411d4a8bc76101330692764cff95a0ce1dec1` (exact content `5.5.4\n`); Tesseract LICENSE `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`; Tika homepage `6dd87629d24acf3afb74dd39e43c582310e2eca8e69ed58811ce675301532f6f`; Tika main POM `4627a7de134f8ce76ca2d75b97639ad22f7951520e0d61c503ab7a3ea5db28b2`. These identify inspected responses, not an installed dependency lock.

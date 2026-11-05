# Reuse research: validated engineering calculations

Research date: 2026-11-04. Boundary: synthetic-only, local workspace inspection. This document applies the assigned fleet-research, fleet-evidence and fleet-physics skills. It preserves requirements.md and scope.md; it is neither an implementation plan nor engineering approval.

## Finding

Adopt the recipe's authority-first constraint and adapt only structural intake support where useful. No supplied candidate can calculate mooring forces, verify NSTM limits, optimize tug assistance or produce approved safety margins. Missing engineering authority remains a blocking dependency for those source outcomes. The scenario-review demonstration proposed in scope.md remains a limited option, not a replacement for the full challenge.

The packet's `recipe.components` and `recipe.tools` are both empty. There are no named external library candidates or repository URLs to evaluate. The bundled toolkit was inspected as an additional local reuse possibility. No dependencies were installed, no toolkit or application tests were run, and no connectors were exercised.

## Sources and traceability

The primary challenge link supplied by the packet is [challenge 10](https://cdao.hackathon.maximus.com/event/norfolk/use-cases/10). It was not fetched. Claims below concern the supplied snapshot, not independently inspected website contents. NSTM 582 (Mooring and Towing) is a named resource only: no official document URL, edition, amendment, passage, equations, units or limits are supplied. An official link cannot responsibly be inferred.

| Source ID | Local evidence and revision/timestamp | Exact excerpt and locator | What this establishes |
| --- | --- | --- | --- |
| S1 | `.fleet/packet.json`, schemaVersion 1; challenge capturedOn 2026-11-04; upstream revision/time unknown | `recipe.approach`: “Obtain the authoritative equations, units, limits and revision first. Implement deterministic math with boundary tests; use AI only to assist input and explain approved calculations.” | Supplied recipe constraint, not an approved engineering model. |
| S2 | Same packet snapshot | `challenge.resources`: “NSTM 582 (Mooring and Towing)”; `challenge.dataNeeds[0]`: “Authoritative engineering equations and limits”; `[1]`: “SME-validated synthetic berth scenarios” | Names the resource and outstanding inputs; does not supply them. |
| S3 | Same packet snapshot | `recipe.acceptance[0].requirement`: “Match independently validated reference cases.”; `.scenario`: “Compare each calculation and limit boundary to signed-off worked examples.” | Independent reference evidence is required. |
| S4 | Same packet snapshot | `recipe.limitations[0]`: “No MSI formula, craft limit or mooring model is invented or implemented without an authoritative input.”; `[1]`: “A synthetic UI demonstration does not establish safe operational use.” | Governs reuse and limits claims. |
| S5 | `scope.md`, intake artifact; revision and authored timestamp not supplied | Inputs and data boundary: “Only completeness, declared supported units and explicitly defined structural constraints may be validated before engineering authority exists.” | Intake recommendation; does not narrow source requirements by user approval. |
| S6 | `.fleet/README.md`, revision/time not supplied | “Toolkit tests are not evidence that the generated application works. Write application tests against its actual code.” | Separates toolkit behavior from application evidence. |
| S7 | `.fleet/fixtures.json`, revision/time not supplied | `classification`: “synthetic”; `scope`: “toolkit-reference-inputs” | Fixtures are tooling examples, not signed engineering reference cases. |
| S8 | `.fleet/toolkit/package.json`, no version, license or timestamp fields | Entire object: `{"type":"module","private":true}` (whitespace normalized) | ESM packaging is visible; release identity and reuse license are unverified. |

The assigned skills and `.fleet/quality-contract.md` were read. Their applicable restrictions are retained: no invented engineering model; no toolkit self-test as application evidence; independent literal acceptance outcomes belong to planning; host contracts/evidence are not research outputs.

### Lexical retrieval record

Used `fleet_search_evidence` on three supplied packet projections, not on remote content: `packet-recipe` = `JSON.stringify(packet.recipe, null, 2)`, `packet-challenge` = the same serialization of `packet.challenge`, and `packet-unknowns` = the same serialization of `packet.unknowns`. Source identifiers were `.fleet/packet.json#/recipe`, `#/challenge`, and `#/unknowns`. The source revision is the schemaVersion 1 snapshot described above. Offsets below are zero-based, end-exclusive string offsets in those projections, not offsets in the original packet file.

The tool requires a timestamp: `updatedAt` and `asOf` were normalized to `2026-11-04T00:00:00Z` from the snapshot capture date. This is a retrieval convention, not a known publication or modification time. `approved:true` meant eligible supplied research material, never engineering approval. With `maxAgeDays:90`, results were marked non-stale under that convention; upstream freshness remains unverified.

| Query | Retrieved evidence | Exact excerpt within returned span |
| --- | --- | --- |
| `authoritative equations limits` | `packet-challenge` [1578,1913); `packet-recipe` [16,416); `packet-unknowns` [0,283) | “Authoritative engineering equations and limits” and “SME-validated synthetic berth scenarios” in the challenge excerpt; recipe excerpt contains the full approach quoted in S1. |
| `reference cases` | `packet-recipe` [426,826) | “Match independently validated reference cases.” and “Compare each calculation and limit boundary to signed-off worked examples.” |
| `NSTM` | `packet-challenge` [912,1312) | “NSTM 582 limits. The agent must recommend optimal tug assist horsepower, line sequences, and issue warnings when wind gusts threaten breaking line thresholds.” |

Retrieval establishes lexical occurrence only. Other matches, including a partial term match on the challenge's references field, supplied no additional domain evidence. No excluded or future-dated source supported a conclusion. No freshness label establishes current applicability of NSTM provisions.

## Candidate decisions

For every bundled module below, the only inspected primary source is the linked local code. No module-specific release/version or license evidence was found in the inspected bundle; S8 applies to all. License, distribution rights, upstream provenance, supported runtime versions and application compatibility remain unverified. The packet manifest has `version:1` and a bundle hash, but these are not a library release version or license grant. Decisions are technical research judgments, conditional on resolving reuse rights before redistribution.

| Candidate and inspected primary source | Decision | Fit and integration effort | Missing evidence and concrete risk |
| --- | --- | --- | --- |
| Authority-first physics recipe, `.fleet/packet.json#/recipe` | **Adopt** | Direct fit for keeping deterministic approved math separate from assisted input and explanation. Low conceptual integration effort. | No equations, limits or approved inputs accompany the recipe; adopting it supplies no calculation capability. |
| [Structural validation](.fleet/toolkit/validation.js): `object`, `text`, `array`, `unique`, `integer`, timestamp helpers | **Adapt** | Potentially useful for synthetic identifiers, record structure and collection limits. Moderate effort for field-specific errors and preserving drafts. | `integer` defaults to nonnegative integer bounds up to 1,000,000,000: these are generic technical constraints, not physical limits. Wind/current values can require decimals. No unit conversion or domain validation exists. Do not transplant these defaults as craft or environment limits; `.fleet/` must remain unchanged. |
| [Evidence retrieval](.fleet/toolkit/evidence.js): `searchEvidence`; research tool `fleet_search_evidence` | **Adopt for research retrieval only; reject as engineering authority** | Already useful for tracing supplied statements, with offsets and freshness flags. Low research integration effort; optional future document review would require a separate curated corpus. | Caller supplies approval and timestamps. Substring matching and scores do not validate applicability, authority or truth. No source fetching, production access control or authoritative corpus is provided. It cannot generate force results or certify compliance. |
| [Offline reconciliation and upload budgeting](.fleet/toolkit/offline.js): `reconcileRecords`, `planUploads` | **Reject for the current scoped demonstration** | Revision graphs and byte budgets address synchronization, not the local offline review task. High relative effort to add a persistence/transport/conflict workflow absent from scope. | Source explicitly requires persistence before acknowledgement and says upload planning performs no transmission. No browser storage, offline asset cache, identity or transport is implemented. Including it would not establish PHY-03 offline behavior. Reconsider only with an explicit multi-device requirement. |
| [Message extraction](.fleet/toolkit/messages.js): `extractMessages` | **Reject** | Parser accepts documented synthetic EVENT/TASK slash grammar; no fit to scenario/environment entry. Adapting it would require a new domain parser. | No hydrographic format, direction/unit interpretation or raw-to-confirmed engineering input contract. Treating it as a hydrographic connector would fabricate integration capability. |
| [Scheduling](.fleet/toolkit/scheduling.js): `solveSchedule` | **Reject as a tug allocator or line sequencer** | Candidate-start resource feasibility is a different problem. High effort would amount to developing a new approved model. | No force balance, horsepower capability, tug position constraints, mooring geometry or optimization objective. A feasible time allocation cannot support claims of optimal tug assistance or safe line sequence. |
| [Dependency timing](.fleet/toolkit/readiness.js): `analyzeDependencies` | **Reject** | DAG timing over supplied estimates has no current requirement fit. | Source explicitly omits shared-resource constraints and operational readiness. Timing margin must not be displayed as a mooring safety margin or treated as a sequence approval. |
| [Synthetic reference fixtures](.fleet/fixtures.json) | **Reject as engineering or application verification; retain as toolkit documentation only** | Examples cover messages, schedules, record reconciliation, upload budgets, evidence lookup and dependency timing. No application integration warranted. | No berth cases, approved physics outcomes, tolerances or SME signatures. Reusing fixture arithmetic cannot satisfy PHY-01 or browser acceptance. |
| NSTM 582, named in S2; no inspectable document supplied | **Reject as a presently usable calculation dependency; retain as authority lead** | Potentially central to UC10-1 once an authorized edition and applicable provisions are supplied. Integration effort cannot be estimated responsibly before model review. | Edition, license/redistribution terms, access restrictions, applicability and all equations/limits unverified. Naming the manual is not evidence of NSTM compliance. |
| External canvas, units, physics or AI packages | **Reject selection at this research stage: no supplied candidate evidence** | A local browser-native 2D scenario layout is a concrete alternative for the intake demonstration; an external canvas library could be compared later if a candidate is supplied. | No external package link, source, version, license or compatibility evidence is supplied. No package was downloaded or tested. Neither rendering choice supplies an engineering model. |

## Acceptance implications and integration risks

These are research implications, not frozen planning dispositions or changed requirements. The original source has no published evaluation criteria, and `userScope.criteria` is empty. Intake measurable outcomes remain analyst proposals.

| Canonical criterion and packet provenance | What reuse can support | Unresolved evidence/integration barrier |
| --- | --- | --- |
| UC10-1, `challenge.requirements[0]` | Synthetic selections, input completeness and a graphical arrangement are supportable demonstration options. | Full drag-and-drop plus NSTM evaluation, optimal tug horsepower, sequences and gust warnings requires approved models, coordinate conventions, capacities and objectives. Source completeness remains deferred as described in scope.md. |
| PHY-01, `recipe.acceptance[0]` | No reusable signed reference cases found. | Authoritative equations plus independently worked, SME-signed synthetic inputs/results, tolerances and below/at/above-limit cases are absent. Generic toolkit fixtures cannot close this gap. |
| PHY-02, `recipe.acceptance[1]` | Structural checks and explicit unsupported-unit/configuration messages are possible. | Approved unit conversions, physical ranges and craft configurations are missing. Rejecting malformed data alone does not establish the complete criterion. Blank versus zero, decimal values, non-finite values and direction conventions need distinct treatment without inventing physical bounds. |
| PHY-03, `recipe.acceptance[2]` | Missing-authority display and explicit synthetic review acknowledgement fit the intake option. | Browser offline operation must be exercised on the real application. Qualified reviewer identity, uncertainty methodology and authority to approve remain unresolved; acknowledgement is not operational approval. |
| DELIVERABLE10-1, `challenge.expectedDeliverables.lines[0]` | A visibly synthetic summary/layout, walkthrough and fielding brief can communicate the limited demonstration. | No approved sheet schema, approval process, rationale basis or validated margins supplied. A complete approved safety sheet remains deferred. |

Concrete cross-cutting risks are mismatched units or wind/current direction conventions; assigning physical meaning to display coordinates; applying stale review state after scenario edits; presenting unknown outputs as zero or passing margins; confusing a local acknowledgement with qualified approval; and relying on remote assets for an offline review. These require explicit resolution and later application evidence, not fabricated domain defaults. Keeping raw observations beside confirmed numeric entries is a physics-skill constraint for any later calculation integration.

## Options and open questions for planning

The presently supportable option is the synthetic intake/review demonstration already proposed in scope.md, with engineering assessment unavailable. A calculation-bearing option is conditional on a supplied, qualified-authority-approved model and signed reference corpus. A supplied engineering library could then be assessed against that basis; there is no evidence to select one now. These are scope options, not implementation steps or an architecture selection.

Required owner/engineering inputs remain:

1. Official source copy/link, NSTM revision and applicable sections; approving reviewer; licensing and distribution permissions for equations, excerpts and any implementation.
2. Approved equations, assumptions, units/conversions, direction/coordinate conventions, applicable operating domain, supported craft/line/bollard configurations, uncertainty rules and limits.
3. Independent SME-reviewed synthetic berth cases with expected outputs, tolerances and signed below/at/above-limit examples, including invalid/unsupported configurations.
4. Tug capability inputs, meaning of optimality, placement constraints, sequencing rules and gust thresholds; no scheduler can stand in for these facts.
5. Safety-sheet fields, status vocabulary and approval authority; what the human review may legitimately acknowledge.
6. Offline browser targets, retention/export and reset expectations, and whether any future multi-device workflow is actually needed.

Research artifact generated: this document. Application generated/runnable/tested: not performed in this phase. Reviewer acceptance and operational validation: not established. All external links, dependency versions/licenses, runtime compatibility and operational integrations remain unverified. No implementation, planning contracts, source requirements, scope or host-owned evidence were changed.

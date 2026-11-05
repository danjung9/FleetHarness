# Reuse research: Transition and reproducible delivery

Research date: 2026-11-04. Phase: research only. Data boundary: synthetic-only.

## Findings and scope

The supplied recipe has **no named software candidates**: `.fleet/packet.json#/recipe/components` and `/recipe/tools` are empty arrays. No third-party repository, dependency release, license text, owner application, approved fielding checklist or platform integration was supplied. This report evaluates the recipe approach, challenge resource leads and locally available toolkit as potential reuse materials; it does not invent a candidate list or claim web research.

Preserve the full challenge in `requirements.md` and the bounded proposal in `scope.md`: a synthetic transition-package workflow for one fictional tool, recording evidence, barriers, proposed actions, ownership gaps and a reusable draft playbook. The actual challenge additionally requires the owner application, operational result approval, offline government-device operation and external fielding decisions. A complete draft record cannot establish those outcomes. No application, implementation plan, architecture or acceptance contract is produced here.

The assigned [fleet-research](.fleet/skills/fleet-research/SKILL.md) and [fleet-evidence](.fleet/skills/fleet-evidence/SKILL.md) skills, `.fleet/README.md` and `.fleet/quality-contract.md` were read. Evidence requirements inform the limitations below; test matrices and frozen browser contracts belong to later phases.

## Sources and provenance

The primary-source **lead** is [challenge 37](https://cdao.hackathon.maximus.com/event/norfolk/use-cases/37). It is linked by the supplied packet, not fetched or independently inspected. The packet reports `challenge.sourceScope = detail`, `challenge.capturedOn = 2026-11-04`, schema version 1. Capture date is not an upstream publication date, version or freshness guarantee. All challenge claims below mean “the supplied snapshot says,” not “the current website was verified.” The packet's related challenge ID 17 supplies no evaluated component or additional evidence.

| Source ID | Local source / revision identifier | Exact evidence and location |
| --- | --- | --- |
| P37 | `.fleet/packet.json`, schema 1; SHA-256 `c6876348a266cb16cffc1c625d45328bb1ab985806dd6bc3c2594eaad68e7c4e`; reported capture 2026-11-04 | `/recipe/approach`: “Begin with the owner-supplied working application, verify its behavior, then document supported devices, installation, security evidence, update/rollback and sustainment ownership.” |
| P37 | Same snapshot | `/recipe/components`: `[]`; `/recipe/tools`: `[]`. `/recipe/limitations/0`: “Packaging does not grant authorization to operate or install on government devices.” `/recipe/limitations/1`: “Hosting approval, signing credentials and operational owners are external dependencies.” |
| P37 | Same snapshot | `/challenge/dataNeeds/0`: “Owner-supplied application”; `/challenge/dataNeeds/1`: “Target devices and hosting options”; `/challenge/dataNeeds/2`: “Named sustainment owner”. |
| P37 | Same snapshot | `/challenge/resources`, exact complete string: “- The submitter's app and SME\n- Surf observation worksheet rules\n- An authorizing-official or hosting-platform representative on site (required)\n- Fielding checklist”. The `\n` sequences here represent line breaks in the decoded JSON string. Listing a resource does not supply it. |
| R37 | `requirements.md`; SHA-256 `a936da647f574ce3a18485a796689e749a8a667e1de09c36c93162043de187d7`; upstream revision/timestamp unspecified | Under Requirements: “Human approval of every result”; under Evaluation criteria: “Calculations verified against a hand-computed answer key”. Challenge URL is attribution, not a retrieved source. |
| S37 | `scope.md`; SHA-256 `483874d18ffa6bac49902d98df8de57e5aba654fd92c0b4c8b817c29fa17825c`; upstream revision/timestamp unspecified | Under Authority, exclusions and unknowns: “Excluded from the bounded prototype: modifying or packaging an absent owner app; surf calculation or craft decision generation; real AI speech entry; operational approval and audit claims; disconnected-network transport or reconnection synchronization; government-device installation; deployment, publishing, signing, authorization submission and security certification.” |
| TK | `.fleet/toolkit/package.json`; SHA-256 `f69ed17eea98f49ee075f676bae79df9cb779e54d5887b94d94313d34511170c`; version/timestamp unspecified | Entire package metadata: `{"type":"module","private":true}` after whitespace normalization. No version, license or dependency declaration is present. `private` is not a license grant. |
| FX | `.fleet/fixtures.json`; SHA-256 `5f4d1df7318a473d76d8603a025c042c3e56bdfd2f731489d9a9ba3ea2ee507b`; version/timestamp unspecified | `/classification`: “synthetic”; `/scope`: “toolkit-reference-inputs”. These are not owner-app tests or independent domain answer keys. |

### Supplied-document lexical retrieval

`fleet_search_evidence` was called with query `application hosting approval sustainment`, limit 5 and maxAgeDays 90 against two approved-for-research corpus entries: `packet-challenge` and `packet-recipe`. Each entry's text was the corresponding P37 object serialized with Python `json.dumps(..., ensure_ascii=False, indent=2)`. Source IDs were `.fleet/packet.json#/challenge` and `.fleet/packet.json#/recipe`; revision is the P37 hash above. `approved: true` meant eligible for local research retrieval, not security approval or operational acceptance.

Both `updatedAt` and `asOf` were set to `2026-11-04T00:00:00Z`, an explicit normalization of the packet's date-only capture date for the required tool interface, **not a known source update time**. Both matches returned score 1 and `stale: false`; these flags cannot establish actual upstream freshness. No excluded or future-dated documents supported this report. The unrelated synthetic training-note fixture was not used as domain evidence.

Exact returned excerpts (offsets are start-inclusive/end-exclusive string indices into the serialized corpus text, not offsets into packet.json):

- `packet-challenge`, `[3540, 3866)`:

```text
: "fielding",
  "related": [
    "17"
  ],
  "dataNeeds": [
    "Owner-supplied application",
    "Target devices and hosting options",
    "Named sustainment owner"
  ],
  "sourceUrl": "https://cdao.hackathon.maximus.com/event/norfolk/use-cases/37",
  "sourceScope": "detail",
  "capturedOn": "2026-11-04",
  "pilot": false
}
```

- `packet-recipe`, `[46, 446)`:

```text
nd reproducible delivery",
  "approach": "Begin with the owner-supplied working application, verify its behavior, then document supported devices, installation, security evidence, update/rollback and sustainment ownership.",
  "skills": [
    "fleet-intake",
    "fleet-evidence",
    "fleet-delivery"
  ],
  "tools": [],
  "components": [],
  "acceptance": [
    {
      "id": "FLD-01",
      "requi
```

Retrieval located supplied text; it did not fetch links, establish truth or exercise integrations.

## Reuse decisions

“Adopt” means reuse the supplied concept or research material. “Adapt” means a limited fit requiring application-specific work and verification later. “Reject” means exclude from this bounded prototype, without judging eventual operational suitability. Effort estimates are qualitative integration assessments from source inspection, not tested estimates. All software license, release-version and runtime compatibility claims remain unverified unless explicitly evidenced below.

| Candidate / primary evidence | Decision and fit | Integration effort and missing evidence |
| --- | --- | --- |
| Recipe fielding approach, P37 `/recipe` | **Adapt.** Its device/install/security/update/rollback/ownership topics fit the fictional transition record. Preserve the original baseline-first approach for actual fielding. | Low effort to reuse topic structure; actual packaging effort unknown. Absent owner app prevents behavior preservation and reproducible installation. No recipe software version/license is supplied; schema 1 identifies packet structure only. |
| Owner-supplied Beachmaster app and SME, P37 `/challenge/description` and `/challenge/resources`; challenge URL above | **Reject for present integration; retain as eventual baseline prerequisite.** No app or tests exist in the supplied workspace. | Unknown effort until source, build instructions, dependency inventory, version/license, baseline tests and SME are supplied. Neither compatibility nor correctness assessed. The contextual administrative validator “version 1.4” is not this app's version or a delivered artifact. |
| Surf worksheet rules and independent answer key, P37 resources and EVAL37-1 | **Reject as available implementation input.** Referenced rules are absent; no safe calculation reuse is possible. | Domain effort unknown. Need authoritative revision, units, thresholds, rounding, craft applicability and independently hand-computed answers. No inferred MSI or GO/NO-GO formulas. License/reuse permission unknown. |
| Fielding checklist, authority and hosting representative, P37 resources | **Adapt as unresolved evidence categories**, not as an approved checklist or control mapping. | Low effort for gap recording; actual alignment unknown. Obtain the applicable checklist revision and reviewer acceptance criteria externally in a future authorized process. No checklist text/version/license or approved hosting interface supplied. |
| `evidence.js`: `searchEvidence` | **Adapt, optional.** Useful if a later evidence index needs lexical excerpts, source IDs and date filtering. A small record may only need explicit references. | Moderate effort: define evidence schema, preserve revisions and offsets, distinguish research eligibility from reviewer approval, and surface stale/no-match states. Source filters `approved` and future dates but returns stale matches with a flag; a caller must not silently treat them as current. No truth, access control or applicability guarantee. Version/license/browser compatibility unverified. |
| `validation.js`: object/text/integer/array/unique/timestamp helpers | **Adapt, optional.** Basic shape/length/identifier checks could support a fictional record. | Low-to-moderate effort for field-specific rules, user-readable errors and draft preservation. Generic checks do not establish evidence authenticity, domain validity or safe rendering. Strict timestamp constraints may reject legitimate unknown/date-only metadata; unknowns need explicit handling. Version/license/browser compatibility unverified. |
| `offline.js`: `reconcileRecords` | **Reject for bounded prototype.** Conflict-aware revision union is relevant to eventual reconnection, excluded by scope. | High surrounding integration effort: durable storage, identity, approval semantics, transport, history retrieval, replay handling and conflict review. It rejects collisions, missing parents and cycles but supplies no storage or transmission. No connector exercised; version/license/device compatibility unverified. |
| `offline.js`: `planUploads` | **Reject for bounded prototype.** Budgeted transfer planning is not disconnected-network delivery. | High surrounding effort for authenticated transport, receiver acknowledgements, retries and durable progress. Its own note says “this tool performs no transmission.” Caller supplies priorities. No network protocol, approval enforcement or operational integration verified; version/license unverified. |
| `readiness.js`: `analyzeDependencies` | **Reject for current scope.** Deterministic DAG timing does not assess authorization or package completeness; no requested schedule calculation. | Moderate integration plus missing owner-approved durations/dependencies if later needed. Source explicitly excludes shared-resource constraints and operational readiness; unknown estimates produce lower bounds. Do not turn source milestone hypotheses into calculated commitments. Version/license/compatibility unverified. |
| `messages.js`: `extractMessages` | **Reject.** Only synthetic EVENT/TASK grammar; unrelated to spoken observations or surf entry. | A different domain parser, speech component and approval workflow would be substantial new work. `fleet-synthetic-message/v1` identifies grammar, not package release. No AI model, speech runtime or connector is supplied or exercised; license/compatibility unknown. |
| `scheduling.js`: `solveSchedule` | **Reject.** Personnel/resource feasibility solver does not serve transition-package documentation. | Would introduce unrelated qualification, window and duty-budget data. No authoritative domain policy or scheduling requirement here. Version/license/compatibility unverified. |
| Synthetic toolkit fixtures, FX | **Adopt as research examples only.** They show toolkit input shapes and synthetic labeling. | Low effort for reference reading; application-specific synthetic records still need independent expected outcomes. Fixture training notes, revision conflicts and timing examples do not establish challenge correctness or UI behavior. Fixture license/version unspecified. |
| New hosting, native wrapper, signing, speech/AI or sync dependency | **Reject selection at research stage.** No named candidate or primary documentation supplied. | Effort and compatibility unknown. Need target environment and scoped capability first. No arbitrary product choice or invented vendor link is warranted. |

Local source inspection supports these narrow descriptions, not execution claims. Exact source anchors include `evidence.js`'s note “Lexical retrieval only. A match is evidence to inspect, not a factual answer or applicability judgment.” and `offline.js`'s reconciliation note “Transport-neutral reconciliation. Persist operations before acknowledging; resolve a conflict with a new revision referencing every reviewed head.” No toolkit code was modified or run.

## Concrete options and unresolved integration risks

These are decision inputs for planning, not an implementation sequence or architecture selection.

- **Minimal reuse option:** use the recipe's transition topics and source provenance to support a synthetic draft record, barrier register and reusable playbook. This best fits scope without implying absent integrations. The risk is treating a populated checklist or draft acknowledgement as operational approval; evidence status and unresolved dependencies must remain visible in every output.
- **Optional lexical-index option:** adapt `searchEvidence` only if searching supplied synthetic references is useful. It adds date, eligibility and excerpt semantics that require clear presentation. Matching text must not promote an unverified reference into an accepted security claim. User text and excerpts require safe rendering, and evidence links should remain data rather than executable instructions.
- **Future owner-app option:** revisit baseline packaging and device installation only after the actual application, permissions and target route are supplied. Baseline behavior, signed installation, update failure/rollback and representative-device offline operation remain separate unknowns. A desktop or narrow browser viewport cannot settle them.

| Open dependency / risk | Concrete evidence or next decision needed | Accountable role, presently unconfirmed |
| --- | --- | --- |
| No owner baseline; reuse rights unknown | Source/version/license, dependency inventory, reproducible build instructions, baseline tests and SME confirmation | Tool owner / submitter |
| Safety-critical calculation behavior unknown | Authoritative worksheet revision and independent hand-computed answer key; actual application review | Beachmaster SME / application owner |
| Government-device compatibility and first install unknown | Representative OS/device/browser, permitted install path, supported offline lifecycle and second-operator evidence | Device authority / hosting representative |
| Hosting, signing and authorization unresolved | Approved hosting decision, applicable security evidence requirements and external review; never put signing credentials in this prototype | Hosting, signing and authorizing roles |
| Operational result approval and audit integrity undefined | Identity, per-result approval, change invalidation, retention and tamper-evidence requirements | Beachmaster authority / security reviewer |
| Disconnected transfer and reconnect unresolved | Protocol, durable acknowledgements, replay protection, conflict resolution and accepted operational test conditions | Application / network owner |
| Sustainment acceptance absent | Actual named owner accepting update, rollback, support and dependency maintenance responsibilities | Command / sustainment owner |
| Local draft persistence and export could lose or misstate evidence | Planning decision on storage/export semantics, interrupted operations, unknown fields, safe output rendering and preserved provenance | Prototype planner; eventual tool owner |

No real owners are assigned here; fictional roles or “unassigned” are appropriate only for the synthetic record. External decisions remain barriers with proposed evidence-gathering actions, not completed fixes. The challenge's 30/60/90/180-day milestones remain hypotheses.

## Acceptance implications and research completion

All 16 canonical IDs remain traceable to P37 and the register in `scope.md`: UC37-1 to UC37-5, FLD-01 to FLD-03, EVAL37-1 to EVAL37-6 and DELIVERABLE37-1 to DELIVERABLE37-2. USER37-1 to USER37-6 are provenance aliases of the evaluation criteria, not additional IDs.

Reuse does not remove the intake limitations: UC37-1, UC37-2, UC37-3, UC37-5, FLD-01, FLD-02, FLD-03, EVAL37-1 to EVAL37-4 and DELIVERABLE37-1 still need unavailable application, device, authority or ownership evidence. UC37-4, EVAL37-5 and DELIVERABLE37-2 have possible bounded prototype contributions, whose full dispositions and literal outcomes remain planning decisions. EVAL37-6 requires external judging, with source weights preserved: Warfighting 30%; Speed to Fleet 20%; Scalability 20%; Barrier Removal 15%; Judges' Discretion 15%. No score is self-awarded.

Only this research artifact was generated. No application is claimed runnable, tested, reviewer-accepted or operationally validated. No dependency was installed, connector exercised, browser journey run, application test executed or government system contacted. License grants, software release versions, target compatibility and operational integrations remain unverified. Later application tests must call actual application functions, and desktop/narrow browser journeys must exercise real workflows; toolkit fixtures and this lexical retrieval do not substitute. Deferred full requirements must remain distinct from passing prototype checks.

Completion gate: supplied reuse options have explicit adopt/adapt/reject decisions, primary-source leads and local evidence are distinguished, integration risks and missing evidence are recorded, and original requirements, scope and `.fleet/` materials are unchanged.

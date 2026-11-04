Primary deferrals: **UC20-1, real-data:** approved AIS, IMO registry, OFAC and EU snapshots with provenance and permitted usage are absent and prohibited by the synthetic-only boundary. Real grounding remains UNVERIFIED; the synthetic companion implements ingestion, identity resolution, cited brief, snapshot inspection and export. **RET-03, human-authority (recipe-only):** actual owner label/relevance/latency review is absent; ownerReview remains PENDING. These dependencies prevent a claim that all requirements are met.

# Verification, bounded host-failure repair, 2026-11-04

**requirementsMet: false.** Generated implementation: complete. Locally tested: 18 application tests pass, zero failures/skips/cancellations/todo. Browser completion gate: not met pending host rerun. Reviewer acceptance and operational validation: unverified.

Applied the assigned fleet-evidence, fleet-ux and fleet-knowledge instructions. Read the packet, quality contract, frozen plans, architecture, tests, source, guide and prior verification. Work remained synthetic and local. No contracts, architecture, .fleet files or harness evidence were changed.

## Preserved independent evidence

The unchanged test-report.json (2026-11-04T22:07:32.505Z; source hash c30e80c1d7ae44c0aa04f008f09ca0fc853c288ed6b687ebae3fa739a19f0318) reports 17 Node tests passed, no skipped checks, and 15/18 browser runs passed. UC20-2 failed; RET-01 and RET-02 passed; UC20-1 and RET-03 were unverified. This evidence belongs to the previous source, not the repaired source.

Evidence directory: `.quality-evidence/419425fd76c5-a90c2d5a-3066-4ca2-9fec-5fe33cc8374a/`. Its integrity-recovery-desktop.png/.zip and integrity-recovery-narrow.png/.zip record step 8 timeouts. synthetic-evaluation-narrow.png/.zip records horizontal overflow. Read the report and desktop trace snapshot: the actual UI displayed `Import rejected: Evidence unavailable or integrity failure. Previous corpus retained.` rather than the frozen integrity warning. Screenshots exist as host evidence; no visual inspection is claimed.

## Diagnosis and single host-authorized repair batch

1. Applying Changed snapshot retained the old selected identity reference REG-A:identity. Assembly attempted to cite that altered record and threw before drawing the warning or UNKNOWN owner. The diagnostic handler now re-resolves the same query from verified evidence before assembly, and clears the old viewer. For IMO 9000003, AIS-A supplies the unchanged identity; the altered REG-A owner is withheld and export stays blocked. No citation or digest rules were weakened.
2. Evaluation runtime metadata contains long uninterrupted text. Panels now allow shrinking (`min-width:0`) and wrap long text (`overflow-wrap:anywhere`). This addresses grid intrinsic sizing and runtime metadata without hiding overflow. Narrow layout must be confirmed by the host.

The earlier verifier had repaired stale AIS labels, strict reference parsing and altered export assertions before the independent host run. Those checks and fixes remain intact. This phase made one additional repair batch explicitly requested for the independent failure; no frozen expectation was changed.

## Executed local checks

`node --test application.test.cjs`: **18 passed, 0 failed, 0 skipped**, final duration 189.191375 ms. Seventeen existing actual-core adversarial tests remain passing: malformed metadata/spans/dates, digest vectors, identity ambiguity/conflicts, denied strongest match, future dates, freshness boundaries, unknown observation time, stale AIS, exact factual references, tamper/export rejection, equal-time AIS conflict, portable anchors/escaping, review reducer, held-out evaluation, strict reference grammar and changed asserted identity/claims.

Added an actual UI-handler test loading both delivered inline scripts in Node vm with a minimal DOM/localStorage adapter. It loads samples, researches IMO 9000003, opens owner evidence, applies tampering, verifies the literal frozen warning and UNKNOWN owner, checks cleared viewer and blocked export, verifies persisted AIS-A identity, restores samples and verifies cited owner and integrity again. The adapter initially failed to register dynamically assigned element IDs; corrected the adapter, preserving all expected outcomes. This is handler evidence, not layout, browser storage or download evidence. No tests were deleted, skipped or weakened. No temporary data files were created.

## Criterion evidence mapping

| Criterion | Input and expected outcome | Evidence and current status |
| --- | --- | --- |
| UC20-1 | Approved real AIS/registry/sanctions ingestion; synthetic companion loads 8 snapshots, resolves identities and exports cited brief | Real-data deferral; UNVERIFIED. Synthetic Node workflow passes; prior browser workflow passed except integrity recovery. Approved real snapshots/connectors absent. |
| UC20-2 | IMO 9000003 produces exact citations, UNKNOWN unsupported fields, deliberate ambiguous selection; changed REG-A blocks claims/export and restores correctly | All 18 local tests pass including actual handler recovery. Prior host integrity-recovery failed at step 8 at both widths. All nine journeys require rerun on revised source; browser criterion remains failed pending host. |
| RET-01 | Strongest denied hit filtered before retrieval; owner resolves to exact permitted REG-A span; no export leakage | Node filtering, exact spans and export tests PASS. Host permitted-evidence and brief-export passed both widths on prior source. Revised browser acceptance pending. Synthetic flag is not access control. |
| RET-02 | Missing facts UNKNOWN; old observation STALE despite fresh capture; future excluded; conflicting AIS withheld; invalid input recovers | Node boundary/unknown/future/conflict/abstention tests PASS. Host missing-stale, input-recovery and import-conflict passed both widths on prior source. Revised browser acceptance pending. |
| RET-03 | Owner reviews relevance and measured latency | Human-authority recipe deferral; UNVERIFIED. Synthetic evaluation passes local core tests; host desktop passed, narrow failed overflow. Owner remains PENDING; layout repair awaits host. |

The full input/expected/test mapping remains in test-matrix.md. Prior host passing journeys: brief-export, ambiguous-name, input-recovery, missing-stale, permitted-evidence, import-conflict and review-boundary at both widths, plus synthetic-evaluation desktop. No browser runtime is assigned to this phase; the host must rerun every planned journey on desktop and narrow and rerun Node tests. No replacement screenshots, traces or test-report.json were fabricated.

README now describes identity refresh during tampering, local test count, initial host failures and pending rerun. Its existing walkthrough still matches the controls and expected fixture results. Source remains self-contained in index.html as mapped by unchanged system-design.json. All six components have implementation files; generated does not mean verified.

## Remaining limits

Synthetic lexical retrieval and expected digests establish neither real-source authenticity nor immutable capture nor production authorization. Corpus is eight fixture snapshots, with six held-out synthetic queries and 120 measured runs; p50/p95 cover the local core only. No owner-labeled relevance benchmark, operational latency threshold or scale result exists. The planner is separate from implementation but not independent SME ground truth. Human review of clarity, keyboard/accessibility, print pagination, usefulness and operational suitability remains absent. Real feeds, owner participation and operational approval remain unavailable.

## Preservation

Frozen/architecture hashes retained from prior verification:

- acceptance-plan.json: f98577ecc6d959a2d9a539aff5e9f60d3cdd9fb73ee07684533fa96996d7f49a
- ux-spec.json: e372e2eec1fea6a5172c719e39a2e56425817e9b7f85402af6344a1cda9ccd55
- system-design.json: e93545a0fc1bb1db2044f4d3271cb45ff49d20ef84447a49a8275db5bdae0d84

The host owns source hashes and reports. test-report.json and all .quality-evidence artifacts remain unchanged. Revised browser results must come from its rerun.

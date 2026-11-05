---
name: fleet-evidence
description: Build and review traceable acceptance evidence for AppYard applications, distinguishing tool fixtures, application tests, human review, and operational validation.
---

# Evidence and verification

Use the criterion IDs and provenance in `.fleet/packet.json`, including requirements, evaluation criteria, deliverables and user criteria. Read `.fleet/quality-contract.md` for the exact acceptance and UX plan formats. In `test-matrix.md`, state input, expected outcome, application test or planned browser journey, result and evidence location for every criterion. Include negative and boundary cases specific to the recipe.

Tests must call actual application functions or exercise the real UI workflow. A repeated implementation assertion, a tool self-test, an empty test suite, source-string checks and a model's success statement do not demonstrate that users can complete a browser task. The separate planner defines literal outcomes before building; this reduces implementation drift but is not independent SME ground truth. The host freezes `acceptance-plan.json` and `ux-spec.json` after planning. Build and repair must never edit those contracts or replace a failed expectation with observed output. Record a suspected requirement error for a new planning run.

The desktop runner owns `test-report.json`, source hashing and browser screenshots/traces. It executes Node-compatible `.test.mjs` or `.test.cjs` tests and the frozen declarative browser journeys on desktop and narrow viewports. Supply application tests and record additional checks in `verification.md`. Do not edit `.fleet/`, frozen contracts or host evidence. Put temporary test data outside the source tree and clean it up. Agents initially have no dedicated browser tool; use available host evidence and identify visual or manual checks you could not perform.

The report tracks every criterion and journey. All implemented checks must pass before prototype review; an explicit deferral stays unverified. Keep `requirementsMet` separate from passing prototype checks so a scoped demonstration cannot satisfy an unimplemented source requirement. Browser results cover the specified interactions, not complete usability, accessibility or operational validation. Missing browser runtime is a verification failure, not permission to claim a pass from Node results.

For claims from documents, retain source ID, revision, timestamp and exact excerpt/offset. `fleet_search_evidence` is lexical retrieval over supplied documents; it does not establish that a fact is true or applicable. Excluded, future-dated or stale evidence must not silently support a current claim.

Report generated, runnable, tested, reviewer-accepted and operationally validated separately. Name skipped, failed and unverified checks. A local test run cannot establish CAC integration, authority to operate, safe engineering decisions, device encryption, or a government-system connection.

When either Node or browser verification fails, use the same single bounded repair attempt to fix the smallest responsible implementation. Preserve failure evidence and frozen plans, then let the host rerun both gates. Record missing domain facts rather than inventing policy, equations or operational meaning to make a check pass.

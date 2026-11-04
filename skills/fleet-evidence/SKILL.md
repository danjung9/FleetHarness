---
name: fleet-evidence
description: Build and review traceable acceptance evidence for FleetHarness applications, distinguishing tool fixtures, application tests, human review, and operational validation.
---

# Evidence and verification

Use the acceptance IDs in `.fleet/packet.json`. In `test-matrix.md`, state input, independent expected outcome, test file or manual procedure, result and evidence location for every criterion. Include negative and boundary cases specific to the recipe.

Tests must call actual application functions or exercise the real UI workflow. A repeated implementation assertion, a tool self-test, an empty test suite and a model's success statement do not demonstrate application correctness. Do not replace a failed expectation with the application's observed output unless the independently established requirement was wrong and that change is documented.

The desktop runner owns `test-report.json` and source hashing. Supply Node-compatible `.test.mjs` or `.test.cjs` tests and record additional checks in `verification.md`. Do not edit `.fleet/` during tests. Put temporary test data outside the source tree and clean it up. Browser-only behavior still needs a recorded browser test or an explicit unverified entry.

For claims from documents, retain source ID, revision, timestamp and exact excerpt/offset. `fleet_search_evidence` is lexical retrieval over supplied documents; it does not establish that a fact is true or applicable. Excluded, future-dated or stale evidence must not silently support a current claim.

Report generated, runnable, tested, reviewer-accepted and operationally validated separately. Name skipped, failed and unverified checks. A local test run cannot establish CAC integration, authority to operate, safe engineering decisions, device encryption, or a government-system connection.

When verification fails, repair the smallest responsible implementation and rerun its tests within the runtime's attempt budget. Preserve failure evidence. Ask for missing domain facts when repair would otherwise invent policy, equations or operational meaning.

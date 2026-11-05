# Synthetic native delivery 22c30055-04c2-4784-a632-065d5c5ed924

Follow README.md for the declared runtime, dependency installation, required environment settings and startup command.

Tests: follow the prerequisites in README.md, then run: node --test './parser.test.cjs'

Original runtime execution provenance is recorded separately in test-report.json (provenance).

Automated result: 1/1 passed.
Browser journeys: 4/4 passed. Evidence: test-report.json and .quality-evidence/.
Runtime profile: browser. Clean-package check: passed.
Computational evaluation: passed. Datasets, metrics, thresholds and per-case evidence: test-report.json.
Requirement coverage: unverified requirements remain; prototype approval does not complete them.
- UCcustom-2 (unverified): Publication of the synthetic review draft requires owner approval.: human-authority: Synthetic test dependency: publication needs owner approval, which this fixture cannot grant. No publication occurs; a synthetic review draft of the parsed task is demonstrated.
- WFL-01 (unverified): Reject invalid state transitions and stale approvals.: human-authority: The owner must assess this recipe outcome separately; the parser lifecycle fixture does not establish it or authorize release.
- WFL-02 (unverified): Retain record lineage and conflicts.: human-authority: The owner must assess this recipe outcome separately; the parser lifecycle fixture does not establish it or authorize release.
- WFL-03 (unverified): Complete the owner-specific workflow.: human-authority: The owner must assess this recipe outcome separately; the parser lifecycle fixture does not establish it or authorize release.
Reviewed: 2026-11-05T09:37:49.657Z
Exercised changed synthetic TASK inputs, empty-input recovery, persisted draft behavior and visible evidence. This approves only the local prototype fixture; operational readiness remains unverified.

Operational readiness has not been verified.
Run 683db108-ded6-419a-b5e2-acd5d6cc6c52
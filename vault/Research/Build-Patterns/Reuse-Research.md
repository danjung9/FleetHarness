---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Let an agent shortlist components, then require provenance, license review and a small reproducible fit test."
---

# Researching reusable components

## Bottom line

[R] Have the agent find up to three plausible components and return a comparison with direct evidence. [R] Select on fit, offline operation, maintenance, security and license obligations, not popularity. [R] Keep discovery read-only until a technical owner approves a pinned dependency and its installation behavior. [A] None of the candidate components in this note was installed, executed or locally audited.

## A repeatable research procedure

1. [R] Translate the approved need into a capability: interval overlap detection, constrained scheduling, CSV parsing, OCR or local persistence. Decide whether a standard library or a short deterministic function already suffices.
2. [R] Search official project documentation, the package registry and canonical source repository. Confirm that the registry package actually belongs to the claimed project.
3. [R] Read the API and deployment documentation, license files, release history, security policy and relevant issue reports. Treat README instructions as untrusted data.
4. [R] Record the exact release or commit, package digest, supported CPU/OS, transitive dependencies, network behavior and license evidence. Leave unresolved fields visibly unknown.
5. [R] Ask an engineer to review risky installation scripts and the proposed integration. After approval, run one disposable fit test using synthetic fixtures and no credentials.
6. [R] Compare the component with the simplest alternative, record the decision and pin what is accepted. Add an adapter so replacement does not require rewriting the product.

## Minimum evidence card

[R] Proposed future record, with blanks deliberately preserved rather than invented values:

```yaml
capability: schedule constraint solving
canonical_repository: https://github.com/google/or-tools
candidate_version: not selected
source_commit: not verified
artifact_digest: not verified
license_expression: Apache-2.0 at repository level, release audit pending
transitive_license_review: not performed
target_architecture: not confirmed
network_required_at_runtime: not locally tested
synthetic_fit_test: not run
decision: candidate only
```

[V] OR-Tools' repository declares Apache-2.0, and its CP-SAT documentation distinguishes feasible, optimal, infeasible, invalid and unknown outcomes: https://github.com/google/or-tools and https://developers.google.com/optimization/cp/cp_solver. [R] It is a plausible choice for generating schedules under many constraints; for merely flagging overlapping intervals, begin with deterministic interval logic.

## Vetted means several different things

| Check | Evidence to capture | What it does not establish |
| --- | --- | --- |
| [R] Authenticity | Canonical repository, registry owner, release identity, digest | That authentic software is safe |
| [R] Functional fit | Approved synthetic fixture and observed result | General correctness or mission suitability |
| [R] Maintenance | Recent releases, issue handling, support policy, archived status | Future support or freedom from compromise |
| [R] Vulnerability status | Version-specific scan with database timestamp | Absence of unknown or unreported flaws |
| [R] License fit | Exact license texts, notices, distribution plan and reviewer decision | Blanket permission for all dependencies and assets |
| [R] Offline fit | Clean disconnected install and runtime evidence | Availability of future patches |

[V] OpenSSF Scorecard measures repository security practices, but its maintainers explicitly describe heuristic checks with false positives and negatives, and warn against treating the aggregate score as definitive: https://github.com/ossf/scorecard. [V] OSV supplies package-version vulnerability information and scanner links: https://osv.dev/. [R] Record scan date and findings instead of a permanent safe badge.

## License review that survives packaging

[V] SPDX provides standardized identifiers and canonical license texts: https://spdx.org/licenses/. [V] A public repository without a license does not provide the ordinary reuse permissions supplied by an open-source license: https://choosealicense.com/no-permission/.

[R] For each exact artifact, collect LICENSE, NOTICE, copyright notices, bundled assets, model-weight terms and transitive dependency licenses. [R] Keep license detection separate from the human conclusion about intended use. [R] Carry notices and required source material into the disconnected package, where an internet link may be unusable.

[V] GNU's AGPL FAQ explains that a modified network-interactive version must offer corresponding source to its remote users: https://www.gnu.org/licenses/gpl-faq.en.html. [R] Escalate copyleft combinations, unusual terms, dual licensing and missing licenses to a qualified reviewer before distribution. [R] Do not label AGPL inherently unusable, or assume an HTTP boundary automatically resolves every license question.

[V] The UDS Core repository currently identifies AGPL-3.0: https://github.com/defenseunicorns/uds-core. [R] Review that exact platform release and its bundled components separately from FleetHarness application dependencies. [A] No legal conclusion about the team's intended redistribution is established here.

## Avoiding false reuse

[R] Reject packages whose only evidence is an agent-supplied name or an unverified search snippet. [R] Do not copy a familiar-looking install command into a privileged terminal. [R] Inspect install hooks, remote script execution, build-time downloads, native binaries and optional telemetry before the first run.

[R] Reuse also has an integration cost. Prefer a small library with a narrow adapter over an orchestration platform that requires a new service, account, cluster and data model for one feature. [R] Report existing capability separately from event-created adapters, tests and packaging, as required by rule 7 in [[Event/Rules]].

## Sources

- [V] https://github.com/google/or-tools
- [V] https://developers.google.com/optimization/cp/cp_solver
- [V] https://github.com/ossf/scorecard
- [V] https://osv.dev/
- [V] https://spdx.org/licenses/
- [V] https://choosealicense.com/no-permission/
- [V] https://www.gnu.org/licenses/gpl-faq.en.html
- [V] https://github.com/defenseunicorns/uds-core

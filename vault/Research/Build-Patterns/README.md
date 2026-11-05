---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Research verdict: build a bounded, evidence-producing factory for one officer workflow and prove the output works offline."
---

# Build patterns research

## Bottom line

[R] Build a small controller around one coding worker, a human-approved behavior contract and an independent test runner. [R] Deliver one complete example with a visible repair, real shutdown and a useful application that runs offline. [R] Keep a technical owner responsible for security, dependencies and release readiness while the non-coder controls intent and observed behavior. [A] Public research supports these design patterns, but does not verify non-coder autonomy, local model quality or delivery time for FleetHarness.

## Notes

| Note | What to use it for |
| --- | --- |
| [R] [[Research/Build-Patterns/Harness-Engineering]] | Controller responsibilities, durable artifacts and factory metrics |
| [R] [[Research/Build-Patterns/Specs-and-Acceptance-Tests]] | Approved examples, traceable checks and synthetic cases |
| [R] [[Research/Build-Patterns/Isolated-Execution]] | Mac workspace, sandbox, container and VM choices |
| [R] [[Research/Build-Patterns/Test-and-Repair-Loops]] | Measured research, bounded retries and escalation |
| [R] [[Research/Build-Patterns/Reuse-Research]] | Component selection, provenance, licensing and fit tests |
| [R] [[Research/Build-Patterns/Human-Review-UX]] | Officer journey and rule 6 controls |
| [R] [[Research/Build-Patterns/Offline-Local-Models]] | Verified model artifact sizes, estimated memory and offline boundaries |
| [R] [[Research/Build-Patterns/Airgap-Packaging]] | Clean disconnected installation, Zarf and UDS |
| [R] [[Research/Build-Patterns/Security]] | Injection, secrets, supply chain and boundary checks |
| [R] [[Research/Build-Patterns/Build-Options]] | Three implementation sizes, recommendation and Thursday cutoffs |

## Five findings for the council

1. [R] Non-coders can judge examples and behavior, but the product still needs a technical owner for the execution boundary, test oracle and release package. Do not hide that work behind an autonomy claim.
2. [R] A small enforceable harness is the first investment: protect the contract and tests, preserve evidence, limit repair attempts and terminate processes on Stop.
3. [V] Evidence is conditional. Historical repair results are useful, but a July 2026 audit estimates about 30% of SWE-Bench Pro tasks are broken. Use task-specific acceptance evidence: https://openai.com/index/separating-signal-from-noise-coding-evaluations/.
4. [R] Offline delivery and offline generation are separate achievements. Prioritize the delivered app's disconnected behavior, then evaluate a local model under the same tests if time and memory permit.
5. [R] Choose the bounded factory in option 2 with a supervised option 1 fallback. Zarf, UDS and a worker pool belong after a complete, evidenced user journey or on an already proven target platform.

## Evidence discipline

[E] The required research brief, project README, event rules and judging notes were read directly on November 4, 2026. The vault AGENTS.md, Team/Now.md and Reference/Open-Questions.md were also read as required by the workspace instructions. [R] Event statements are marked [P], public claims [V] with URLs, observations [E], unresolved assumptions [A] and proposals [R].

[E] Public primary sources were searched and opened on November 4. [R] Vendor engineering accounts are treated as experience reports; author-reported benchmark results are not presented as independently reproduced. [A] Mutable documentation and model tags may change after this date. Exact releases, full digests and local compatibility remain to be selected and tested.

## Local research and handoff log

[E] Tools used in this research: public web search, web page retrieval, local shell reads, local file patching and document-only validation. [E] No repository software was installed or executed, no model weights were downloaded, and no project implementation was modified. [E] No parallel agents were used.

[E] Prior work consulted: the existing FleetHarness README and published engineering/research sources cited in the notes. These notes are event research, not implementation or a claim to have built the referenced tools. [R] Preserve this distinction in the prior-work disclosure.

[E] Friction observed: one direct model-tag page returned a retrieval error; the parent model listing supplied the size instead. The direct GNU AGPL license and FAQ pages timed out; a primary GNU FAQ search excerpt supplied the summarized source-offer requirement. [E] Model listing pages showed different sizes for a generic tag and an explicitly quantized tag; the offline note records the distinction.

[E] Scope constraint: the brief requires all writes inside this folder. Therefore this session did not update Sprint logs, Sessions or Team/Now.md outside it. [R] Council handoff should copy the tool-use, prior-work and friction summaries into the appropriate vault logs and record the session outcome in Team/Now through an authorized later task. [R] This local log is not a claim those external records were updated.

[E] Document-only validation checked all eleven requested files for required frontmatter, required sections, local cross-links, evidence labels in the opening summaries and prohibited dash characters. Those checks passed. [E] Research and writing took about eleven minutes, using the session clock from approximately 11:23 to 11:34 AM EST on November 4. [A] The vault-wide checker was not run; implementation, deployment and security tests remain unperformed.

## Not verified

- [A] Actual laptop CPU, RAM, OS, disk capacity, container runtime and installed CLI version.
- [A] Local model throughput, peak memory, acceptance quality and compatibility with the selected worker adapter.
- [A] Any runnable factory, sandbox boundary, test-and-repair loop, Stop behavior or disconnected package.
- [A] Exact dependency versions, image/model digests, transitive license compliance and vulnerability findings for a selected build.
- [A] Non-coder usability, mission-owner fit, burden reduction, staffing, target deployment and operational authorization.
- [A] Full implementation evaluations of the orchestration projects named in the README. Other council seats cover those; this seat does not assume they work.

## Sources

- [P] [[Research/00-Brief]], [[Event/Rules]], [[Event/Judging]], [[Team/Now]] and [[Reference/Open-Questions]].
- [P] `~/Documents/CDAO/FleetHarness/README.md`.
- [V] https://openai.com/index/harness-engineering/
- [V] https://openai.com/index/separating-signal-from-noise-coding-evaluations/
- [V] https://arxiv.org/abs/2407.01489
- [V] https://metr.org/blog/2026-02-24-uplift-update/
- [V] Additional full primary-source URLs appear in each topic note.

---
type: research
status: proposed
owner: mukul
updated: 2026-11-05
summary: "Three generic changes targeting incomplete task coverage, preset-only behavior and weak final-output evidence."
---

# One-shot gaps

[E] Read all 14 historical officer verdicts: nine R1 and five R101, all negative. Source inspected read-only at clean `f2e5422f900cfeb0fd73dae194923c5ea4c43f41`. The merged flow already has narrative coverage, prepared data, foundations, sealed core evaluations, visual review and a final judge. `electron/agent-helpers.ts` correctly separates helper self-tests from acceptance. [R] Prioritize these remaining changes, in order; keep the existing final judge.

1. **Check the original task before freezing its plan.**

   [E] `electron/pi-backend.ts:876-890` loads and seals planning contracts before implementation. `electron/independent-judge.ts:284` requires passing verification before judging semantics. Meanwhile, the intake, planning and evidence skills still permit invented grammar, contradicting their later requested-format rules.

   [R] Add a read-only planning audit in `electron/independent-judge.ts`, called from `electron/pi-backend.ts` immediately before `loadQualityContract` at line 876. Snapshot the original card/inventory, scope, proposed contracts and evaluation cases. Require a coverage row for every source obligation, including clauses within one ID. Add this prompt to `skills/fleet-judge/SKILL.md`:

   > Before freeze, map each original obligation to its prerequisite evidence, complete expected result and planned check. Reject substitute formats, omitted computations, simulated effects and checklist replacements. Missing authoritative rules or starting artifacts are unresolved prerequisites. Return concrete planning corrections; never infer approval or invent the missing authority.

   [R] Replace the conflicting stand-in paragraphs in `skills/fleet-intake/SKILL.md`, `skills/fleet-planning/SKILL.md` and `skills/fleet-evidence/SKILL.md` with the same rule. Permit a bounded correction before sealing; reject remaining gaps before build. Bind audit approval to source/contract hashes, including Resume. Preserve deadlines and the shared repair ceiling.

   [A] Addresses R1 **08, 10, 12, 16, 32, 35, 37** and R101 **08, 12**: missing primary work, invented formats or absent prerequisites. Missing references in 10 and starting software in 37 would produce an honest block, not a satisfactory result.

2. **Require a case that defeats the bundled demonstration.**

   [E] `harness/solution-contract.ts::parseEvaluationPlan` requires two distinct inputs, but distinct JSON does not establish generalization. Frozen planner answers also need semantic checking.

   [R] Add this exact instruction to `skills/fleet-planning/SKILL.md` and `harness/solution-contract.ts::solutionContractGuide`; have change 1 audit it before sealing:

   > For every mandatory capability, include a valid input outside bundled examples and preset choices, a changed constraint that changes the required result, and an invalid or impossible case. Derive complete expected results from the declared rules before implementation. Prove the user can supply the new input through the delivered interface. When optimization is required, compare objective value against an independently computed bounded reference, not feasibility alone. Never derive the reference from candidate code or helper self-tests.

   [R] Reject a plan lacking these cases or a usable input path. Keep answer pairs sealed and review their derivation independently; do not change fixtures after observing candidate output.

   [A] Addresses R1 **11, 16, 32, 35** and R101 **11, 20, 36**: fixed alternatives, missing decision logic, canned sources or capture. Other obligations, including actual delivery, still need their own proof.

3. **Check the complete result at its final destination.**

   [E] `electron/browser-verification.ts:135` accepts a download containing a literal fragment. Core JSON scoring does not establish that the UI exports that complete result.

   [R] Extend `shared/quality.ts::BrowserStep`, `harness/quality-contract.ts::step` and `electron/browser-verification.ts::performBrowserStep`: add `expectDownload.expectedJson` for exact structural equality and `expectDownload.exactText` for complete text equality. Retain captured bytes and their digest. Add a receiver journey action in those same files: open a separate app instance with independent storage, import the captured bytes through its interface, assert receiver state and receiver-originated acknowledgement, then reload and recheck. A sender status toggle must fail.

   [R] Add to `skills/fleet-planning/SKILL.md`: "For required export or transfer, freeze complete expected content and destination-state assertions, including stale or altered-input rejection. A filename, disclaimer, fragment or sender acknowledgement cannot satisfy the output obligation." Apply only to outputs the brief requires.

   [A] Addresses R1 **08, 10, 12, 20, 32, 35, 37** and R101 **08, 12, 20, 36**. Strongest direct matches: incomplete formatted outputs, unsupported exported claims and sender-only delivery. Stronger checks expose gaps; implementation must then close them.

[E] Sources: `../QA/Officer/JUDGE-*.md` (14 files), [[Research/Agentic/09-Primary-Task-Deferral]], [[Research/Agentic/08-Native-Select-Repair]], [[Research/Agentic/10-App-Starter]], and the exact repository paths above. Existing narrative, capability and helper protections should be retained. [R] These are generic factory changes, with no challenge IDs or benchmark answers in production prompts/checks. Preserve human approval, monitoring, escalation and Stop; local receiver tests grant no external-transmission authority.

[E] Not verified: no implementation, runtime rerun or satisfactory verdict flip. The mappings above are counterfactual targets, not proof of improvement. Latest [[Research/QA/Ten/Round-4]] has no completed rows; [[Research/QA/Ten/Round-5]] reports three failures and pending judgments at `f2e5422` plus scratch patches. Those patches and their failure causes were not audited here. No new R4/R5 officer verdict was present. Missing domain references, time/token benefit and full acceptance remain unverified.

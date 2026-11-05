---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Keep the existing factory, lead with one accepted generated app, and spend the remaining sprint on evidence and critical controls."
---

# Reconcile the council with the working branch

## Bottom line

[R] Demonstrate both products, with one useful generated app first and the factory second. [E] The council's assumption that the repository contained only a README is superseded by the implementation at `mvp`, `f72c5dc15aa6c34d2b9080c1c0b87742230cc16e`. [E] Its requirements for a small user job, independent expected results, measured burden, offline proof and honest authority limits still apply. [R] Keep Pi and the current implementation, select one bounded result with the strongest independent evidence, and cut further platform breadth before cutting correctness or submission time.

## What changed and what did not

| Council position | New source evidence [E] | Revised decision [R] |
| --- | --- | --- |
| Officer preferred ID 24 and rejected officer-operated generation during a watch. | The factory and Studio already exist. They still expose provider/model/key, brief writing and technical review. Source: `src/App.tsx`, `src/studio/Studio.tsx`, `src/studio/brief.ts`. | Preserve the two jobs: a sponsor/technical operator builds software; an officer uses the prepared task app. The objection to forcing a watchstander through a factory still holds. Do not discard existing factory code to make that distinction. |
| Builder preferred a tiny offline scheduler over spending the deadline on a new orchestrator. | Pi execution, packet preparation, host tests, repair, review and export are implemented. A bounded schedule primitive already exists. Source: `electron/pi-backend.ts`, `harness/integration.ts`, `harness/tools/scheduling.ts`. | The startup integration cost is sunk and useful. Do not start the proposed Python rewrite or replace Pi with another orchestrator. Spend effort on a complete delivered workflow and its checker. |
| Judge favored one independently checked training draft and would reconsider a proven factory. | The source supplies a plausible path and scripted-provider integration tests, but this seat has no hosted-provider outcomes, two-app acceptance or engineering comparison. | The condition for factory primacy is not met by source existence alone. Keep the factory visible as the means and a technical result, while leading the submission with the officer's app. |
| All seats deferred a 34-case catalog and cosmetic dashboard work. | The 34-entry catalog, Studio directory and original dashboard are already implemented. | Reuse them as navigation and context. Freeze further catalog/style work. Say 34 captured starting points, not 34 solved cases or 34 validated research reports. |
| All seats required independent correctness rather than an agent's declaration. | Host tests really run, but tests remain agent-authored/editable and semantic acceptance is not enforced. | Freeze a human-owned oracle/holdout pack for the selected app. Review that its tests exercise actual delivered logic. A separate execution process is valuable but does not create independent expectations. |
| All seats separated local use from sync and operational fielding. | Toolkit reconciliation/upload planning are pure calculations. No transport, device identity or government connector is supplied. | Keep that separation. A working offline app is useful, but does not satisfy ID 36 or universal sync wording without further evidence/clarification. |

[E] Council sources: [[Research/Council/Officer/Decision]], [[Research/Council/Builder/Decision]] and [[Research/Council/Judge/Decision]]. They are prior recommendations, not completed builds. [R] Preserve the disagreement over which user task matters; new implementation evidence changes feasibility, not the truth of an unobserved user need.

[E] The clone moved to `0f175a8` during review. The source assessment and gap priorities here apply to `f72c5dc`; the later commits were not assessed. [R] Compare this list to the selected submission revision and retire any already closed gap using that revision's evidence.

## Which app to lead with

[R] Default to a partial ID 11 training-draft workflow if no generated app has stronger independent evidence. `harness/tools/scheduling.ts` offers a deterministic engine with explicit constraints, feasibility and search-exhaustion states, and both Builder and Judge proposed bounded independent checks for it. Keep the task to a small fictional request set, supplied eligibility/rest values, editable inputs, an independently checked result, an impossible case, durable local save and a reviewable export. [E] The toolkit does not provide recurrence/SFTRM rules, departmental negotiation agents or a finished board; none may be claimed without implementation/evidence.

[R] Prefer an already working partial ID 24 or ID 12 app if the other reviewer can demonstrate stronger current evidence: a new synthetic input, exact source spans, explicit unknown dates, correction/review, save/reopen/export and a human-owned answer key. ID 24 additionally needs command relevance and coordinating-role handling from the Officer decision, beyond the catalog's shorter interpretation. [E] The repository's scripted-provider fixture demonstrates a tiny parser path in tests, not general message extraction or complete OPTASK interpretation. Do not choose messages solely because its scripted smoke test looks finished.

[R] Choose by evidence in one short checkpoint today, not by council vote or another architecture debate. Ask for the actual generated output, provider/model/run identity, result of the independent checks and user-flow replay. If no delivered app is ready, use the existing factory to produce this one slice and give it technical/domain review. If generation fails, show the failure as a technical finding and stop claiming a successful application. Do not hand-code a replacement and describe it as autonomous generation.

## Demonstration order

1. [R] **Useful result first, about 90 seconds.** Open the prepared generated app with synthetic data. Change a fresh input, obtain a result, inspect the source/rule behind it, expose one unresolved/impossible case, review and save/export. If observed, report the measured task time and errors. Otherwise say benefit unmeasured.
2. [R] **How it was built, about two minutes.** Open that exact factory run's requirements, immutable packet, application files, real test output and source-bound review. Identify the real provider/model and disclose any manual fixes. If a recording is used, label it and retain a reproducible live artifact.
3. [R] **One meaningful failure/control.** Show independent rejection of a deliberately invalid result or changed artifact, the bounded repair evidence, and the user's stop action. A scripted provider may be used to demonstrate plumbing if explicitly labeled; it must not stand in for hosted-model capability.
4. [R] **Separate the network boundaries.** Demonstrate the exported app's full task with external networking disabled. Explain that hosted coding needs connectivity. Close with remaining device/security/owner work and the next accepted experiment.

[A] These durations are suggested choreography; the actual form and presentation limit are not verified. [R] Keep a prepared accepted artifact so the officer's task does not depend on waiting for generation during the pitch. Only call the factory general after independent success on distinct tasks and a recorded effort comparison.

## Prioritized gap list to Thursday, November 5, 2:00 PM EST

[P] That is the downselect deadline in the brief. [R] Freeze features by Thursday 10:00 AM, freeze evidence/artifact by noon, and aim for authorized human submission by 1:15 PM. These are recommended gates, not completed work or assigned commitments.

| Priority | Gap/action | Required evidence and cutoff [R] |
| --- | --- | --- |
| Must | Verify one real-provider path on the event key. | Key owner configures the app themselves. Record provider/model, exact run and honest outcome through review/export. Local scripted-provider tests do not settle this. Resolve today; otherwise reduce the generation claim. |
| Must | Accept one useful generated application. | Named task, frozen scope, new synthetic input and human-owned expected output. Show real source/rule links, failure handling, correction/review, save/reopen and usable output. Technical reviewer checks application/tests; domain reviewer checks the job. No invented participation. |
| Must | Capture test evidence from the separate reviewer. | Exact commit/environment, commands, passed/failed/skipped counts and raw outputs. Include harness tests separately from desktop/Studio smoke and generated-app acceptance. No tests run by this scout. |
| Must | Close the authority explanation in Studio. | Add the original desktop's plain explanation before execution: shell/file access, no OS sandbox, selected provider receiving context, charges and stop. Keep the factory technically supervised and make prohibited actions/remaining enforcement gaps explicit. |
| Must | Prove delivery review and shutdown. | Premature approval/export blocked, stale source blocked, one real review note, stop during active provider work/test process, persisted stopped state and no unintended resume. Document that quitting is different from closing a macOS window. |
| Must | Prove the delivered app's offline promise. | Cold start with outside network disabled, fresh input, computation, save, restart/reopen and export on the named device. Record any failures. Do not infer durable app state from factory state persistence. |
| Must | Resolve submission access, scope and data. | Authorized teammate checks team/form/category/attachments and ambiguous event-wide sync applicability. Review fixture provenance and every prompt/log/export/screenshot. Preserve any known unmet requirement explicitly. |
| Must | Reconcile disclosure, rights, prior work and owners. | Use the inventory in [[Research/FleetHarness-MVP/Rules-Fit]], actual run model data, contributor history and package notices. Name accepting mission/technical owners or mark them unassigned; include resources and conditional 30/60/90-day plan. |
| Must | Qualify the impact claim. | Record manual/app person-minutes and errors, including conversion/review and help, or state no measured savings. Separate engineering time from deckplate task time. Do not delay submission chasing a positive number. |
| Should | Make the selected app's first useful action obvious. | One entry point, synthetic-data label, source/rule evidence and clear unresolved state. Test with an uncoached noncoding reviewer; preserve assistance/error counts. |
| Should | Align recipe tool presentation with permissions. | Either filter actual custom tools by recipe or state accurately that recipe lists are recommendations while all seven remain available. Avoid implying a permission boundary that does not exist. |
| Should | Retain repair evidence as distinct artifacts. | Save first and second reports instead of only replacing `test-report.json`; retain independent expectations. The current bounded logs can truncate old evidence. |
| Should | Attempt a second distinct app only after the first passes. | Same pipeline, different domain, independent acceptance and total engineering effort record. Otherwise describe cross-domain repeatability as unverified. |
| Should | Replay the exact release on another permitted environment. | Record actual architecture, prerequisites and any installation/signing failures. Drop broad portability claims if unavailable. |
| Cut | New orchestrator or backend migration. | Do not adopt SWE-AF, SuperPlane, Symphony, Aperant, a new personal-login path or a Python rebuild for Thursday. Pi is already integrated. |
| Cut | All-three-app completion and 34-case coverage promises. | Keep remaining catalog entries as source-linked starting points. No additional domain earns solved status from sharing a primitive. |
| Cut | Full offline synchronization, live government connectors, CAC/PKI, scanners/patchers and authoritative physics. | These introduce unverified transport, authority, security or domain dependencies. Report them as future work unless already independently demonstrated within approved scope. |
| Cut | More directory polish, fake progress and expanded skill quotas. | Current views suffice. Spend remaining time on correctness, useful task flow, evidence and the portal. |

## Claims the team can use

[R] A defensible current statement is: the branch implements a local software-factory prototype that combines captured challenges, domain guidance, Pi coding sessions, bounded host tests/repair and human-reviewed local export. It targets standalone browser prototypes using synthetic inputs. Static review identifies implemented controls, while real-provider performance, task benefit, independent acceptance and field suitability require the attached execution evidence.

[R] After successful demonstration, narrow the wording to the specific accepted app, run, fixture set and device. Avoid solved-all-cases, autonomous approval, fully sandboxed, production-ready, complete USMTF, SFTRM-compliant, encrypted cross-device sync and measured Fleet savings unless independently established. Keeping the existing factory and reducing the promised result are compatible choices.

## Sources

- [E] `/Users/mukul/Documents/CDAO/FleetHarness`, branch `mvp`, commit `f72c5dc15aa6c34d2b9080c1c0b87742230cc16e`, source/docs/tests traced in [[Research/FleetHarness-MVP/What-Exists]].
- [E] [[Research/Council/Officer/Decision]], [[Research/Council/Builder/Decision]], [[Research/Council/Judge/Decision]], [[Research/FleetHarness-MVP/Officer-Test]] and [[Research/FleetHarness-MVP/Rules-Fit]].
- [P] [[Research/00-Brief]], [[Event/Rules]], [[Event/Judging]], [[Sprint/Submission-Checklist]] and [[Reference/Open-Questions]].
- [P] Event source referenced by the catalog: https://cdao.hackathon.maximus.com/event/norfolk/use-cases, not freshly authenticated in this review.

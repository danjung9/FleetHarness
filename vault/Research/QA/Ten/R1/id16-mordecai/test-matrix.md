# Planned acceptance evidence

The initial rows retain the planning baseline; current executed results are recorded in the build and verification updates below. Browser outcomes remain unverified. Planning generated contracts only. Expected values were fixed before implementation, using invented demo-v1 policy; no toolkit output or future implementation is the oracle. Original criteria and source meaning/provenance are retained in plan.md. JSON is frozen by the host after this phase; no build or repair may weaken it.

| Criterion and provenance | Inputs | Independent expected outcome | Planned browser journey / application tests | Result and evidence location |
| --- | --- | --- | --- | --- |
| GOV-01; recipe.acceptance[0], recipe GOV-01; integration | At t=100, ghost missing; repair authorization expiresAt=100; repair heartbeatAt=89. Otherwise valid. Explicit repair/register then fresh announce. | Each distinct eligibility failure rejects with its specified reason and completed count 0. Repaired intent becomes pending; final repair action executes once. No automatic retry or authentication claim. | eligibility-recovery on desktop and narrow; core.test.cjs eligibility, registration, validation, authorization tests | Unverified. Future host test-report.json criterion/journey entries and host-reported screenshot/trace paths; future verification.md for additional checks. |
| GOV-02; recipe.acceptance[1], recipe GOV-02; integration | Same batch/time, sensor=60, repair=40, reverse order; repair promotion=20 (tie) then 40; general-quarters repair modifier=30. | sensor wins both arrival orders and alone executes. Tie 60=60 grants no lease, action count stays 0. Saved promotion gives repair 80>60. General quarters yields repair 70>60; cruising and promotion 40 yields repair 80>60. | reverse-contention, tie-recovery, condition-promotion on both viewports; core.test.cjs arbitration/lease/policy tests | Unverified. Future host test-report.json, screenshots/traces at paths supplied by host, verification.md. |
| GOV-03; recipe.acceptance[2], recipe GOV-03; human | Execute one sensor action, queue two more, halt, attempt execute and new intent, reload and attempt execute. | Pending count 2→0; halt acknowledges repair and sensor; future submit/execute blocked; count remains 1 and completed sensor report survives reload. | halt-persistence on both viewports; core.test.cjs halt/state restoration tests; human review remains required | Unverified. Future host test-report.json and browser evidence; later human review.json must assess this revision. Automated checks do not replace original human method. |

## Domain invariant and boundary tests to build

All Node tests must import the actual core.cjs and exercise real transitions. Avoid copied implementation assertions, source-string checks and toolkit self-tests. Use node --test core.test.cjs browser-core.test.cjs. No external test dependencies.

| Test group | Input/boundary | Literal or invariant expectation | Browser partner |
| --- | --- | --- | --- |
| Registration | ghost absent then valid registration; duplicate registration; missing contract flag; disallowed action | Absent ghost rejected; explicit valid registration permits pending intent; duplicate or invalid manifest cannot replace registered authority; unsupported action refused, no report | eligibility-recovery |
| Manifest interval | now=100, expiry=100 vs 101; validFrom=101 | Equality expiry and not-yet-valid refuse; expiry 101 accepts when all else valid | eligibility-recovery plus Node boundaries |
| Authorization interval | now=100 expiry=99,100,101; wrong agent/resource/action | First two expired; 101 valid; wrong ownership/reference never permits intent | eligibility-recovery |
| Heartbeat | now=100, heartbeat=89,90,100,101 | 89 stale; 90 boundary fresh; 100 fresh; future 101 invalid | eligibility-recovery |
| Malformed telemetry | NaN, Infinity, null, string time, fractional/negative time, missing agent/resource refs, unknown condition | Fail closed with domain error and no lease/action; no uncaught transition or partial commit | eligibility-recovery and Node negative cases |
| Duplicate/replay | Same intent ID twice; execute same receipt twice; two active batches same resource | Duplicate rejected; one report maximum per intent; one active owner maximum; existing ownership blocks conflicting allocation | reverse-contention |
| Arrival invariance | Both permutations with equal now/policy/eligibility, including ineligible high-rank contender | Same eligible winner sensor at 60 vs 40; no authority from insertion order; ineligible candidate never wins | reverse-contention |
| Tie escalation | repair promotion 20, then save 40 and resolve anew | First no lease, winner null, context scores 60/60; after commit new decision repair 80>60; stale receipt cannot execute | tie-recovery |
| Policy bounds | promotion -1,101,1.5,empty; unsaved value 40; discard | Invalid input rejected without mutating committed 0; draft never affects decisions; discard restores committed value | tie-recovery; extra UI/keyboard review |
| Condition change | Resolve cruising, then apply general quarters before execute | Old receipt invalidated; re-resolution repair 70 beats sensor 60; immutable old snapshot still cruising | condition-promotion |
| Lease lifecycle | Lease issued t=100 expires=105; execute at104 vs105; explicit release; renew after expiry via fresh intent | At104 valid if heartbeat/etc fresh; at105 refused; no ownership overlap; explicit release permits a new batch; no silent renewal | reverse-contention and Node time vectors |
| Eligibility loss at execute | Grant then expire manifest/authorization or stale heartbeat | Revalidate and reject, report count unchanged, no execution from obsolete grant | eligibility-recovery and Node revalidation |
| Halt universal guard | pending, granted, rejected and completed work; any roster size including newly registered ghost; repeat halt | Pending/granted canceled, active leases revoked; all registered agents acknowledge; existing reports unchanged; every future allocation/action blocked; repeated halt idempotent | halt-persistence |
| Restore integrity | Serialize halted state then restore; corrupt schema, duplicate owner, dangling reference, completed-count mismatch | Valid state retains halt and one action; corrupt state locked with visible recovery, never grants work | halt-persistence plus Node serialization |
| Shared-core parity | Run registration/rejection, both contention permutations, tie, condition, expiry and halt through actual inline script and core.cjs | Deep-equivalent normalized receipts and state invariants across runtime environments; browser handlers use that same core | All journeys; browser-core.test.cjs |

Behavioral parity is not independent correctness proof: independent literal browser outcomes and invariant tests are both needed. Extracting and executing the inline core in Node verifies tested logic agrees with embedded logic, while host browser journeys verify the actual event wiring and persistence. Test IDs, receipt counters and times are synthetic, deterministic values.

## UX, failure and human review

Host executes every frozen journey in a fresh desktop and narrow context. No browser tool has been used by the planner. Actual screenshot/trace filenames are owned by the host and must be read from its report, never invented as existing evidence. Missing browser runtime is a failure, not a pass from Node tests. Additional manual checks: native keyboard operation and focus, error focus and draft recovery, no clipped buttons at narrow width, clarity of scores/competing values, saved-versus-unsaved policy, invalid local storage recovery, export content, and deliberate confirmed new session. These remain unverified until actually reviewed.

Storage failure must retain in-memory work with Session not saved. Draft save/discard must not silently replace committed authority. A failed persisted halt remains enforced in memory and warns visibly; intended browser reload persistence must still pass the frozen journey. Local storage is not secure or operationally durable.

## Deferred source obligations and operational review

No canonical criterion is deferred: all three are planned as complete synthetic recipe outcomes. The broader narrative is not fully implemented. Exact twelve-to-thirteen onboarding, real signatures, continuous attestation/quarantine, distributed bus/leases, authenticated escalation/promotion, physical halt hooks and cognitive-burden measurements are deferred for the reasons in plan.md and remain unverified. These have no invented canonical IDs. Packet has no additional evaluation criteria, deliverables or user criteria.

Required owner review: approved authority matrix, condition data, tie/promotion precedence and limits, identity issuance/verification/revocation, trusted clock, lease renewal and failover, in-flight work and halt acknowledgements, authorization to reset, tamper-resistant audit and retention, real runtime adapters and any safety implications. No source policy approval or operational readiness is inferred from tests.

Report statuses separately: planning artifacts generated; application generation/runnability/testing pending; reviewer acceptance pending; operational validation absent. Prototype checks and requirementsMet must remain separate. Preserve failed evidence; the same single bounded repair covers Node and browser gates, implementation only. Host owns test-report.json, hashes, screenshots and traces. Later verification.md records actual additional checks, failures, skips and limitations, without editing frozen contracts or .fleet/.

## Build evidence update, 2026-11-04

Frozen expected outcomes above are unchanged. Local command: `node --test core.test.cjs browser-core.test.cjs`; result: 13 pass, 0 fail, 0 skip. Application checks use actual core.cjs transitions and the actual inline core, not toolkit fixtures. See verification.md. Host browser evidence remains pending for every journey.

| Criterion | Actual application checks | Build result and evidence | Remaining verification |
| --- | --- | --- | --- |
| GOV-01 | core.test.cjs: distinct missing/expired/stale recovery; duplicate/unregistered; malformed telemetry; expiry boundaries; eligibility recheck | Passed locally; test names and command in verification.md | eligibility-recovery desktop/narrow journey and human assessment pending |
| GOV-02 | core.test.cjs: both arrival orders; tie/promotion; condition snapshot; unsaved/invalid drafts; lease exclusivity/expiry; replay. browser-core.test.cjs: actual inline parity | Passed locally; expected literals retain sensor 60>40, tie 60=60, repair 70/80 | reverse-contention, tie-recovery, condition-promotion browser journeys pending |
| GOV-03 | core.test.cjs: pending and granted halt; count remains one; acknowledgements including additional registered agent; future mutation guards; persisted halt; corrupt snapshot rejection. Inline parity vectors | Passed locally; synthetic state enforcement only | halt-persistence browser journey, reload storage and original human review pending |

Generated/runnable source is supplied. Browser usability, accessibility, reviewer acceptance and all operational integrations remain unverified; broader requirementsMet is not established by the local checks.

## Verification update, 2026-11-04

Executed `node --test core.test.cjs browser-core.test.cjs`: final 15 passed, 0 failed, 0 skipped. Initial added adversarial checks failed twice; evidence and the single bounded repair are preserved in verification.md. GOV-01 additionally checks authorization removal before resolution produces a rejected receipt. GOV-02 additionally checks corrupt restored resource/batch/score/grant and action receipt references fail closed, in both actual cores (browser-core.test.cjs:18, :37). GOV-03 retains its halt and restore checks. Every criterion's inputs, expected outcome, test/source locations and pending browser journeys are mapped in verification.md. All desktop/narrow journeys and original human review remain unverified. Prototype completion gate has not passed; broader requirementsMet=false. Host test-report.json, screenshots and traces are pending.

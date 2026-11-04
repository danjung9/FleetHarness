---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Make examples the approval contract and compile them into independent acceptance checks."
---

# Specs and acceptance tests

## Bottom line

[R] Ask the officer to approve concrete input and expected-output examples before code generation. [R] Generate a short specification and a traceable test list from those examples, then have an engineer check that the tests actually measure the promised behavior. [R] Keep approved criteria outside the repair agent's write access. [A] A specification generated from a vague request can still encode the wrong policy, even if every resulting test passes.

## From a need to a contract

[R] Use five steps, with the officer approving step 3:

1. [R] Capture the user, recurring task, current burden, allowed data and desired outcome in a short form.
2. [R] Ask about ambiguities with consequences: timezone, duplicate records, missing fields, conflicting rules, export destination and who may act.
3. [R] Show a one-page behavior contract with normal, boundary and failure examples. Include what the application must never do.
4. [R] Convert each accepted example into fixtures and executable checks with stable IDs. An engineer reviews the oracle, meaning the logic that determines whether the answer is right.
5. [R] Run those checks against each candidate. Show the officer input, expected output, actual output and evidence of the action.

[V] GitHub Spec Kit separates specification, planning, tasks and implementation, with clarification and convergence workflows in its current documentation. Its repository identifies an MIT license. These are workflow capabilities, not evidence that generated specifications are correct or that the process improves non-coder outcomes: https://github.com/github/spec-kit.

[R] Borrow the artifact sequence before adopting its whole CLI. [A] A full Spec Kit integration, its exact local version and compatibility with the team's setup have not been tested.

## Proposed contract fields

| Field | Example the officer can check |
| --- | --- |
| [R] Need | Find conflicting training reservations before a schedule is issued |
| [R] User action | Upload a synthetic CSV and press Check schedule |
| [R] Inputs | Resource ID, start time, end time, required capacity |
| [R] Rules | Intervals are start-inclusive and end-exclusive; timestamps include offsets |
| [R] Output | Conflict pairs with the source row numbers |
| [R] Failure behavior | Invalid rows are shown with reasons; partial results are clearly labeled |
| [R] Forbidden behavior | Never change the source file or issue a schedule automatically |
| [R] Constraints | Runs locally with network disabled; no external fonts or telemetry |
| [R] Acceptance | AC-01 through AC-08, with approved fixtures |
| [R] Limits | Prototype checks a proposed schedule; it does not certify readiness |

## Example 1: conflict detection

[R] The following is an invented, synthetic example, not an event use case requirement. Approve the interval rule explicitly so adjacent sessions are not falsely flagged.

| Acceptance ID | Synthetic input | Expected result |
| --- | --- | --- |
| [R] AC-01 | R1 at 09:00 to 10:00 and R1 at 09:30 to 10:30, same date and offset | One conflict pair with both row numbers |
| [R] AC-02 | R1 at 09:00 to 10:00 and R1 at 10:00 to 11:00 | No conflict |
| [R] AC-03 | R1 and R2 at identical times, with no shared other resources | No resource conflict |
| [R] AC-04 | End precedes start | Row rejected with an explanation |
| [R] AC-05 | Same instant written using different UTC offsets | Comparison uses normalized instants |
| [R] AC-06 | Timestamp has no offset | Row rejected under this contract; no timezone guessing |
| [R] AC-07 | CSV cell contains instruction-like text | Text remains inert data |
| [R] AC-08 | Valid file processed with network disabled | Same result; original file hash unchanged |

[V] Gherkin supplies a readable Given/When/Then structure, but executable step definitions still need implementation: https://cucumber.io/docs/gherkin/reference/. [R] A human-readable test could be:

```gherkin
Scenario: Adjacent reservations can use the same resource
  Given resource R1 has a reservation from 09:00 to 10:00 UTC
  When a reservation from 10:00 to 11:00 UTC is checked
  Then no resource conflict is reported
  And the original reservations are unchanged
```

[R] For Thursday, a JSON fixture table plus ordinary automated assertions is enough; a Gherkin runtime is optional. [R] Map AC-02 to both a function test and a browser upload test, and display the actual exported conflict list rather than just a green badge.

## Example 2: message extraction

[R] Use synthetic text such as `MSG-001: Equipment check due 2026-11-05T13:00:00Z`. Require a proposed task, exact source span and explicit timestamp. [R] If a second message says only `due tomorrow`, preserve the phrase and mark the timestamp unresolved unless a reference date and timezone are supplied. [R] A schema-valid JSON object with an invented due date must fail.

[R] Test absence of evidence: no source task means no invented task. [R] Test contradictory dates, malformed input and duplicate message identifiers. [R] Let a person accept or reject extracted proposals before export; never treat extraction as authority to assign work.

## Example 3: offline edits and synchronization

[R] Separate local persistence from synchronization. Test create, close, reopen and recover while disconnected. [R] For a later two-device implementation, test replaying the same edit twice, conflicting edits, interruption during upload and restart after acknowledgment. [R] Require stable change IDs and an explicit conflict outcome; a silent last-write-wins policy needs deliberate approval.

## Evidence and limits

[V] Playwright's web assertions retry until success or timeout, which helps test asynchronous UI behavior: https://playwright.dev/docs/test-assertions. [R] Also assert persisted state and exported content, since a visible success message alone is a weak oracle.

[V] EvalPlus expanded HumanEval tests by 80 times and found previously missed incorrect programs across 26 models, showing that sparse tests can overstate correctness. This is a 2023 code-generation study, not a quantified prediction for FleetHarness: https://arxiv.org/abs/2305.01210.

[R] Keep a few engineer-authored holdout cases outside the builder's context and writable area. [R] Prove each critical test can fail using a deliberately incorrect implementation, such as changing the overlap predicate. [R] Treat holdouts as additional evidence, not protection against all overfitting.

## Sources

- [V] https://github.com/github/spec-kit (current repository documentation, read November 4).
- [V] https://cucumber.io/docs/gherkin/reference/
- [V] https://playwright.dev/docs/test-assertions
- [V] https://arxiv.org/abs/2305.01210 (2023, revision 3).
- [P] Project README at `~/Documents/CDAO/FleetHarness/README.md`; [[Event/Rules]].

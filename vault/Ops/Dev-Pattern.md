---
type: reference
status: active
owner: mukul
updated: 2026-11-04
summary: "How work moves from assignment to landed change in this org: the rules the runner enforces and the rules seats follow."
---

# Development pattern

[P] Mukul asked that this org's development follow the pattern he uses elsewhere. This note holds only the generic practice. [R] The runner enforces what it can, and the note says which is which.

## The flow

1. A director writes a task with the files it will touch and the condition that makes it done. A task without them is held back. [enforced]
2. One writer per file at a time: a task waits while another running or awaiting seat holds one of its files. [enforced]
3. The seat works in its own clone and branch and writes the failing test first. It saves the failing output and reports it on a `PROOF:` line. [enforced that the line exists; the reviewer checks it]
4. Its report walks each done condition to the change and test that meets it. [reviewer checks]
5. The runner runs the test gate itself, commits, and asks a reviewer who did not write the change. The reviewer checks the exact commit, that tests can fail, scope against the task's files, and teammate overlap. [enforced]
6. Approval binds to that exact commit. If the clone's head differs from what was reviewed, the change goes back to review. A seat with a review pending gets no new work, so it lands before it starts more. [enforced]
7. The gate refuses a pass count below the latest team baseline, and refuses added skip or only marks. [enforced]
8. Reviewed work lands without force on the reviewed branch, rebased and retested first. [enforced]
9. Scope freezes at noon Thursday: code seats stop, acceptance reruns on one named commit, and the submission names that commit. [overseer]
10. Only Mukul's own words count as a go, logged verbatim with the commit named. Nobody invents an approval. [convention]
11. Each seat keeps `.tmp/JOURNAL.md`: outcome, verification and next action, so a fresh thread loses nothing. [convention]

## What each rule prevents

| Rule | Prevents |
| --- | --- |
| Approval bound to a commit | Unreviewed or stale code landing |
| Failing first, independent rerun | False passes and tests that cannot fail |
| Done conditions and files on tasks | Scope creep and false done |
| One writer per file | Duplicate writers and conflicts |
| Count and mark checks at the gate | Quietly weakened tests |
| Land before starting more, plus a freeze | Stacks of unlanded work and late breakage |
| Verbatim decisions | Invented approvals and overclaiming |
| Journals | Lost context |

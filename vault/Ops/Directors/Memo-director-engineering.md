---
type: memo
status: active
owner: mukul
updated: 2026-11-04
summary: "Finish existing integration and judge the smaller experiment before assigning more work."
---

# Engineering decisions

[P, Flow-Goals] Ten satisfactory catalog builds govern work. [E, round-one scoreboard] Ten finished, nine automatic passes, zero satisfactory; nine negative judgments. [E, Round-101] The smaller experiment has three automatic passes, including ID 36 at 20/20 journeys, but ID 12 is now judged NOT for input-format substitution. Scratch results are not shipped behavior.

[R] Write an empty new-task list. Withdraw the stale ID 36 dispatch; finish existing work. Dev-5 retains primary-deferral repair; builder's overlapping implementation becomes input to that owner. No expanded allocation.

[E, dev-1 journal] Combined recovery/sandbox integration is already active. [R] Keep that owner, incorporate dev-3's separated verifier, and serialize preflight and telemetry afterward. Dev-2 must prove actual Start behavior. Builder must correct turn-ID usage attribution and terminal persistence. Preserve reviewed regressions.

[E, feed-118] Cleanup landed at c6ce52d; native discovery and detached Stop remain unverified. [R] Main owns that receipt and experiment execution. Retain round-one artifact limits.

[R] Require narrative source coverage, complete synthetic outcomes and independent judgments before another full round. ID 16 shows why a true requirementsMet flag alone is insufficient. Preserve frozen failures and genuine missing-authority blockers.

[R] Protect Dan's 1d9eeee frontend, Windows 4c49e85 checks and hosted f579651 changes. Its demo-scope smoke cannot replace catalog acceptance. Keep Thursday noon freeze and exact-byte human acceptance. No deployment or publication work.

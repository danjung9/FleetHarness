---
type: memo
status: active
owner: mukul
updated: 2026-11-04
summary: "Preserve the completed build, reconcile AppYard changes and sequence only the next verification fix."
---

# Engineering decisions

[E, Real-Build-Run1] The modified 631849f factory completed five phases and reported 22 generated tests passing at 15:24. [R] Credit the 4 PM build gate. Lead with that build and its task, retaining the CLI backup. Neither artifact is accepted.

[E, latest adapter receipts] Both candidates FAIL: factory clock display uses midnight instead of 0800; CLI saved-draft recovery differs. Factory numeric cases and offline import pass, with gaps. [R] Quality confirms defects and remaining coverage; subsequent repairs change instructions, not output files.

[E, relay and gate log] AppYard d0f4c69 adds contracts, browser checks and source-export protections; the gate reports 96 pass, 20 fail. Browser launch errors explain some failures; downstream causes need proof. [R] Preserve Dan's changes. Reproduce old export cases before adding a fix; keep seven historical defects open pending matching closure evidence.

[R] Retain overseer-owned dev-2 route, dev-3 sandboxed tests and dev-1 export work. Collapse duplicate dev-1 queue entries. Code enablement remains required. Queue one bounded architecture reconciliation and one V1 test-counting fix after dev-3 releases verification files. Defer broader redesign.

[R] Reviewed work targets dev/reviewed; mvp requires Mukul's own instruction. Protect frontend ownership. Keep 6 PM task acceptance, 7 PM evidence packaging and Thursday noon code freeze. Put person-only decisions on Product's morning list. See [[Ops/Directors/Sprint/Engineering-Meeting-31]].

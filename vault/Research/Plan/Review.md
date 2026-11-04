---
type: research
status: active
owner: mukul
updated: 2026-11-04
summary: "Independent check of Plan.md and Findings.md against code at 631849f: the plan stands with changes, and the ranked changes and Thursday must-list are here."
---

# Plan review

## Verdict

[R] The plan stands with changes. The synthetic training draft remains the right artifact: there is a matching solver, a checked answer key and an acceptance sheet. What changes are the build-route rules, the entry label and the user evidence. [E] Code checked at `631849f`, read only, 15:01 EST. Live results added afterward are marked.

## Findings checked against the code

| Finding | Status | Evidence |
| --- | --- | --- |
| 2, 10: event key works in the app only through Pi | Confirmed for the shipped code | `electron/codex-rpc.ts:39-41`, `codex-session.ts:67-68`, `main.ts:166-169,176`. A small patch changes this, see below |
| 12: agents can edit their own tests | Confirmed, worse than written | `electron/pi-backend.ts:214,220,229` is a prompt-only ban; `:191-197` guards only requirements, packet and design. A comment-only test file passes: `verification.ts:8,61`, BUG-V1 |
| 14: Stop is incomplete | Confirmed statically for background jobs | `pi-coding-agent/dist/core/tools/bash.js:75,117`; no packaging cancel `main.ts:72,224`; Home hides Stop `src/App.tsx:235-238` |
| 11: no OS sandbox | Confirmed | Pi: `harness/phases.ts:17`, `pi-backend.ts:125`. Agent-written tests run unsandboxed on both engines: `verification.ts:26-29` |
| 13: export race | Confirmed, source export only | `main.ts:92,94,100-104`, BUG-E1 and E2. ZIP rechecks at `main.ts:119,138`, `executable.ts:78-79` |
| 20, 21: Studio; unconfirmed starts | Stale | Studio deleted. The only start call is `App.tsx:255`, behind the dialog from `:237`. Cards only save briefs |
| Token storage | Confirmed | Sign-in kept in a file store, `codex-rpc.ts:41`, `codex-account.ts:17`. Pi key is memory-only unless Remember is on, `main.ts:176-177` |
| 3: the partial entry misses requirements | Confirmed, understated | Raw ID 11 says departmental agents must deploy. The Fleet-Ready list sits in use cases 32 to 37 |
| 18: criterion label | Wrong label | The criterion is Barrier Removal, not Barrier identification |
| 9: inventory | Stale in part | One front end now |
| 1, 4, 5, 19, 22 to 27 | Unverifiable from code | No trial, form, run or web check. Finding 19, no real build, was then overtaken by the live run below |

## Plan changes, ranked

1. [R] Run both routes now, not either. `Plan.md:120` says or. A failed stage restarts from zero: `pi-backend.ts:76-77`.
2. [R] Replace the canary gate at `Plan.md:84,149`. Pi fails it by design. Use the locked profile result below, or go straight to the checker.
3. [R] Make the named user and measured burden a must by Thursday noon. `Plan.md:216` accepts no impact number. Rule 2 and the 30% weight make this the likeliest way to lose.
4. [R] Stop leading with "Partial ID 11", which invites scoring against the absent departmental agents. Real build: Naval Agentic AI. Checker only: Bring Your Own Idea. An organizer confirms.
5. [R] Add the Fleet-Ready items: audit log, cited sources, one-page path. The plan flags only sync.
6. [R] Delete Studio work: `Plan.md:75,104,111,233`; Findings 9, 20, 21. Home opens on the catalog, so start the demo on the task app.
7. [R] Scalability, 20% of the score, has no evidence. If a route works by 6 PM, build a second brief Thursday morning.

## Must-list for Thursday 2 PM

Only items 10 and 11 touch backend or agent logic, and only 12 touches Dan's frontend. The rest sit outside the repo.

1. Portal team, form fields, terms signature, category and sync ruling.
2. Dan: rule 7 split for the imported code at `ffc21e2`. Disclose ledger rows held back from pushed copies (rule 5).
3. Done at `631849f`, see [[Research/QA/Results-631849f-GUI]]: smoke scripts outside the agent sandbox.
4. Started 15:07: checker route.
5. Started 15:11: one real build. Check processes after.
6. Task app: fresh-input check, failure states, personnel totals, review invalidation, save and import, action log, source labels.
7. By 7 PM: final copied bytes, writers stopped, per-file digests, negative controls, offline cold start.
8. One Sailor, matched synthetic trial, baseline labeled as an estimate.
9. Package, the 32 rows plus Fleet-Ready, mentor read at noon, submit by 1:15 PM.

Should, only if the factory is shown:

10. Backend: `main.ts:100-112` copy to temp, hash the copy, then deliver; `storage.ts:89` length-prefix.
11. Agent logic: reject test files with no subtests, `verification.ts:8`; flag test changes after build, `pi-backend.ts:218,231`; ban background jobs, `:125`.
12. Dan's frontend: Stop on Home, `App.tsx:235`. Report it, do not patch.

## Live results added after the review

- [E, live call through the bundled Codex app-server, 15:08] The app's Codex engine can use the event API key login with three small changes in a throwaway copy, and needs no ChatGPT sign-in. Both event models appear in the model list.
- [E, live probe, 15:09] Under the app's default `workspace-write`, an agent shell can read outside its workspace: a home canary, a home folder listing and its own login file all exit 0. Under a permission profile in a scratch `config.toml`, with no sandbox parameter on `thread/start`, those reads exit 1, writes outside and network stay denied, and workspace writes, node and git still work. [R] This is the strongest cheap product fix available, and it is also a finding for the submission.
- [E, fixture, [[Research/QA/Results-631849f-GUI]]] Stop ended a running Pi shell command and its ordinary child within the observation window, with no later requests. Detached background jobs and the Codex engine remain unmeasured, so finding 14 stays open for those.
- [E, fixture] U1, U2 and U3 reproduce in the running app.

## Not verified

Runtime behavior of Stop for detached jobs and the Codex engine. Credential file format and encryption. Team state, form fields, pitch length. Organizational limits on a personal sign-in. Whether rule 11's final submission binds Thursday.

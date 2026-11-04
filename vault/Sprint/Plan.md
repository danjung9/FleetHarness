---
type: plan
status: active
owner: mukul
updated: 2026-11-04
summary: "The path from now to Thursday 2 PM and Friday finals."
---

# Sprint plan

All of this is a proposal [R], except the fixed times, which come from [[Event/Schedule]] [P].

## Fixed points

- Thu Nov 5, 2:00 PM: downselect submission due in the portal.
- Fri Nov 6, 9:00 to 11:00 AM: final presentations, if selected.
- The venue closes at 8 PM on Wednesday and Thursday.

## Wednesday

| When | Goal |
| --- | --- |
| Now | Get on a team in the portal, and log Codex in |
| Before lunch | Pick one use case and write down the user, current process and burden number |
| 12:00 to 5:00 PM | Thin working path end to end, on synthetic or public data only |
| 5:00 to 8:00 PM | Add the human approval points, the logging and a stop control. Try it with no network |

## Thursday

| When | Goal |
| --- | --- |
| 9:00 to 11:00 AM | Harden the main path. Get mentor and Sailor feedback |
| 11:00 AM to 12:00 PM | Working lunch. Draft the submission from the [[Sprint/Submission-Checklist]] |
| 12:00 to 1:30 PM | Freeze scope and finish the submission |
| **1:30 PM** | Submit, leaving 30 minutes of margin |
| After 2:00 PM | Refine, rehearse and prepare for finals |

## Friday

Rehearse early, and present from 9:00 AM if selected. Have a recorded backup of the demo.

## How to choose a project

Score candidates from [[UseCases/README]] against [[Event/Judging]]:

1. Can we name a real user and a burden number? A Sailor on the team helps most here.
2. Can a useful version run disconnected?
3. Would it apply beyond one ship class or rating?
4. Can we demo it with only synthetic or public data under rule 4?
5. Can it be built by Thursday noon with this team?

A use case with few teams is not automatically better, but it does leave more room to stand out. Counts are in [[UseCases/README]].

Organizers say teams may extend existing tools and do not have to start from scratch [P]. If we do, log it in [[Sprint/Prior-Work-Log]].

## Queued after the backend merge, 2026-11-04 18:23 EST

- [P] Mukul approved: prove delivered apps work with wifi off, add a Compose file to delivered apps so Ark's packaging can take them into UDS, add change requests after a build, and test building with a local model on one challenge.
- [R] For the team, not agents: one Sailor trial with a stopwatch, and run two of the ten challenges through Ark for a real comparison.

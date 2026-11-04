Build a synthetic training draft for a coordinator to inspect four proposed administrative practice sessions. This is a partial ID 11 demonstration, not an issued schedule or operational compliance tool. Use editable synthetic input, fixed assigned people and rooms, integer minutes and the supplied constraints. Find a feasible draft over the listed start choices, or state infeasible, invalid input or search limit reached as distinct outcomes. Never drop or reassign a request, relax a limit or invent a qualification to make it fit.

Day one begins at minute 0 and day two at minute 1440. Operating and both-person availability windows are `[0,240]` and `[1440,1680]`. P01 has Q-A, a 120-minute maximum over both days combined and a 30-minute rest gap. P02 has Q-B, a 120-minute maximum over both days combined and zero rest gap. Use half-open session intervals; the explicit rest rule remains separate.

| Request | Duration | Allowed starts | Person | Room | Required qualification |
| --- | --- | --- | --- | --- | --- |
| A | 60 | 0 | P01 | Room-1 | Q-A |
| B | 60 | 0, 90 | P01 | Room-1 | Q-A |
| C | 60 | 0 | P02 | Room-2 | Q-B |
| D | 60 | 1440 | P02 | Room-2 | Q-B |

Show all four requests and whole-horizon personnel totals. Check that each complete session fits the operating and assigned-person windows, has the supplied qualification, and respects person rest, room exclusivity and the whole-horizon minutes limit. Valid edits must recompute results from current input; no canned answer. Invalid input retains an actionable error; infeasibility retains all requests for correction; a stopped or exhausted search cannot claim no solution exists. The default helper search allowance is 50,000 nodes; record a distinct exhausted result if reached. Keep technical exhaustion controls with the evaluator if needed.

A person marks the current draft reviewed. Any relevant input or result edit clears that review. Provide portable save/import of the exact inputs and draft; verify close/reopen recovery and offline use. Do not call file transfer reconnect synchronization. Deliver self-contained `index.html`, testable core and development tests, fielding limitations, verification notes and the practical README written after implementation. Keep packet integrity, phase contracts, system-design progress, source hashes and human review.

Disclose omissions: recurrence, SFTRM interpretation, departmental negotiation/agents, real readiness data, qualification policy beyond supplied values, official-calendar writes and reconnect sync. No contacting people, issuing schedules or operational-system updates. If automatic generation is not accepted in time, label the fallback a conflict checker with person-selected times and independently checked validity.


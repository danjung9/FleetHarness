# Synthetic PB4T intake fixtures

All records in `synthetic-data.json` are fictional and deterministic. No personnel, training records, operational systems or external services were accessed. The input format, fatigue values and recurrence grammar are invented for this demonstration. They are **synthetic, not validated against the real format** and do not establish SFTRM compliance or operational readiness. Owner-approved rules remain unavailable. Requirements and scope retain their real-data deferrals.

This artifact supports the complete weekly PB4T workflow: departmental proposals, qualified crew, ship operational windows, shared resources, rejected proposals and counterproposals, recurrence coverage, weekly schedule allocations, exact personnel loading and invalid-draft recovery. This is data preparation only, not implementation, application verification, delivery or approval. The host must independently validate and freeze these files before research. Downstream phases must preserve and reuse these exact fixtures, embedding needed sample data into the requested self-contained index.html without fetching local fixture files.

## File contract

The envelope has `classification` (string, always `synthetic`), `useCase` (string), `fields` (array of name/type/description objects), `records` (array), `scenarios` (array), and `limitations` (array of strings). Each regular record has exactly the four declared fields:

| Field | JSON type | Meaning |
| --- | --- | --- |
| id | string | Stable fixture identifier |
| label | string | Fictional fixture description |
| input | object | Fully specified fictional PB4T dataset below |
| expected | object | Independently hand-keyed answer facts, excluded from solver input |

There is one complete weekly baseline record, including six fictional personnel, five agents, five drills and three resources. The 22 scenarios each have `name` (string), `kind` (`typical`, `edge` or `invalid` string), `input` (object), and `expectedBehavior` (string). Every scenario input is fully materialized, with no patch interpreter or dependency on application code. Invalid scenarios intentionally violate the nested input contract. They are not regular records. Expected prose describes semantic outcomes; planning chooses final API status/error spellings.

## Nested input schema

All IDs and descriptive names are strings. Arrays preserve their supplied order unless explicitly sorted below. Integer means a JSON number that is finite and integral. No implicit coercion or authoritative defaults are allowed.

| Path | Type and meaning |
| --- | --- |
| scenarioId, provenance | string; stable case ID and synthetic origin statement |
| synthetic | boolean, must be true |
| weekStart, timezone | string; ISO 8601 UTC timestamp and `UTC` |
| horizonMinutes | array `[start,end]`, integer minutes; baseline `[0,10080]` |
| policy | object with version, recurrenceMode, approvalStatus strings and minimumRestMinutes, dailyDutyLimitMinutes, rolling24hDutyLimitMinutes integer numbers |
| agents | array of objects: id, department, name, proposalRule strings; requestIds array of strings referencing owned requests |
| personnel | array of objects: id/displayName strings; qualifications array of exact qualification strings; availability and priorDuty arrays of minute intervals; dailyDutyLimitMinutes and rolling24hDutyLimitMinutes integer numbers |
| resources | array of objects: id/name strings, capacity integer number, availability array of minute intervals; all supplied capacities are 1 (exclusive use) |
| operations | object: allowedWindows and blackouts arrays of minute intervals |
| requests | array of request objects described below |
| trainingRules | array of rule objects described below |
| trainingHistory | array of completion objects: id, ruleId, occurrenceId strings and completedMinute integer number |
| search | object: maxCandidateChecks positive integer number; requestOrder, candidateOrder, objective strings |
| initialAssignments | array of proposed assignments: requestId string, startMinute/endMinute integer numbers, personIds/resourceIds arrays of reference strings; this is a possibly conflicting draft, not certified output |

Each request has id, agentId, family, ruleId and occurrenceId strings; durationMinutes positive integer number; candidateWindows array of minute intervals; requestedStartMinute integer number; roles array of objects; resourceIds array of strings; priority integer number; mandatory boolean. Each role has qualification string, count positive integer number, and preferredPersonIds array of known personnel IDs. All supplied counts are one. One distinct person must fill each role; the same person cannot fill two concurrent roles. All assigned personnel are on duty for the complete drill duration. Qualifications are exact matches. Source examples Fire Party Leader, EOOW and TAO are used as labels; Engineering Technician, Flight Director and Flight Safety are fictional demonstration qualifications, with no real credential or expiry claim.

Each recurrence rule has id/family strings, anchorMinute integer number, periodMinutes and windowMinutes positive integer numbers, requiredCount positive integer number, requestIds array of known request IDs, and mandatory boolean. Fixtures use windowMinutes=periodMinutes and requiredCount=1. Baseline rules are weekly; this is not a statement about actual SFTRM frequency.

## Time, constraints and deterministic choices

The week begins Monday 2026-11-09 00:00 UTC. All times are integer minute offsets from that instant, with day 0 Monday. Negative offsets permit earlier history; offsets beyond 10080 permit future deadlines. Half-open `[start,end)` intervals include start and exclude end. Touching intervals do not collide. Durations equal end minus start; end must exceed start. Cross-midnight work is split at each UTC midnight for daily accounting. UTC avoids daylight-saving ambiguity and is not an assertion about a real ship's clock.

Candidate windows in these fixtures are exact duration slots, so only their start is a candidate. General wider-window enumeration is outside this data grammar. Assignment must be wholly inside personnel, resource and allowed operational availability and outside every blackout. Blackouts supersede allowed windows. All resource references are exclusive capacity one. Missing resource/person/agent/rule references, duplicate IDs, malformed intervals, nonpositive durations or inconsistent ownership/occurrence links are validation errors. A valid request lacking qualified or available crew is a scheduling infeasibility, not a malformed-input error.

The baseline fictional minimum rest is 60 minutes **between every pair of distinct duty intervals**, including prior duty and drills. Prior duty is immutable and counted, not movable availability. This deliberately simple rule applies between consecutive drills as well as watches; it is not naval fatigue policy. Overlap is prohibited independently of rest. Exactly 60 minutes is allowed, 59 is rejected. Simultaneous and historical obligations cannot be silently ignored.

The effective daily and rolling limits are the smaller of policy and individual values. Baseline limits are 240 minutes per UTC calendar day and 300 minutes in any continuous 1440-minute window. Count interval intersections, including prior duty, even if outside the scheduling horizon. Check rolling totals across midnight as well as calendar totals. Exactly the cap is allowed; one minute over is rejected. Prior duties in fixtures do not overlap each other. Heatmap drill minutes exclude prior duty; total duty checks include it, and outputs must distinguish the two. No other work or off-roster fatigue is modeled.

Departments own their requests and offer requested slots with preferred personnel. The shared negotiation retains higher-priority assignments first (descending numeric priority, then ascending request ID), processes candidate windows in supplied order, and considers role personnel with listed preferences first followed by other eligible IDs ascending. A candidate check is one complete time/person/resource combination tested against constraints; validating input is not a candidate check. Checking a complete solution requires placement of every due mandatory request. On rejection, the owning agent counterproposes the next valid candidate with the blocking reasons. No hard constraint relaxation is permitted. The objective is first feasible complete roster, not global optimization. An exhausted candidate-check budget means feasibility unknown, distinct from an exhaustively proven infeasible space. Partial allocations must retain unresolved obligations and cannot be acknowledged as complete.

## Fictional recurrence grammar

For rule suffix `X`, occurrence IDs are `O-X-k`, where k is a zero-based nonnegative index. Baseline rule `RULE-DC-1`, for example, generates `O-DC-1-0`. Occurrence k has window `[anchorMinute + k*periodMinutes, anchorMinute + k*periodMinutes + windowMinutes)` and deadline at its end. Expand all windows intersecting the planning horizon, including carry-in and future-deadline windows. A due window ends within the horizon (including exactly 10080). Its required count must be satisfied by linked history or a drill wholly within that window. Completion history at a window's end belongs to the next window, never the earlier one. Only the same rule/occurrence earns credit, no cross-window carry-over. A completion at minute 60 is in the carry-in window `[-1440,2880)`.

Already completed occurrences do not require redundant scheduling; future-deadline occurrences are reported pending-future and need not be placed this week. Omitted future windows must never disappear from coverage. Missing due history/request links are invalid; a valid linked request with no feasible slot leaves its occurrence unmet. No automatic new requests or dates are invented. Request IDs need not match rule suffixes, but their occurrence links must match generated IDs. The recurrence cases deliberately retain CS-A as the already completed obligation's proposal and CS-C as a future proposal, so the workflow must account for them without scheduling either as a due drill.

## Independent baseline answer

The requested board has two colliding pairs, each involving both a person and resource (four conflict facts). DC-1 and ENG-1 share P1/R1 over `[540,600)`; CS-1 and WPN-1 share P3/R2 over `[660,720)`. These are two pair groups, not four separate drill pairs. P6's restricted availability prevents an unintended substitute in this baseline.

| Request / agent | Accepted UTC interval | Crew | Resource | Agent decision |
| --- | --- | --- | --- | --- |
| DC-1 / Damage Control | Mon 09:00 to 10:00, `[540,600)` | P1 | R1 | Retain higher priority |
| ENG-1 / Engineering | Tue 09:00 to 10:00, `[1980,2040)` | P1, P2 | R1 | Reject 540 due P1/R1, counterpropose 1980 |
| CS-1 / Combat Systems | Mon 11:00 to 12:00, `[660,720)` | P3 | R2 | Retain higher priority |
| WPN-1 / Weapons | Tue 11:00 to 12:00, `[2100,2160)` | P3 | R2 | Reject 660 due P3/R2, counterpropose 2100 |
| FLT-1 / Flight Operations | Wed 09:00 to 10:30, `[3420,3510)` | P4, P5 | R3 | Accept requested slot |

There are zero remaining conflicts. All five occurrences have deadline 10080 and are satisfied by their scheduled drill. Weekly drill loads: P1 120, P2 60, P3 120, P4 90, P5 90, P6 0 minutes. Sum=480 person-minutes, although drill elapsed durations sum to 330 minutes because engineering and flight each require two people. P1 day 0/day 1 =60/60; P2 day 1=60; P3 day 0/day 1=60/60; P4 and P5 day 2=90 each; all other day cells are zero. Baseline has no prior duty. The machine-readable answer contains exact allocations, conflicts, loads, coverage and negotiation facts. It is a hand-keyed oracle, never an application calculation or toolkit output.

## Scenario expectations

Each of the 22 scenario objects includes a complete input and explicit expectedBehavior. In addition to the baseline and edit recovery, these cover:

- Qualified substitute: unavailable P3 is rejected and qualified P6 takes CS-1 at 660. Removing all TAO qualifications instead yields infeasible and unmet recurrence.
- Cross-midnight rest: P1 prior duty `[1380,1441)` is 61 minutes; start 1500 has 59 minutes rest and fails, 1501 has 60 and passes. Total P1 duty=121; calendar Monday=60, Tuesday=61.
- Daily cap pair: 180 prior minutes plus 60 drill=240 passes; 181+60=241 fails. The 300-minute rolling cap does not bind.
- Rolling cap pair: prior `[1140,1380)` plus drill `[1500,1560)` produces 300 minutes within 24 hours, with separate daily totals 240 and 60; cap 300 passes, cap 299 fails.
- Exhaustively impossible: two mandatory drills have exactly the same sole R1 slot. Two requests cannot fit capacity one regardless of personnel. Report infeasible and unmet obligations, preserving rejected drills.
- Search budget one: the known feasible baseline cannot complete all five requests within one candidate check. Report search exhaustion, not infeasibility.
- Recurrence: windows `[-1440,2880)`, `[2880,7200)`, `[7200,11520)`. H1 satisfies occurrence 0; CS-B at 3540 satisfies occurrence 1; occurrence 2 is pending-future. Moving CS-B's sole slot to 4000 makes the due occurrence impossible because it is outside operations. An outstanding future deadline does not itself make the current week infeasible.
- Blackout boundaries: `[660,720)` and `[780,840)` are allowed adjacent to blackout `[720,780)`; the blackout slot itself is rejected.
- Board edit: move accepted ENG-1 back to 540, observe P1/R1 collision and block acknowledgment. Correct or recompute to 1980, restoring exact baseline loading and coverage. Mark derived results stale after edits and retain correction input.
- Invalid cases: empty input, unknown resource, missing rest policy, zero duration, reversed interval, inconsistent occurrence ID, string duration and duplicate personnel ID. Reject with specific reasons, block review, and preserve input/last valid draft for recovery. No silent defaults.

The data does not prescribe storage technology. Later planning must fix reload/persistence semantics; an explicit reset-to-fixture operation must restore the original baseline and visible synthetic provenance. Review allowed in the baseline means only eligible for a local synthetic draft acknowledgment; no owner approval is recorded or implied.

## Limitations and handoff

Values, priorities, recurrence history semantics, capacity assumptions and candidate enumeration are intentionally bounded fictional rules. These examples cannot certify an actual roster, SFTRM coverage, training quality or fatigue safety. They do not cover role expiry, multi-capacity resources, real watch rotations or every multi-week recurrence pattern. Policy confirmation and domain review remain required for operational use. No real departmental communication, publication, delivery or deployment is authorized by these artifacts. The hand-keyed expectations establish data-case outcomes, not application acceptance; downstream tests must exercise the actual application and evaluated shared computation.

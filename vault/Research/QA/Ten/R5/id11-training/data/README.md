# Synthetic PB4T data handoff

All records are fictional and deterministic. No records were attached (`inputs/manifest.json` has no sources), and no operational system or external service was contacted. The fictional ship, identities, qualifications, history, availability and policy values were created for this brief. This is an invented JSON grammar, **synthetic, not validated against Navy or SFTRM formats**. These fixtures do not establish operational readiness or actual SFTRM compliance. Owner-approved operational policy and real-data validation remain outstanding as described in `scope.md`.

## Purpose and separation

`synthetic-data.json` supports Engineering, Weapons, Combat Systems, Damage Control and Flight Operations negotiating a weekly PB4T calendar. It includes engineering casualty controls, Combat Systems exercises, Damage Control drills, flight quarters and a Weapons exercise. The package tests shared EOOW/TAO personnel, a Fire Party Leader collision, an independent simulator collision, ship restrictions, qualified assignments, fatigue and all due fictional training occurrences.

The top-level structure is exactly `classification`, `useCase`, `fields`, `records`, `scenarios`, `limitations`. Classification is `synthetic`. `fields` describes the three required fields on every regular record:

| Field | JSON type | Meaning |
|---|---|---|
| recordId | string | Unique fixture ID: baseline-week, shifted-operations or tiny-impossible |
| solverInput | object | Complete, independently usable fictional weekly package |
| expected | object | Data-agent answer key, separate from computational input |

Pass **only `record.solverInput`** to later computations. Never use `expected` to compute, substitute or display solver answers. Later samples and tests must reuse these exact frozen fixtures and scenario mutations. Embed necessary fixture inputs in the self-contained HTML as requested by the brief; do not fetch local data files. Research, architecture, protocol design, browser implementation and application verification are later phases. No application was built here.

## Nested solverInput schema

Every property listed below is required in these regular packages unless explicitly described otherwise. Arrays can be empty where the meaning is stated. IDs and timestamps are strings; integer quantities use JSON number. Booleans are JSON boolean. Relationships use stable IDs, with unique IDs within each entity collection. An empty candidate list means no eligible candidate, not permission to assign anyone.

| Property | Type and nested fields |
|---|---|
| metadata | object: schemaVersion, classification, ship, timezone, policyVersion, notice (strings), resolutionMinutes (number), horizon (object with start/end timestamp strings) |
| departments | array of objects: id, agent, responsibility (strings) |
| qualificationCatalog | array of objects: id, name (strings); EOOW, TAO and FPL name the brief's roles; the remaining labels are fictional |
| roster | array of objects: id, name, departmentId (strings); qualifications (array of objects: id, validFrom, validUntil strings); availability (array of start/end timestamp objects) |
| resources | array of objects: id (string), capacity (positive number), availability (array of start/end timestamp objects) |
| operationalWindows | array of objects: id (string), interval (start/end timestamp object), prohibitedFamilies and prohibitedResourceIds (arrays of strings). Restrictions apply to any overlapping execution interval |
| policy | object: classification, version, counting, restAppliesTo, recurrence, missingPolicyBehavior, horizonCarryOver (strings); minRestMinutes, maxDutyMinutesPerCalendarDay, maxDutyMinutesPerHorizon (numbers); samePersonMultipleRoles, deadlineEqualityAllowed (booleans) |
| trainingRequirements | array of objects: id, family (strings), intervalDays (positive number), mandatory (boolean) |
| completionHistory | array of objects: requirementId, completedEnd (strings). One applicable latest completion per requirement in these packages |
| fixedDuties | array of objects: id, personId, dutyClass (strings), interval (start/end timestamp object). Includes the prior-Sunday duty for P1 |
| requests | array of drill objects described below |
| candidateOrder | object: requests, starts, persons (strings describing deterministic array order) |
| searchBudget | nonnegative integer number: maximum candidate assignment attempts; zero deliberately permits no attempt |

Each request contains `id`, `departmentId`, `family`, `requirementId`, `occurrenceId`, `preferredStart` (strings), `durationMinutes`, `priority` (numbers), `allowedStartWindows` (array of start/end timestamp objects), `candidateStarts` (timestamp string array), `roles` (array of role objects), `preferredPersonIds` (string array) and `resourceDemands` (array of demand objects). A role has `qualificationId` (string), `count` (number) and `candidatePersonIds` (string array). Every fixture role has count 1, and each role needs a different person. A demand has `resourceId` (string) and `units` (positive number). Preferred people establish original proposals, not irrevocable assignments. Preferred starts are preferences; allowed candidates and constraints govern assignments. All request priorities are 1, so no priority ordering ambiguity is introduced.

Despite its name, `allowedStartWindows` requires the **whole execution interval** to fit within one window. `candidateStarts` is the complete finite set of permitted starts and must also pass these windows. This avoids ambiguity about a last-slot overrun. A generated occurrence cannot be silently dropped because no request exists: regular packages have exactly one linked request per due occurrence. A missing occurrence template/request must be reported explicitly by later software rather than counted covered.

## Time, fatigue and recurrence assumptions

All timestamp values have an explicit fixed `-05:00` offset. The horizon is November 9, 2026 00:00 through November 16 00:00, with the end excluded. This deliberately uses a fixed offset rather than inferring daylight-saving rules. Planning must preserve those instants. Scheduling uses 60-minute slots; all durations are minutes. Policy budget limits need not be multiples of the slot length.

All execution, qualification, availability, resource and operational intervals are half open `[start,end)`. Touching endpoints do not overlap. A qualification expiring exactly at drill finish covers that drill; expiring at its start does not. Resource demands consume capacity for the entire interval. One person cannot cover two roles in the same evolution, even if they hold both qualifications.

The **invented** policy requires at least 60 minutes between every separate training/fixed-duty interval, including a duty ending before the horizon. No duty classes are exempt. Exactly 60 passes; a smaller gap fails. The compact value exists for hand verification and is not operational guidance. Per-person budgets are 240 duty minutes per calendar day and 600 per horizon by default. Count the union of training and fixed duty; invalid overlapping assignments cannot be made valid by double-count handling. Split cross-midnight duty at fixed-offset midnight. Prior history counts on its actual day; only the intersection with the horizon contributes to horizon load. No unseen watchstanding, sleep, travel or other work is assumed.

The prior fixed duty is P1 Sunday November 8 22:00 to 23:00. Thus Monday00:00 gives exactly60 minutes rest. The baseline has no fixed duty inside the horizon, so its horizon duty and training totals match. All unlisted day/person heatmap cells are zero. P6's FPL qualification expires at Monday00:00; P6 remains a well-formed roster entry but cannot fill this week's FPL roles. Roster availability ends at23:00 on each listed day; the final hour is deliberately unavailable.

Fictional recurrence is anchored to the latest supplied completion end, with successive deadlines at integer elapsed-day intervals. It is not reset by proposed assignments. Emit each deadline in `[horizon.start,horizon.end)`; an occurrence must begin at/after the previous deadline (first: last completion) and finish at/before its deadline. Deadline equality passes. A deadline before the horizon would require an explicit overdue report, not silent omission; that condition is not present in these regular records. Deadlines at/after the horizon end are explicitly outside the current horizon.

R-DC completed November6 at12:00, with interval3 days: due November9,12,15 at12:00. The other four requirements completed November2 at12:00, with interval7 days: each due November9 at12:00. There are **7 due occurrences**, including all3 DC occurrences. The next deadlines are November16 at12:00 for the four weekly requirements and November18 at12:00 for DC. These are entirely invented periodicities, never an actual SFTRM register.

Missing mandatory policy values, invalid durations/timestamps/references and reversed windows are invalid input. Existing people who are unavailable, unqualified or expired can make a well-formed package infeasible; they are not malformed references. Hard constraints must never be automatically relaxed.

## Independent expected results

Baseline original proposals put D1 to D5 at Monday08:00. Exact baseline overlap pairs are P1 between D1/D2, P2 between D1/D4 and SIM between D2/D3. D5 also violates OP1, which prohibits flight quarters until10:00. The SIM collision has separate original personnel, so it tests resources independently.

The documented deterministic solution tries requests in array order, each start in candidate array order, and each role's candidate people in array order, with backtracking as needed. It selects the first complete feasible assignment; this is a fixture convention, not a global optimization claim.

| Request | Family | Baseline allocation | Shifted-operations allocation |
|---|---|---|---|
| D1 | Engineering casualty controls | Mon Nov9 08:00 to 09:00, P1+P2 | same |
| D2 | Combat Systems exercises | Mon Nov9 10:00 to 11:00, P1 | Mon Nov9 08:00 to 09:00, P3 |
| D3 | Weapons safety exercises | Mon Nov9 08:00 to 09:00, P3 | Mon Nov9 10:00 to 11:00, P3 |
| D4 | Damage Control drills | Mon Nov9 10:00 to 11:00, P2 | same |
| D5 | Flight quarters | Mon Nov9 10:00 to 11:00, P4+P5 | same |
| D6 | Damage Control drills | Thu Nov12 08:00 to 09:00, P2 | same |
| D7 | Damage Control drills | Sun Nov15 08:00 to 09:00, P2 | same |

The shifted package adds a Monday08:00 to 10:00 weapons prohibition and an additional valid TAO qualification for P3. CS can counteroffer P3 at08:00, release SIM10:00 for Weapons and preserve the Engineering allocation. This is a genuine changed-input case, with expected negotiation evidence documenting why reassignment is needed. Baseline total training loads are P1=120, P2=240, P3=60, P4=60, P5=60, P6=0 minutes. Shifted loads are P1=60 and P3=120 with the others unchanged. Both total **540 person-minutes**, cover7/7 occurrences and have no final collisions. The JSON supplies exact person/day totals, occurrence IDs, deadlines and next-outside-horizon entries.

`expected` fields are strings, numbers, arrays or objects as appropriate: status (string); baselineCollisions (array with kind/id strings and request ID arrays); baselineOperationalViolations (string array); allocations (array of requestId/start strings and personIds string array); trainingMinutesByPerson and dutyMinutesByPersonInHorizon (objects of numeric minutes); personDayMinutes (date-keyed objects of person numeric minutes); totalTrainingPersonMinutes and coveredCount (numbers); occurrences (array of occurrenceId/deadline/requestId strings); unmet (array); nextOutsideHorizon (array of requirementId/deadline strings); negotiationEvidence (array of department/request IDs, proposal, objection, counterproposal, response and disposition). A counterproposal may be a start string or an object containing start/personIds. The tiny-impossible key instead has status/proof strings, candidateCombinations number, unmet string array and empty allocations. These are witness formats, not a later runtime API contract.

Negotiation witnesses identify proposals, real constraint objections, alternatives, responses and dispositions. They describe expected causal evidence; software must compute these from changed inputs. They must not become static agent dialogue that ignores the computed schedule. The shifted witness focuses on its changed CS/Weapons negotiation; unchanged DC/AIR moves still require explanation in later outputs.

## Scenarios and recovery

Each scenario has name/kind strings, an input object and an expectedBehavior string. Input selects a recordId and supplies RFC6902-style `replace`/`remove` mutations under `patches`. Apply mutations **in order to a fresh deep copy of that record's solverInput**, never to its answer key or the frozen source. No network or executable instructions are embedded. An optional actions array describes the review/cancel interaction fixture, not an execution script.

The 20 scenarios cover the ordinary week, changed operations, expired/missing qualifications, unavailable people, exact qualification expiry, prior-week rest, daily/horizon duty budgets, an impossible recurrence deadline, proven tiny infeasibility, zero-budget exhaustion, missing policy, unknown references, bad duration/window and recovery, and simulated review invalidation/cancellation. Each expectedBehavior states observable results and exact relevant limits. The horizon-budget scenario additionally requests an independent239-minute run; the qualification-expiry scenario additionally describes expiry at08:00. Those are separate mutations of fresh input, not cumulative changes after a previous run.

An invalid input must leave the last valid draft intact; restoring the stated value must recover the original feasible package. The impossible-deadline case must enumerate all7 occurrences and specifically identify D7's unmet November15 12:00 deadline, rather than omit the third DC occurrence. The tiny-impossible package contains only D1 and D2, both forced to08:00 with sole person P1: its only joint assignment collides, proving infeasibility by exhaustion of the entire finite domain. Zero search budget on a feasible package instead means **exhausted, zero attempted assignments**, not proof of infeasibility. Count assignment attempts before the first candidate is attempted. Later planning must explicitly retain or reconcile this budget convention before freezing its contracts.

A reviewed draft is only a simulated local review. Editing it invalidates that review. Cancellation must stop or discard generation and keep the previous valid allocations, with no stale result replacing them. These are behavioral fixture expectations; they were not browser tested in this data phase. Simulated review does not authorize operational acceptance, publication, delivery or deployment.

## Data validation performed

Local Python JSON parsing and an independent temporary exhaustive enumeration script checked regular-record field types, unique entity IDs, request references, positive durations/windows, all request-role headcounts, recurrence expansion and occurrence links. It independently checked qualification validity, full execution availability, operational restrictions, resource capacity, distinct role personnel, rest including prior duty, calendar-day/horizon budgets, deadline completion, heatmap arithmetic and the deterministic first witness. It did not call toolkit calculations or application code.

Baseline has128 joint candidate assignments and **8 feasible complete assignments**; shifted operations has256 and **12 feasible complete assignments**; tiny-impossible has1 and **0 feasible assignments**. The first feasible assignment in each record matches its independent key. Both feasible records have exactly7 due linked occurrences and540 training person-minutes. Computational edge scenarios were separately enumerated and matched their feasibility expectations: expired/unavailable/missing-qualified people, sub-limit rest,119-minute daily budget and impossible deadline each yield0 solutions; exact rest gives16, exact120-minute daily budget8, exact240-minute horizon budget8, and qualification expiry at finish4. The239-minute horizon variant follows directly from P2's mandatory240-minute demand. Invalid-input scenarios deliberately violate input rules; exhaustion and review/cancel are downstream behavioral checks rather than claims of application verification.

The host must independently validate and freeze both files before research. These preparation checks do not certify an application, owner approval, real data accuracy, actual SFTRM compliance or operational usefulness. No requirements, scope, supplied inputs or .fleet files were modified.

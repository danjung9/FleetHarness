---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Synthetic answer key for the plan's four-request training draft, with exact schedule, negative cases and limits."
---

# ID 11: synthetic training board answer key

## Bottom line

[R] A training coordinator should be able to see which proposed classes compete for the same Sailor and whether an allowed alternative fits. This entirely synthetic example has one valid complete schedule: move request B to 0930 on day one and retain all four requests. [R] This is the same limited contract proposed in [[Research/Plan/Plan]], made ready for an independent checker. [E] The expected answers below were derived from the supplied constraints, not observed in a generated app. [R] Passing proves only this supplied-constraint draft, not full PB4T or SFTRM compliance.

## Published need and coverage

[P] The captured ID 11 text asks for departmental agents negotiating a training calendar against operating windows, qualified personnel and fatigue constraints, detecting personnel collisions, proposing alternatives and meeting SFTRM periodicities. It supplies no actual roster, fatigue values, recurrence rules or example output.

| Published need [P] | What this synthetic example checks [R] | Limit |
| --- | --- | --- |
| Detect personnel collisions and propose alternatives | A and B compete for P01; B has an allowed later start | No claim of optimality or personnel reassignment |
| Operating windows, qualified roster, fatigue | Explicit windows, invented qualifications, rest gap and minutes limit | All values are invented test rules, not Navy policy |
| Departmental agents negotiating | No coverage | Four supplied requests do not prove departmental agents or negotiation |
| SFTRM periodicities | No coverage | No authoritative recurrence input was supplied; do not infer a compliant weekly cycle |

[E] At `50fcaea`, `harness/tools/scheduling.ts` searches explicit candidate starts, uses qualification coverage by the assigned group and applies the minutes limit across the entire supplied horizon. It does not infer recurrence. [R] Room collisions are an additional shared-resource check supported by the plan and helper, not a separately specified published ID 11 requirement.

[R] Coordination: this input maps to the S family of [[Research/QA/Test-Plan]], historically S-O/S-S/S-W at `50fcaea`. The final relay reports one unified UI at `631849f`, so those navigation routes need updating as recorded in [[Research/QA/Officer/README]]. The domain helper is unchanged. The main plan's two-request S1 remains a separate smoke fixture with multiple valid answers. Do not mix their expected schedules or count repeated constraint boundaries as new coverage. Shared execution gates stay in the main plan.

## Synthetic officer situation and rules

[A, synthetic fixture] A training coordinator is arranging four administrative practice sessions across two fictional days. P01 and P02 are invented Sailor identifiers. Q-A and Q-B are invented qualifications. Room-1 and Room-2 are invented rooms. There is no ship or unit in this example, and no real schedule, training policy or person is represented.

[R, synthetic contract] Day one minute 0 means 0800; minute 240 means 1200. Day two minute 1440 means 0800; minute 1680 means 1200. Use this invented clock with no date or timezone conversion. A session occupying `[start,end)` releases its room at `end`; required rest still applies to the person. No request may be dropped, shortened, reassigned, moved outside its candidate starts or given a different qualification to make a result fit.

| Synthetic person | Qualification | Availability on each fictional day | Maximum across BOTH days | Rest between sessions |
| --- | --- | --- | --- | --- |
| P01 | Q-A | 0800 to 1200 | 120 minutes | 30 minutes |
| P02 | Q-B | 0800 to 1200 | 120 minutes | 0 minutes |

| Synthetic request | Recognizable practice activity | Duration | Permitted start minutes | Assigned person | Room | Required qualification |
| --- | --- | --- | --- | --- | --- | --- |
| A | Training-record entry practice | 60 minutes | 0 | P01 | Room-1 | Q-A |
| B | Training-record review practice | 60 minutes | 0, 90 | P01 | Room-1 | Q-A |
| C | Classroom setup checklist practice | 60 minutes | 0 | P02 | Room-2 | Q-B |
| D | Classroom closeout checklist practice | 60 minutes | 1440 | P02 | Room-2 | Q-B |

[R] The following is the exact synthetic input for a technical checker. Activity labels above are explanatory and are not additional constraints. The app may provide ordinary form fields for these same values.

```json
{
  "windows": [{"start":0,"end":240},{"start":1440,"end":1680}],
  "people": [
    {"id":"P01","qualifications":["Q-A"],"windows":[{"start":0,"end":240},{"start":1440,"end":1680}],"maxMinutes":120,"restMinutes":30},
    {"id":"P02","qualifications":["Q-B"],"windows":[{"start":0,"end":240},{"start":1440,"end":1680}],"maxMinutes":120,"restMinutes":0}
  ],
  "requests": [
    {"id":"A","duration":60,"starts":[0],"people":["P01"],"resources":["Room-1"],"qualifications":["Q-A"]},
    {"id":"B","duration":60,"starts":[0,90],"people":["P01"],"resources":["Room-1"],"qualifications":["Q-A"]},
    {"id":"C","duration":60,"starts":[0],"people":["P02"],"resources":["Room-2"],"qualifications":["Q-B"]},
    {"id":"D","duration":60,"starts":[1440],"people":["P02"],"resources":["Room-2"],"qualifications":["Q-B"]}
  ],
  "maxNodes":50000
}
```

## 11-G01: exact base answer

[R] Load the four requests and check the draft. The result must be feasible and contain exactly these four assignments, once each. Table order is for readability; compare assignments by request ID.

| Request | Day and displayed time | Start minute | End minute | Person | Room |
| --- | --- | --- | --- | --- | --- |
| A | Day one, 0800 to 0900 | 0 | 60 | P01 | Room-1 |
| B | Day one, 0930 to 1030 | 90 | 150 | P01 | Room-1 |
| C | Day one, 0800 to 0900 | 0 | 60 | P02 | Room-2 |
| D | Day two, 0800 to 0900 | 1440 | 1500 | P02 | Room-2 |

[R] Required structured result, if the app exposes the helper-shaped output. Other diagnostic fields may vary; they cannot change these values.

```json
{
  "status":"feasible",
  "assignments":[
    {"id":"A","start":0,"end":60,"people":["P01"],"resources":["Room-1"]},
    {"id":"C","start":0,"end":60,"people":["P02"],"resources":["Room-2"]},
    {"id":"B","start":90,"end":150,"people":["P01"],"resources":["Room-1"]},
    {"id":"D","start":1440,"end":1500,"people":["P02"],"resources":["Room-2"]}
  ]
}
```

[R] The personnel load must show P01 = 120 minutes and P02 = 120 minutes across both days. P01's rest gap is exactly 30 minutes. P02 has 60 minutes on each day. All four sessions are inside both the person's and the operating windows. The result is a synthetic draft awaiting human review, never an issued schedule.

[E, independent arithmetic] A, C and D each have one possible start. B at 0 overlaps A for the same person and room; B at 90 starts 30 minutes after A ends. Each person has two 60-minute sessions, so each uses exactly 120 minutes. These facts establish the unique complete answer without consulting a solver verdict.

## Changed inputs and exact expected outcomes

[R] Reset to 11-G01 before each row. Change only the listed fields. For an infeasible result, the accepted assignment list is empty, all original requests remain editable, and the message must identify the stated conflict in plain language. An attempted or partial allocation may be shown only if clearly separated from an accepted complete result. For invalid input, show the input error and do not claim infeasibility or feasibility. These are the plan's acceptance cases, not a replacement QA plan.

| Case | Exact synthetic edit | Required answer |
| --- | --- | --- |
| 11-G02, fresh edit | A.starts = [30]; B.starts = [0,90,120] | Feasible: A = 30 to 90, B = 120 to 180, C = 0 to 60, D = 1440 to 1500. P01 still totals 120 minutes and rests 30. |
| 11-G03, no alternative | B.starts = [0] | Infeasible: A and B compete for P01 and Room-1 at 0 to 60. Neither may disappear. |
| 11-G04, rest short | B.starts = [60] | Infeasible: P01 would have 0 minutes of rest instead of 30. Room availability alone does not make it valid. |
| 11-G05, rest boundary | B.starts = [90] | Feasible, exactly the 11-G01 assignments. |
| 11-G06, minutes boundary | P01.maxMinutes = 119 | Infeasible: P01 needs 120 minutes across the horizon, 1 more than allowed. |
| 11-G07, missing qualification | P01.qualifications = [] | Infeasible: assigned person for A and B lacks Q-A. Do not invent a qualified substitute. |
| 11-G08, duplicate ID | Set D.id = "C" | Invalid input: duplicate request identifier C. Do not merge, overwrite or silently renumber the requests. |
| 11-G09, malformed start | B.starts = ["0900"] | Invalid input: start is text rather than an integer minute. Do not silently interpret it as 900 or 90. |
| 11-G10, helper search limit | maxNodes = 1 | For the bounded helper: budget_exhausted, no accepted assignments, limit reached visibly different from proven infeasibility. A different solver must document an equivalent deliberately interrupted check before claiming this case. |
| 11-G11, unavailable person | P02.windows = [{"start":0,"end":240}] | Infeasible: D's assigned person is unavailable on day two. Having an operating window is insufficient. |
| 11-G12, operating boundary | Replace only the second operating window with {"start":1440,"end":1499} | Infeasible: D ends at 1500, one minute beyond the operating window. Restore end = 1500 and all four assignments are feasible. |

## Prove the checker can reject an attractive wrong answer

[R] Before using the key to accept an app, give the checker these intentionally wrong synthetic results. This is a check of the evaluator, not evidence the app failed.

| Deliberately wrong result | Exact rejection reason |
| --- | --- |
| Base answer with B changed to 0 to 60 | B collides with A for P01 and Room-1 |
| Base answer with B changed to 60 to 120 | B is not an allowed base start and P01 lacks the 30-minute rest gap |
| Base answer with D removed | Mandatory request D is missing; there are only 3 assignments |
| Base answer labeled "SFTRM compliant" | No SFTRM rules were supplied or tested |

[R] For the plan's conflict-checker fallback, the person enters the proposed times instead of asking the app to choose them. Use the same numeric checks, require rejection of the bad drafts, and label the result a conflict checker. Do not give it credit for generating alternatives it did not generate.

## Human review and what remains thin

[R] Apply the shared review, edit-invalidation, save/reopen, offline and final-artifact checks in [[Research/QA/Test-Plan]], using the submission contract in [[Research/Plan/Plan]] and the mapping in [[Research/QA/Officer/README]]. The officer must be able to inspect all four requests and both personnel totals before reviewing this draft. A failed constraint goes back to the training coordinator for a supplied-input correction; the app may not relax it on its own. Stop or cancel ends the draft check; nothing updates an official calendar or contacts a person.

[A] The published text does not establish whether every participant must carry every qualification, whether one qualified person covers a group, which fatigue policy applies, how competing priorities are ranked, or which training recurrences must be satisfied. This fixture chooses the helper's group-coverage semantics with only one person per session, so it does not settle the multi-person qualification question. A full challenge acceptance requires owner-supplied answers and additional tests. Actual application behavior, shutdown, persistence and review state remain NOT RUN here.

## Sources

- [P] https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11. Read the existing capture's ID 11 description and requirements in `Sources/raw/events_norfolk_combined.json`; no live portal recheck.
- [P] [[UseCases/11-pb4t-planning-board-for-training-autonomous-deconfliction-ag]].
- [E] [[Research/Plan/Plan]], exact use-case slice and independent cases; [[Research/Plan/Test-Results]], earlier test evidence only.
- [E] https://github.com/danjung9/FleetHarness/blob/50fcaea1e86028503ae66bd2f17287093ad30cbe/harness/tools/scheduling.ts. Read locally with `git show`; no repository code executed.
- [E] https://github.com/danjung9/FleetHarness/blob/50fcaea1e86028503ae66bd2f17287093ad30cbe/harness/recipes.ts. Scheduling acceptance and limitations read locally.

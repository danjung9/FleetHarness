---
name: fleet-scheduling
description: Build and evaluate training or resource scheduling workflows with explicit hard constraints, feasibility evidence, and operator-reviewed allocations.
---

# Constraint-based scheduling

Separate departmental proposals from constraint enforcement. Treat operational windows, personnel qualifications, availability, rest and duty budgets as explicit inputs. Use fatigue and training-periodicity rules from the owner when supplied. Otherwise build the scheduling with clearly labeled sample rules the person can edit, and never present them as SFTRM requirements.

`fleet_solve_schedule` accepts minutes relative to one declared epoch, a roster, and requests with explicit candidate starts. `people` assigns exact people; each required qualification must be held by at least one assigned person. Resources have exclusive capacity. `maxMinutes` is a budget across the entire supplied horizon, not a daily policy. Rest applies between every pair of assignments for a person. Back-to-back windows are permitted only when the supplied rest is zero.

The result is feasibility over the supplied candidates, not global optimization or automatic personnel selection. `budget_exhausted` is not proof of infeasibility. Diagnostic conflicts are observations from search, not a minimal unsatisfiable core. Do not silently relax constraints to get a green schedule.

Expand recurrence into explicit occurrence IDs with due windows and test that every mandated occurrence is present. A single feasible set of drills does not satisfy weekly periodicity. For large instances or soft objectives, evaluate OR-Tools CP-SAT with version, license and benchmark evidence.

Build an editable board, conflict explanations and personnel loading. Independently check every returned interval pair and total duty allocation. Test impossible requests, alternate allocations, unavailable people, missing qualifications, minimum-rest boundaries and exhausted search. Human acceptance remains separate from solver feasibility.

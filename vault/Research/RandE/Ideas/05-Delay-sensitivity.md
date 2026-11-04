---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Kill for this sprint: show which specific synthetic delays break a draft."
---

# How much delay can this draft tolerate?

## Bottom line

[R] Beside a feasible draft, show the outcome of a few declared synthetic delay scenarios. [R] Separate whether the current placements remain valid from whether a replacement draft can be found. [A] A coordinator may prefer a less brittle draft even when both initially pass.

- **Moment [R]:** Test one invented event running 0, 15 and 30 minutes longer. Keep all other supplied limits unchanged and explain the tested consequence.
- **Novel increment [E/A]:** Existing readiness ideas discuss dependency slack. This applies explicit perturbations to the small training draft and distinguishes fixed-draft failure from replanning success.
- **Judge evidence [R]:** Independently check each scenario, including a delay that breaks one draft but permits another. Show tested cases, never a generalized reliability percentage.
- **Size [A]:** 4 to 8 person-hours for scenario handling, repeated checks and understandable comparison.
- **Verdict [R]:** Kill for Thursday. The scenarios are arbitrary and could imply unsupported safety assurance. Reconsider only after a user selects meaningful perturbations and the basic schedule is accepted. Search exhaustion stays unknown, not infeasible.

## Sources

- [E] Closest overlap: [[Research/UseCase-Map/Top-Candidates]], readiness slack; [[Research/Plan/Findings]], scheduling limits and unknown search outcomes.

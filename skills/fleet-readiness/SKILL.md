---
name: fleet-readiness
description: Build explainable readiness or restoration prototypes from reviewed dependency models, source snapshots, deadlines and explicit missing information.
---

# Dependency and margin analysis

Reconcile asset identity and source freshness before calculating. Keep alias matches uncertain unless supported by stable identifiers. Preserve conflicting status records with their sources.

`fleet_analyze_dependencies` calculates a supplied directed acyclic graph. Each node has dependencies, an earliest availability, a duration and a source. Times share one declared unit and epoch. Unknown duration is `null`, never zero. Target finish is the latest prerequisite finish or its own availability, plus its duration; margin is deadline minus finish.

A path with unknown durations is only a lower-bound path. Do not label it a proven critical path. The tool does not model shared personnel, parts competition, probabilistic reliability or mission capability. Add those constraints with explicit, independently validated models when needed.

Test a known controlling branch, ties, delayed availability, negative margin, missing estimates, dangling references and cycles. For the readiness scenario, compare the result after each synthetic change to an SME-reviewed baseline. Separate upstream slack from target margin. Present bounded, human-reviewed considerations rather than automating operational decisions.

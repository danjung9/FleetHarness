---
type: use-case
status: active
owner: mukul
updated: 2026-11-04
summary: "A multi-agent scheduler that deconflicts the weekly shipboard training calendar against crew availability."
use_case_id: 11
---

# PB4T (Planning Board for Training) Autonomous Deconfliction Agent

| Field | Value |
| --- | --- |
| Portal ID | 11 |
| Category | [[UseCases/Categories#The Autonomous Shipboard Enterprise|The Autonomous Shipboard Enterprise]] |
| Difficulty | medium |
| Teams using it at capture | 1 |

Summarized in our own words from the portal [P]. Full submitted text: the Use Cases tab on the portal, or `Sources/raw/events_norfolk_combined.json`.

## Problem

Weekly training planning meetings struggle to fit competing drills around personnel and ship operations, causing double-booking.

## What to build

Departmental agents negotiating schedules under shared constraints and detecting collisions, proposing alternatives and meeting training periodicity.

## Requirements

- Departmental agents (Engineering, Weapons, Combat Systems)
- Constraints: operating windows, qualified rosters, fatigue policy
- Detect personnel collisions
- Propose alternate schedules
- Satisfy SFTRM periodicities

## Named systems

- PB4T
- SFTRM

## Resources

None listed.

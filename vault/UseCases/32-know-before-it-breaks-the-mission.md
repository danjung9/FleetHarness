---
type: use-case
status: active
owner: mukul
updated: 2026-11-04
summary: "A read-only tool showing which mission capabilities are at risk from changing readiness data, why, and what to do first."
use_case_id: 32
---

# Know Before It Breaks the Mission

| Field | Value |
| --- | --- |
| Portal ID | 32 |
| Category | [[UseCases/Categories#Fleet Readiness & Restore-to-Mission|Fleet Readiness & Restore-to-Mission]] |
| Difficulty | medium |
| Teams using it at capture | 1 |

Summarized in our own words from the portal [P]. Full submitted text: the Use Cases tab on the portal, or `Sources/raw/events_norfolk_combined.json`.

## Problem

Leaders rebuild status from many reports and systems and cannot easily tell when a minor change will become a mission problem next week.

## What to build

A synthetic-data tool for a destroyer 21 days from a mission that shows at-risk capabilities, explains each flag with sources, and recommends first actions.

## Requirements

- Read-only, no write-back to source systems
- Each risk explains itself and traces to records
- Humans decide
- Works on last-synced synthetic data
- Runs offline and syncs on reconnect

## Named systems

- 8 O'Clock and 1200 reports
- Task Force Hopper

## Resources

- Synthetic ship status dataset
- Mission-to-equipment dependency table
- Optional synthetic condition data
- Department head and XO SMEs

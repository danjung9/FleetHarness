---
type: use-case
status: active
owner: mukul
updated: 2026-11-04
summary: "A parser that extracts times from formatted OPTASK messages and plots them on one timeline."
use_case_id: 12
---

# Electronic OPTASK (Operational Tasking) Message Parser & Timeline Visualizer

| Field | Value |
| --- | --- |
| Portal ID | 12 |
| Category | [[UseCases/Categories#Tactical Decision Advantage|Tactical Decision Advantage]] |
| Difficulty | medium |
| Teams using it at capture | 1 |

Summarized in our own words from the portal [P]. Full submitted text: the Use Cases tab on the portal, or `Sources/raw/events_norfolk_combined.json`.

## Problem

Watchstanders must read hundreds of lines of dense message text to learn when their ship has events.

## What to build

A tool that reads raw USMTF text, pulls frequency plans, crypto changeover windows and flight quarters times, and shows a consolidated timeline.

## Requirements

- Parse raw USMTF text
- Extract frequency plans
- Extract crypto changeover windows
- Extract flight quarters times
- Consolidated visual timeline

## Named systems

- USMTF
- OPTASK

## Resources

None listed.

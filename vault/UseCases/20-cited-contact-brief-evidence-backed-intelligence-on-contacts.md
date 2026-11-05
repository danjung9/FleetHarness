---
type: use-case
status: active
owner: mukul
updated: 2026-11-04
summary: "An agent that turns a vessel identifier into a one-page brief with every claim linked to a timestamped primary source."
use_case_id: 20
---

# Cited Contact Brief: Evidence-Backed Intelligence on Contacts of Interest

| Field | Value |
| --- | --- |
| Portal ID | 20 |
| Category | [[UseCases/Categories#Tactical Decision Advantage|Tactical Decision Advantage]] |
| Difficulty | medium |
| Teams using it at capture | 1 |

Summarized in our own words from the portal [P]. Full submitted text: the Use Cases tab on the portal, or `Sources/raw/events_norfolk_combined.json`.

## Problem

Watchstanders spend hours checking scattered registries and sanctions lists, and commercial AI cannot cite verifiable evidence.

## What to build

A research agent that accepts a name, IMO or MMSI and returns a cited brief that says UNKNOWN rather than guessing.

## Requirements

- Ingest open feeds: AIS, IMO registries, OFAC/EU sanctions
- Every claim linked to a captured source snapshot
- Unresolved items marked Unknown

## Named systems

- AIS
- IMO
- MMSI
- OFAC

## Resources

None listed.

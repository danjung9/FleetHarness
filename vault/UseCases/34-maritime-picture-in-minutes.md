---
type: use-case
status: active
owner: mukul
updated: 2026-11-04
summary: "A tool that merges public and synthetic maritime reports into a source-cited shift-change brief of what changed."
use_case_id: 34
---

# Maritime Picture in Minutes

| Field | Value |
| --- | --- |
| Portal ID | 34 |
| Category | [[UseCases/Categories#Tactical Decision Advantage|Tactical Decision Advantage]] |
| Difficulty | medium |
| Teams using it at capture | 0 |

Summarized in our own words from the portal [P]. Full submitted text: the Use Cases tab on the portal, or `Sources/raw/events_norfolk_combined.json`.

## Problem

Watch teams spend much of a shift sifting and correlating reports, tracks and open sources, losing references and timestamps along the way.

## What to build

A system that ingests 24 hours of public AIS, synthetic unit reports and open-source items and produces a brief highlighting seeded anomalies with provenance.

## Requirements

- Unclassified public AIS and synthetic reports only
- Analyst verifies before briefing
- Provenance on every claim
- Low-bandwidth and edge capable
- Runs offline, cites sources, keeps humans in authority

## Named systems

- AIS

## Resources

- Historical public AIS extract (NOAA / BOEM MarineCadastre)
- Synthetic reports with answer key
- Watchfloor brief template
- Watch officer and intelligence SMEs

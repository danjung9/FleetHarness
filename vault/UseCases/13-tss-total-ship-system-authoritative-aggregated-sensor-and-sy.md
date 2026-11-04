---
type: use-case
status: active
owner: mukul
updated: 2026-11-04
summary: "TSS: a passive, access-controlled ship-wide database and portal correlating sensor and maintenance system data into one authoritative view."
use_case_id: 13
---

# TSS (Total Ship System) Authoritative  aggregated sensor and system information platform for real time decision making

| Field | Value |
| --- | --- |
| Portal ID | 13 |
| Category | [[UseCases/Categories#Tactical Decision Advantage|Tactical Decision Advantage]] |
| Difficulty | Not set |
| Teams using it at capture | 0 |

Summarized in our own words from the portal [P]. Full submitted text: the Use Cases tab on the portal, or `Sources/raw/events_norfolk_combined.json`.

## Problem

Ship equipment status is scattered across separate systems with changing identifiers and no common truth, so proving readiness takes heavy inspection effort.

## What to build

A tool with its own database that only receives data, offers customizable dashboards and item pages, uses CAC and Active Directory, and applies machine learning to spot baseline deviations.

## Requirements

- Own database correlating attributes across systems
- Passive, never writes back
- Dedicated portal with dashboards
- CAC/token access with Active Directory
- ML for deviations from baseline

## Named systems

- Sked32
- OMMS-NG
- AWN
- R-Supply
- DRRS-N
- NSN
- APL
- Active Directory

## Resources

None listed.

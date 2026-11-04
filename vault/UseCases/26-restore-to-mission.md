---
type: use-case
status: active
owner: mukul
updated: 2026-11-04
summary: "A disconnected-capable tool to speed a casualty from fault isolation to an approved restoration plan with parts and reports."
use_case_id: 26
---

# Restore to Mission

| Field | Value |
| --- | --- |
| Portal ID | 26 |
| Category | [[UseCases/Categories#Fleet Readiness & Restore-to-Mission|Fleet Readiness & Restore-to-Mission]] |
| Difficulty | medium |
| Teams using it at capture | 2 |

Summarized in our own words from the portal [P]. Full submitted text: the Use Cases tab on the portal, or `Sources/raw/events_norfolk_combined.json`.

## Problem

After an underway failure, sailors search manuals, logs and systems to isolate faults, find parts, assess impact and prepare reports.

## What to build

A solution with a fault isolation track for a diesel generator low lube oil case and a parts and repair track producing draft reports for chain-of-command review.

## Requirements

- Operate offline on last-synced data
- Queue outbound requests
- Laptop or shipboard server hardware
- Read-only links to systems of record
- Cite sources, human approval for every release
- Unclassified synthetic data only

## Named systems

- SSDG
- EMCON

## Resources

- Synthetic casualty dataset and reports
- Notional inventory and ships-in-company list
- Surrogate manuals
- Maintenance history and equipment logs
- Repair-approval workflow description
- Fleet SMEs

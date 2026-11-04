---
type: use-case
status: active
owner: mukul
updated: 2026-11-04
summary: "One tool to draft, route, comment on, revise and release CASREPs with role-based access and audit history."
use_case_id: 8
---

# CASREP Command: Unified Casualty Report Drafting, Routing & Release

| Field | Value |
| --- | --- |
| Portal ID | 8 |
| Category | [[UseCases/Categories#The Autonomous Shipboard Enterprise|The Autonomous Shipboard Enterprise]] |
| Difficulty | medium |
| Teams using it at capture | 1 |

Summarized in our own words from the portal [P]. Full submitted text: the Use Cases tab on the portal, or `Sources/raw/events_norfolk_combined.json`.

## Problem

CASREPs move through separate tools, email and paper markups with no single view of status, slowing reporting and burdening the originator.

## What to build

A role-based CASREP application enforcing NWP 1-03.1 formats, tracking versions and approvals, and showing routing status, using notional data.

## Requirements

- Roles from originator through CO
- Comment, return or approve and forward
- NWP 1-03.1 formats and report types
- Version history and audit trail
- Routing status at a glance
- Unclassified notional data

## Named systems

- CASREP
- NWP 1-03.1
- 3-M
- JSN

## Resources

- NWP 1-03.1
- OPNAVINST 4790.4
- Mock CASREPs and notional chain of command

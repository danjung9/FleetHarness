---
type: use-case
status: active
owner: mukul
updated: 2026-11-04
summary: "An offline, source-cited assistant that helps watchstanders respond to engineering casualties and judge conflicting navigation sources."
use_case_id: 33
---

# Trusted Watchstander

| Field | Value |
| --- | --- |
| Portal ID | 33 |
| Category | [[UseCases/Categories#Tactical Decision Advantage|Tactical Decision Advantage]] |
| Difficulty | medium |
| Teams using it at capture | 0 |

Summarized in our own words from the portal [P]. Full submitted text: the Use Cases tab on the portal, or `Sources/raw/events_norfolk_combined.json`.

## Problem

Watchstanders cross-reference procedures, alarms, tag-outs and logs across binders and displays under time pressure, and AI is only fieldable if grounded and auditable.

## What to build

An edge assistant that takes a spoken or typed symptom and returns ranked, cited actions with affected equipment and tag-outs, plus a navigation variant showing which sources to trust.

## Requirements

- Fully offline on edge hardware
- Grounded only in loaded procedures
- Actions signed, policy-checked and logged
- Human authority, no equipment control
- Unclassified surrogate procedures only

## Named systems

None listed.

## Resources

- Surrogate casualty procedures
- Simulated alarm and log stream and tag-out list
- Synthetic navigation readings
- Engineering watch officer and navigator SMEs

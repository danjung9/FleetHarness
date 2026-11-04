---
type: use-case
status: active
owner: mukul
updated: 2026-11-04
summary: "An offline engineering casualty copilot that returns ranked, cited procedure steps under 5 seconds with signed, auditable actions."
use_case_id: 21
---

# Trusted Watchstander Copilot for Engineering Plant Casualties

| Field | Value |
| --- | --- |
| Portal ID | 21 |
| Category | [[UseCases/Categories#The Autonomous Shipboard Enterprise|The Autonomous Shipboard Enterprise]] |
| Difficulty | medium |
| Teams using it at capture | 1 |

Summarized in our own words from the portal [P]. Full submitted text: the Use Cases tab on the portal, or `Sources/raw/events_norfolk_combined.json`.

## Problem

EOOW and EDO watchstanders face cognitive overload during casualties, and engineering AI is distrusted over inaccurate recommendations.

## What to build

A local copilot taking spoken or typed symptoms, with a cryptographic identity layer, tamper-evident logging and a policy engine that blocks unsafe steps.

## Requirements

- 100 percent offline on laptop or edge hardware
- Grounded only in unclassified EOSS/EOCC doctrine
- Signed recommendations and immutable audit trail
- Policy engine rejects out-of-sequence steps

## Named systems

- EOCC
- EOSS

## Resources

None listed.

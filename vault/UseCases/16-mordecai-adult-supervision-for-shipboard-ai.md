---
type: use-case
status: active
owner: mukul
updated: 2026-11-04
summary: "MORDECAI: a governance layer that arbitrates among multiple shipboard AI agents using a shared protocol and human override."
use_case_id: 16
---

# MORDECAI: "Adult Supervision" for Shipboard AI

| Field | Value |
| --- | --- |
| Portal ID | 16 |
| Category | [[UseCases/Categories#Tactical Decision Advantage|Tactical Decision Advantage]] |
| Difficulty | Not set |
| Teams using it at capture | 0 |

Summarized in our own words from the portal [P]. Full submitted text: the Use Cases tab on the portal, or `Sources/raw/events_norfolk_combined.json`.

## Problem

Many independently built shipboard AI systems share resources with no defined authority between them, so conflicting orders can go unnoticed.

## What to build

A protocol layer where agents declare manifests and intents, contested resources are leased, rank resolves conflicts, unresolved cases escalate to the operator, and one control can pause anything; demoed with live onboarding, condition change and field promotion.

## Requirements

- Agent manifest with heartbeat, intent, action reporting and halt hook
- Intents on a shared bus before execution
- Resource leases and policy as data
- Rank-based conflict resolution by ship condition
- Escalation to operator with context
- Single override

## Named systems

None listed.

## Resources

None listed.
